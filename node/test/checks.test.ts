import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkSignatures, git, mergeBase, parseCheckOptions, runCheck, runChecks } from '../src/checks.ts';
import { runnerCommand, runRunners, snapshot } from '../src/reviewdog.ts';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'bart-checks-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = join(root, 'repo');
  await mkdir(repo);
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.name', 'Test']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  git(repo, ['config', 'commit.gpgsign', 'false']);
  await writeFile(join(repo, 'sample.ts'), '// base\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'base']);
  git(repo, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  return { root, repo };
}

test('signature checks cover every branch commit, with warnings during development', async t => {
  const { repo } = await fixture(t);
  git(repo, ['commit', '--allow-empty', '-qm', 'first unsigned']);
  git(repo, ['commit', '--allow-empty', '-qm', 'second unsigned']);
  const output: string[] = [];
  assert.equal(checkSignatures(repo, 'origin/main', false, s => output.push(s)), 0);
  assert.equal(output.filter(s => s.startsWith('WARNING')).length, 2);
  assert.equal(checkSignatures(repo, 'origin/main', true, () => {}), 1);
  assert.throws(() => checkSignatures(repo, 'missing', false), /failed/);
});

test('trusted SSH signatures pass, missing trust and invalid signatures fail', async t => {
  const { root, repo } = await fixture(t);
  const key = join(root, 'key');
  execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', key]);
  const allowed = join(root, 'allowed-signers');
  await writeFile(allowed, `test@example.com ${await readFile(`${key}.pub`, 'utf8')}`);
  git(repo, ['config', 'gpg.format', 'ssh']);
  git(repo, ['config', 'gpg.ssh.program', 'ssh-keygen']);
  git(repo, ['config', 'user.signingkey', key]);
  git(repo, ['config', 'gpg.ssh.allowedSignersFile', allowed]);
  git(repo, ['commit', '-S', '--allow-empty', '-qm', 'signed']);
  assert.equal(checkSignatures(repo, 'origin/main', true, () => {}), 0);
  await writeFile(allowed, '');
  assert.equal(checkSignatures(repo, 'origin/main', true, () => {}), 1);
  await writeFile(allowed, `test@example.com ${await readFile(`${key}.pub`, 'utf8')}`);
  const raw = git(repo, ['cat-file', 'commit', 'HEAD']).replace('\nsigned', '\ntampered');
  const bad = execFileSync('git', ['-C', repo, 'hash-object', '-t', 'commit', '-w', '--stdin'], { input: raw, encoding: 'utf8' }).trim();
  git(repo, ['update-ref', 'HEAD', bad]);
  assert.equal(checkSignatures(repo, 'origin/main', true, () => {}), 1);
});

test('aggregate checks preserve failures and run signatures in the selected mode', async () => {
  for (const command of ['check-all', 'pr-ready'] as const) {
    for (const failedStep of [0, 1, 2, 3, -1]) {
      const calls: string[] = [];
      const result = await runChecks(command, { base: 'origin/main', full: false }, {
        root: '/unused',
        run: (_cmd, args) => { calls.push(args.at(-1)!); return calls.length - 1 === failedStep ? 1 : 0; },
        signatures: (_root, _base, strict) => { assert.equal(strict, command === 'pr-ready'); calls.push('signatures'); return failedStep === 2 ? 1 : 0; },
        scan: async () => { calls.push('scan'); return failedStep === 3 ? 1 : 0; },
      });
      assert.deepEqual(calls, ['check', 'lint:lockfile', 'signatures', 'scan']);
      assert.equal(result, failedStep === -1 ? 0 : 1);
    }
  }
  assert.equal(runCheck(process.execPath, ['-e', 'process.exit(7)']), 7);
  assert.equal(runCheck('/no/such/bart-test-command', []), 1);
});

test('check options reject unknown arguments and full mode outside reviewdog', () => {
  assert.deepEqual(parseCheckOptions(['--base', 'other', '--full'], 'check-reviewdog'), { base: 'other', full: true });
  assert.throws(() => parseCheckOptions(['--base'], 'check-all'));
  assert.throws(() => parseCheckOptions(['--full'], 'pr-ready'));
});

test('snapshot includes dirty, staged and new files, excludes ignored files, and preserves deletions', async t => {
  const { root, repo } = await fixture(t);
  await writeFile(join(repo, '.gitignore'), 'ignored\n');
  await writeFile(join(repo, 'removed'), 'old');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'tracked files']);
  git(repo, ['rm', 'removed']);
  await writeFile(join(repo, 'sample.ts'), '// dirty\n');
  await writeFile(join(repo, 'new.ts'), '// new\n');
  await writeFile(join(repo, 'staged.ts'), '// staged\n');
  git(repo, ['add', 'staged.ts']);
  await writeFile(join(repo, 'ignored'), 'local data');
  const before = git(repo, ['status', '--porcelain']);
  const target = join(root, 'snapshot');
  await snapshot(repo, target);
  assert.equal(await readFile(join(target, 'sample.ts'), 'utf8'), '// dirty\n');
  assert.equal(await readFile(join(target, 'new.ts'), 'utf8'), '// new\n');
  assert.equal(await readFile(join(target, 'staged.ts'), 'utf8'), '// staged\n');
  await assert.rejects(readFile(join(target, 'removed')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(target, 'ignored')), { code: 'ENOENT' });
  assert.equal(git(repo, ['status', '--porcelain']), before);
});

test('scanner failures survive pipelines and filtered findings; clean runs alone pass', async t => {
  const { root, repo } = await fixture(t);
  const assets = join(root, 'assets');
  await mkdir(join(assets, 'reviewdog'), { recursive: true });
  const bin = join(root, 'bin');
  await mkdir(bin);
  // Execute the generated runner commands, while simulating reviewdog discarding
  // diagnostics and returning success after a failed scanner.
  await writeFile(join(bin, 'reviewdog'), `#!${process.execPath}\nconst fs = require('node:fs');\nconst cp = require('node:child_process');\nconst config = JSON.parse(fs.readFileSync(process.argv.find(x => x.startsWith('-conf=')).slice(6)));\nconst name = process.argv.find(x => x.startsWith('-runners=')).slice(9);\nconst r = cp.spawnSync('bash', ['-c', config.runner[name].cmd], {encoding:'utf8'});\nif (!process.env.FILTER_FINDINGS) process.stdout.write(r.stdout || '');\n`);
  await chmod(join(bin, 'reviewdog'), 0o755);
  const base = mergeBase(repo, 'origin/main');
  for (const full of [false, true]) {
    for (const [command, expected] of [['true', 0], ['exit 7 | cat', 1], ["printf 'sample.ts:1: finding\\n'", 1]]) {
      await writeFile(join(assets, 'reviewdog/reviewdog.yml'), JSON.stringify({ runner: {
        opengrep: { cmd: command }, 'npm-audit': { cmd: 'true' },
      } }));
      for (const filtered of [false, true]) {
        const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FILTER_FINDINGS: filtered ? '1' : '', GITHUB_BASE_REF: 'must-not-inherit' };
        const result = await runRunners(repo, assets, root, base, full, env);
        assert.equal(result, filtered && String(command).startsWith('printf') ? 0 : expected);
      }
    }
    await writeFile(join(assets, 'reviewdog/reviewdog.yml'), JSON.stringify({ runner: {
      opengrep: { cmd: 'test -z "${GITHUB_BASE_REF+set}"' }, 'npm-audit': { cmd: 'true' },
    } }));
    assert.equal(await runRunners(repo, assets, root, base, full, { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_BASE_REF: 'inherited' }), 0);
    await writeFile(join(repo, 'reviewdog.opengrep.stderr.log'), 'partial scan failed');
    assert.equal(await runRunners(repo, assets, root, base, full, { ...process.env, PATH: `${bin}:${process.env.PATH}` }), 1);
    await rm(join(repo, 'reviewdog.opengrep.stderr.log'));
  }
});

test('real reviewdog preserves runner failures after filtering all findings', async t => {
  try { execFileSync('reviewdog', ['-version'], { stdio: 'pipe' }); }
  catch { t.skip('reviewdog is not installed; mocked scanner tests still run'); return; }
  const { root, repo } = await fixture(t);
  const assets = join(root, 'assets');
  await mkdir(join(assets, 'reviewdog'), { recursive: true });
  await writeFile(join(repo, 'sample.ts'), '// dirty\n');
  const base = mergeBase(repo, 'origin/main');
  for (const full of [false, true]) {
    for (const [command, expected] of [
      ['true', 0],
      ["printf 'sample.ts:1: finding\\n'", 1],
      ["printf 'other.ts:99: filtered finding\\n'; exit 7", 1],
      ['exit 7 | cat', 1],
    ] as const) {
      await writeFile(join(assets, 'reviewdog/reviewdog.yml'), JSON.stringify({ runner: {
        opengrep: { cmd: command, errorformat: ['%f:%l: %m'] },
        'npm-audit': { cmd: 'true', errorformat: ['%f:%l: %m'] },
      } }));
      assert.equal(await runRunners(repo, assets, root, base, full, process.env), expected);
    }
  }
});

test('shallow history fails instead of omitting branch commits', async t => {
  const { root, repo } = await fixture(t);
  git(repo, ['commit', '--allow-empty', '-qm', 'next']);
  const shallow = join(root, 'shallow');
  git(repo, ['clone', '--quiet', '--depth=1', `file://${repo}`, shallow]);
  assert.throws(() => mergeBase(shallow, 'HEAD'), /full Git history/);
});

test('an exception in one check does not prevent the remaining checks', async () => {
  let scanned = false;
  const status = await runChecks('check-all', { base: 'missing', full: false }, {
    root: '/unused', run: () => 0,
    signatures: () => { throw new Error('missing base'); },
    scan: async () => { scanned = true; return 0; },
  });
  assert.equal(status, 1);
  assert.equal(scanned, true);
});


test('snapshot preserves internal skill links and rejects external links', async t => {
  const { root, repo } = await fixture(t);
  await mkdir(join(repo, 'skills'));
  await writeFile(join(repo, 'skills', 'SKILL.md'), 'skill instructions');
  await symlink('skills', join(repo, 'skill-link'));
  const target = join(root, 'internal-snapshot');
  await snapshot(repo, target);
  assert.equal(await realpath(join(target, 'skill-link')), await realpath(join(target, 'skills')));
  assert.equal(await readFile(join(target, 'skill-link', 'SKILL.md'), 'utf8'), 'skill instructions');
  await symlink(root, join(repo, 'outside-link'));
  await assert.rejects(snapshot(repo, join(root, 'external-snapshot')), /outside the repository/);
});


test('OpenGrep partial parsing fails even when its JSON formatter drops errors', async t => {
  const binary = process.env.OPENGREP_TEST_BINARY ?? 'opengrep';
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  if (version.status !== 0 || version.stdout.trim() !== '1.30.0') {
    t.skip('set OPENGREP_TEST_BINARY to OpenGrep 1.30.0 for the partial-parse regression');
    return;
  }
  const { root, repo } = await fixture(t);
  const bin = join(root, 'bin');
  await mkdir(bin);
  const resolvedBinary = binary.includes('/') ? binary : execFileSync('which', [binary], { encoding: 'utf8' }).trim();
  await symlink(resolvedBinary, join(bin, 'opengrep'));
  await writeFile(join(repo, 'bad.js'), 'function bad( { eval(@@@@@');
  await writeFile(join(repo, 'rule.json'), JSON.stringify({ rules: [{
    id: 'eval-test', languages: ['javascript'], severity: 'ERROR', message: 'eval', pattern: 'eval(...)',
  }] }));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`,
    SEMGREP_LOG_FILE: join(root, 'scan.log'), SEMGREP_SETTINGS_FILE: join(root, 'settings.yml') };
  const args = ['--config', 'rule.json', '--quiet', '--json', 'bad.js'];
  const unchecked = spawnSync('opengrep', args, { cwd: repo, env, encoding: 'utf8' });
  assert.equal(unchecked.status, 0, unchecked.stderr);
  assert.ok(JSON.parse(unchecked.stdout).errors.some((error: { type: unknown }) => Array.isArray(error.type) && error.type[0] === 'PartialParsing'));
  const failures = join(root, 'failures');
  // The formatter emits nothing for errors, just like the pinned upstream runner.
  const formatter = `opengrep ${args.join(' ')} | "${process.execPath}" -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{for(const r of JSON.parse(s).results) console.log(r.check_id)})'`;
  const checked = spawnSync('bash', ['-c', runnerCommand(formatter, 'opengrep', failures)], { cwd: repo, env, encoding: 'utf8' });
  assert.notEqual(checked.status, 0);
  assert.equal((await readFile(failures, 'utf8')).trim(), 'opengrep');
});
