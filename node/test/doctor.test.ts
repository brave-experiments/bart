import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { access, chmod, cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkClaudeReadiness } from '../src/claude-readiness.ts';
import { claudePreparationArgs } from '../src/claude-profile.ts';
import { supportsNode } from '../src/node-version.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

async function fixture(t: { after: (fn: () => Promise<void>) => void }, appName = 'app') {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'bart-doctor-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, appName);
  await mkdir(join(app, 'node'), { recursive: true });
  for (const name of ['src', 'package.json']) await cp(join(packageRoot, name), join(app, 'node', name), { recursive: true });
  for (const path of ['node_modules/.bin', 'node_modules/yaml', 'node_modules/clawperator']) {
    await mkdir(join(app, 'node', path), { recursive: true });
  }
  for (const path of ['node_modules/.bin/tsc', 'node_modules/.bin/lockfile-lint',
    'node_modules/yaml/package.json', 'node_modules/clawperator/package.json']) {
    await writeFile(join(app, 'node', path), 'fixture');
  }
  await cp(join(packageRoot, '../scripts'), join(app, 'scripts'), { recursive: true });
  const bin = join(root, 'bin');
  await mkdir(bin);
  await symlink(process.execPath, join(bin, 'node'));
  const git = execFileSync('/bin/sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
  await symlink(git, join(bin, 'git'));
  const checkout = join(root, 'brave');
  execFileSync(git, ['init', '--quiet', checkout]);
  execFileSync(git, ['-C', checkout, 'remote', 'add', 'origin', 'https://github.com/brave/brave-core.git']);
  await writeFile(join(checkout, 'package.json'), '{"name":"brave-core"}');
  await writeFile(join(bin, 'clawperator'), `#!/bin/sh
if [ "$1" = --version ]; then echo 'clawperator 1.2.3'; exit; fi
if [ "$1" = version ] && [ "$2" = --check-compat ]; then
  [ "$TEST_OPERATOR" = incompatible ] && { echo '{"compatible":false}'; exit 1; }
  echo '{"compatible":true}'; exit
fi
if [ "$1" = doctor ] && [ "$2" = --check-only ]; then
  [ "$3" = --device ] && [ "$4" = emulator-5554 ] &&
  [ "$5" = --operator-package ] && [ "$7" = --output ] && [ "$8" = json ] || exit 9
  case "$CLAWPERATOR_LOG_DIR" in
    "$BART_WORK_DIR"/cases/doctor/runs/*/clawperator-logs) ;;
    *) exit 9 ;;
  esac
  case "$TEST_CLAWPERATOR_DOCTOR" in
    warn) echo '{"ok":true,"checks":[{"status":"warn"}],"nextActions":["Review setup"]}'; exit ;;
    fail) echo '{"ok":false,"checks":[{"status":"fail"}]}'; exit 1 ;;
    invalid) echo 'not json'; exit 1 ;;
  esac
  echo '{"ok":true,"checks":[{"status":"pass"}],"nextActions":["Try a snapshot"]}'; exit
fi
exit 9
`, { mode: 0o755 });
  await writeFile(join(bin, 'adb'), `#!/bin/sh
if [ "$1" = --version ]; then echo 'Android Debug Bridge version 1.0.41'; exit; fi
[ "$1" = -s ] && [ "$2" = emulator-5554 ] || exit 9
shift 2
if [ "$1" = get-state ]; then
  [ "$TEST_DEVICE" = offline ] && { echo offline; exit 1; }
  echo device; exit
fi
[ "$1" = shell ] || exit 9
shift
if [ "$1" = screenrecord ] && [ "$2" = --help ]; then
  [ "$TEST_RECORDING" = missing ] && exit 1
  echo 'screenrecord --size WIDTHxHEIGHT --time-limit TIME'; exit
fi
if [ "$1" = command ] && [ "$2" = -v ] && [ "$3" = screencap ]; then
  [ "$TEST_SCREENSHOT" = missing ] && exit 1
  echo /system/bin/screencap; exit
fi
exit 9
`, { mode: 0o755 });
  for (const name of ['gh', 'ffmpeg', 'ffprobe']) {
    const versionArg = name === 'gh' ? '--version' : '-version';
    await writeFile(join(bin, name), `#!/bin/sh\n[ "$#" = 1 ] && [ "$1" = ${versionArg} ] || exit 9\nprintf '${name} 1.2.3\\n'\n`, { mode: 0o755 });
  }
  await writeFile(join(bin, 'claude'), `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === '--version') console.log('claude 1.2.3');
else if (args.includes('auth')) console.log(JSON.stringify({ loggedIn: process.env.TEST_AUTH !== 'missing' }));
else if (process.env.TEST_MODEL !== 'allow') process.exit(8);
else console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'BART_READY' }));
`, { mode: 0o755 });
  const env: NodeJS.ProcessEnv = { PATH: bin, HOME: root, BART_BRAVE_CORE_DIR: checkout, BART_WORK_DIR: join(root, 'work') };
  const run = (overrides: NodeJS.ProcessEnv = {}, args = ['doctor']) => spawnSync(join(app, 'scripts/bart'), args, {
    env: { ...env, ...overrides }, cwd: root, encoding: 'utf8', timeout: 20_000,
  });
  return { root, app, bin, checkout, env, run };
}

test('doctor succeeds from another directory with explicit work path without a model request', async (t) => {
  const { root, checkout, run } = await fixture(t);
  const before = await readFile(join(checkout, '.git/config'), 'utf8');
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All required doctor checks passed/);
  assert.ok(result.stdout.includes(join(root, 'work')));
  assert.match(result.stdout, /writable/);
  for (const name of ['clawperator', 'gh', 'ffmpeg', 'ffprobe', 'claude']) assert.ok(result.stdout.includes(`✅ \`${name}\`: ${name} 1.2.3`));
  assert.match(result.stdout, /✅ `adb`: Android Debug Bridge version 1.0.41/);
  assert.match(result.stdout, /Device readiness, capture capability, file-tool execution, GitHub authentication, and full agent integration were not checked/);
  assert.equal(await readFile(join(checkout, '.git/config'), 'utf8'), before);
});

test('doctor reports missing configuration and invalid checkout while continuing tool checks', async (t) => {
  const { root, run } = await fixture(t);
  for (const path of [undefined, 'relative', join(root, 'absent'), root]) {
    const result = run({ BART_BRAVE_CORE_DIR: path });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /❌.*BART_BRAVE_CORE_DIR/);
    assert.match(result.stdout, /Fix: set BART_BRAVE_CORE_DIR/);
    assert.match(result.stdout, /✅ `claude`:/);
  }
});

test('doctor rejects unusable work directories and retains existing data', async (t) => {
  const { root, checkout, run } = await fixture(t);
  const file = join(root, 'file');
  await writeFile(file, 'keep');
  const locked = join(root, 'locked');
  await mkdir(locked);
  await chmod(locked, 0o555);
  try {
    for (const path of [file, locked, join(checkout, 'work')]) {
      const result = run({ BART_WORK_DIR: path });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stdout, /❌ BART_WORK_DIR:/);
      assert.match(result.stdout, /Fix: set BART_WORK_DIR/);
    }
  } finally { await chmod(locked, 0o755); }
  assert.equal(await readFile(file, 'utf8'), 'keep');
});

test('doctor fails for each missing executable and unsuccessful version command', async (t) => {
  const { bin, run } = await fixture(t);
  for (const name of ['clawperator', 'gh', 'adb', 'ffmpeg', 'ffprobe', 'claude']) {
    const path = join(bin, name);
    const original = await readFile(path);
    await rm(path);
    const result = run();
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stdout.includes(`❌ \`${name}\`:`));
    assert.match(result.stdout, /Fix:/);
    if (name === 'adb') assert.match(result.stdout, /Android SDK Platform-Tools/);
    if (name === 'ffmpeg' || name === 'ffprobe') assert.match(result.stdout, /brew install ffmpeg/);
    await writeFile(path, original, { mode: 0o755 });
  }
  await writeFile(join(bin, 'claude'), '#!/bin/sh\nexit 7\n', { mode: 0o755 });
  assert.match(run().stdout, /❌ `claude`: --version exited 7/);
});

test('doctor reports missing Node dependencies in a new worktree', async (t) => {
  const { app, run } = await fixture(t);
  await rm(join(app, 'node/node_modules'), { recursive: true });
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /❌ Node package dependencies:/);
  assert.match(result.stdout, /Fix: run npm --prefix node ci/);
});

test('explicit device check verifies the designated device, Operator, and capture commands', async (t) => {
  const { run } = await fixture(t);
  const result = run({}, ['doctor', '--device', 'emulator-5554', '--operator-package', 'com.clawperator.operator.dev']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Device emulator-5554: connected/);
  assert.match(result.stdout, /Operator com\.clawperator\.operator\.dev: compatible/);
  assert.match(result.stdout, /Android screenrecord supports --size and --time-limit/);
  assert.match(result.stdout, /Android screencap is available/);
  assert.match(result.stdout, /A capture clip.*not checked/);
  assert.doesNotMatch(result.stdout, /Clawperator reported readiness findings/);
  for (const [env, failed] of [
    [{ TEST_DEVICE: 'offline' }, /Device emulator-5554: unavailable/],
    [{ TEST_OPERATOR: 'incompatible' }, /Operator com\.clawperator\.operator: compatibility unverified/],
    [{ TEST_RECORDING: 'missing' }, /❌ Android screenrecord/],
    [{ TEST_SCREENSHOT: 'missing' }, /❌ Android screencap/],
  ] as const) {
    const check = run(env, ['doctor', '--device', 'emulator-5554']);
    assert.equal(check.status, 1);
    assert.match(check.stdout, failed);
  }
});

test('device doctor suggests Clawperator diagnostics only for reported findings', async (t) => {
  const { run } = await fixture(t);
  const args = ['doctor', '--device', 'emulator-5554'];
  const plain = run({ TEST_CLAWPERATOR_DOCTOR: 'warn' });
  assert.equal(plain.status, 0);
  assert.doesNotMatch(plain.stdout, /Clawperator reported readiness findings/);

  for (const report of ['warn', 'fail']) {
    const result = run({ TEST_CLAWPERATOR_DOCTOR: report }, args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout.trimEnd(), /Clawperator reported readiness findings\. Run `clawperator doctor --device emulator-5554 --operator-package com\.clawperator\.operator --output pretty` to review them\.$/);
  }
  const invalid = run({ TEST_CLAWPERATOR_DOCTOR: 'invalid' }, args);
  assert.equal(invalid.status, 0);
  assert.match(invalid.stdout.trimEnd(), /Clawperator readiness findings could not be checked\.$/);
  assert.doesNotMatch(invalid.stdout, /Run `clawperator doctor/);
});

test('device doctor quotes the package-local executable in the suggested command', async (t) => {
  const { app, bin, run } = await fixture(t, "app's files");
  const local = join(app, 'node/node_modules/.bin/clawperator');
  await cp(join(bin, 'clawperator'), local);
  const result = run({ TEST_CLAWPERATOR_DOCTOR: 'warn' }, ['doctor', '--device', 'emulator-5554']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const quoted = `'${local.replaceAll("'", "'\\''")}'`;
  assert.ok(result.stdout.includes(`Run \`${quoted} doctor --device emulator-5554`));
});

test('doctor rejects incomplete or ambiguous device options before running checks', async (t) => {
  const { run } = await fixture(t);
  for (const args of [
    ['doctor', '--device'],
    ['doctor', '--device', '--claude'],
    ['doctor', '--operator-package', 'com.clawperator.operator'],
    ['doctor', '--device', 'emulator-5554', '--device', 'emulator-5556'],
  ]) {
    const result = run({}, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: bart doctor/);
    assert.equal(result.stdout, '');
  }
});

test('doctor prefers the package-local Clawperator executable', async (t) => {
  const { app, run } = await fixture(t);
  const local = join(app, 'node/node_modules/.bin/clawperator');
  await mkdir(dirname(local), { recursive: true });
  await writeFile(local, '#!/bin/sh\nprintf "0.12.0\\n"\n', { mode: 0o755 });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /`clawperator`: 0.12.0 \(required >=0.12.0\) \(package-local\)/);
});

test('doctor rejects an older Clawperator selected from PATH or the local package', async (t) => {
  const { app, bin, run } = await fixture(t);
  const global = join(bin, 'clawperator');
  await writeFile(global, '#!/bin/sh\necho 0.11.1\n', { mode: 0o755 });
  const olderGlobal = run();
  assert.equal(olderGlobal.status, 1);
  assert.match(olderGlobal.stdout, /❌ `clawperator`: 0.11.1 \(required >=0.12.0\)/);
  assert.match(olderGlobal.stdout, /Fix: run npm --prefix node ci/);

  await writeFile(global, '#!/bin/sh\necho 0.12.0\n', { mode: 0o755 });
  assert.equal(run().status, 0);
  await writeFile(global, '#!/bin/sh\necho 0.13.0\n', { mode: 0o755 });
  assert.equal(run().status, 0);
  await writeFile(global, '#!/bin/sh\necho 0.12.0-beta.1\n', { mode: 0o755 });
  const prerelease = run();
  assert.equal(prerelease.status, 1);
  assert.match(prerelease.stdout, /❌ `clawperator`: 0.12.0-beta.1/);
  await writeFile(global, '#!/bin/sh\necho 0.12.0\n', { mode: 0o755 });
  const local = join(app, 'node/node_modules/.bin/clawperator');
  await writeFile(local, '#!/bin/sh\necho 0.11.1\n', { mode: 0o755 });
  const olderLocal = run();
  assert.equal(olderLocal.status, 1);
  assert.match(olderLocal.stdout, /❌ `clawperator`: 0.11.1 \(required >=0.12.0\) \(package-local\)/);
});

test('doctor reads the Clawperator requirement from the package manifest', async (t) => {
  const { app, run } = await fixture(t);
  const manifestPath = join(app, 'node/package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.dependencies.clawperator = '1.2.4';
  await writeFile(manifestPath, JSON.stringify(manifest));
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /❌ `clawperator`: clawperator 1.2.3 \(required >=1.2.4\)/);
});

test('Node check honors the declared minimum and upper bound', () => {
  assert.equal(supportsNode('24.16.0'), true);
  assert.equal(supportsNode('24.17.0'), true);
  for (const version of ['20.20.0', '24.15.9', '25.0.0', '24.16.0-pre']) assert.equal(supportsNode(version), false);
});

test('launcher stops before TypeScript when Node does not meet the package requirement', async (t) => {
  const { app, run } = await fixture(t);
  const manifest = JSON.parse(await readFile(join(app, 'node/package.json'), 'utf8'));
  manifest.engines.node = '>=99.0.0 <100';
  await writeFile(join(app, 'node/package.json'), JSON.stringify(manifest));
  await rm(join(app, 'node/src/cli.ts'));
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /❌ Node.js .*required >=99.0.0 <100/);
  assert.match(result.stderr, /Fix: run nvm install && nvm use/);
  assert.equal(result.stdout, '');
});

test('launcher help works outside the repository without configuration', async (t) => {
  const { run } = await fixture(t);
  const result = run({ BART_BRAVE_CORE_DIR: undefined }, ['--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: bart doctor \[--claude\] \[--device <serial>/);
});

test('doctor protects the whole repository, including paths outside node and symlinks', async (t) => {
  const { app, root, run } = await fixture(t);
  const link = join(root, 'bart-link');
  await symlink(app, link);
  for (const workDir of [app, join(app, 'docs/new-work'), join(app, 'node'), join(link, 'new-work')]) {
    const result = run({ BART_WORK_DIR: workDir });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /must be outside the reference checkout and BART repository/);
  }
});


test('doctor fails with an actionable fix for missing or blank work paths and creates no fallback', async (t) => {
  const { root, run } = await fixture(t);
  const before = await readdir(root);
  for (const value of [undefined, '', '   ', '\t\n']) {
    const result = run({ BART_WORK_DIR: value });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /❌ BART_WORK_DIR: BART_WORK_DIR is required/);
    assert.match(result.stdout, /Fix: set BART_WORK_DIR in \.envrc/);
    assert.match(result.stdout, /source \.envrc/);
    assert.match(result.stdout, /1 required check\(s\) failed/);
    assert.deepEqual(await readdir(root), before);
    await assert.rejects(access(join(root, '.local/share/bart')), { code: 'ENOENT' });
  }
});


test('doctor fails when Claude is installed but preparation authentication is missing', async (t) => {
  const { run } = await fixture(t);
  const result = run({ TEST_AUTH: 'missing' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /authentication\/provider configuration unavailable/);
  assert.ok(result.stdout.includes("`--restricted` ignores Claude user/project settings"));
  assert.ok(result.stdout.includes("`source .envrc`"));
  assert.ok(result.stdout.includes("`claude auth login`"));
  assert.ok(result.stdout.includes("[docs/agent-configuration.md](docs/agent-configuration.md)"));
  assert.doesNotMatch(result.stdout, /expected model response/);
});

test('readiness bounds requests, matches preparation flags, and requires a model result', () => {
  const auth = JSON.stringify({ loggedIn: true });
  const good = { type: 'result', subtype: 'success', is_error: false, result: 'BART_READY' };
  for (const [output, exit, expected] of [
    [JSON.stringify(good), 0, true],
    [JSON.stringify({ ...good, is_error: true, result: 'Not logged in' }), 0, false],
    [JSON.stringify({ ...good, subtype: 'error_max_budget_usd' }), 0, false],
    [JSON.stringify({ ...good, result: 'something else' }), 0, false],
    [JSON.stringify(good), 1, false], ['not JSON', 0, false], ['null', 0, false],
  ] as const) {
    const checks: { ok: boolean; message: string }[] = [];
    let calls = 0;
    const run = ((command: string, args: string[], options: { timeout: number; maxBuffer: number; killSignal: string }) => {
      assert.equal(command, 'claude');
      assert.deepEqual(args.slice(0, claudePreparationArgs.length), claudePreparationArgs);
      assert.equal(options.timeout, calls === 0 ? 10_000 : 30_000);
      assert.equal(options.maxBuffer, 64 * 1024);
      assert.equal(options.killSignal, 'SIGKILL');
      if (calls === 1) {
        assert.equal(args[args.indexOf('--model') + 1], process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'haiku');
        for (const flag of ['--no-session-persistence', '--max-turns', '--max-budget-usd', '--disallowedTools']) assert.ok(args.includes(flag));
        assert.equal(args[args.indexOf('--max-turns') + 1], '1');
        assert.equal(args[args.indexOf('--max-budget-usd') + 1], '0.01');
        assert.equal(args[args.indexOf('--disallowedTools') + 1], 'Read,Write,Edit');
      }
      return { stdout: calls++ === 0 ? auth : output, status: calls === 1 ? 0 : exit };
    }) as typeof spawnSync;
    checkClaudeReadiness((check) => checks.push(check), true, run);
    assert.equal(calls, 2);
    assert.equal(checks[1]?.ok, expected);
  }
});

test('readiness handles timeout, failed auth and malformed auth without leaking output', () => {
  for (const failed of [
    { error: Object.assign(new Error('secret'), { code: 'ETIMEDOUT' }) },
    { error: Object.assign(new Error('secret'), { code: 'ENOENT' }) },
    { status: 1, stdout: 'secret', stderr: 'secret' },
    { status: 0, stdout: 'secret' },
    { status: 0, stdout: '{"loggedIn":false}' },
  ]) {
    let calls = 0;
    const checks: { ok: boolean; message: string }[] = [];
    checkClaudeReadiness((check) => checks.push(check), true, (() => { calls++; return failed; }) as unknown as typeof spawnSync);
    assert.equal(calls, 1);
    assert.equal(checks[0]?.ok, false);
    assert.doesNotMatch(JSON.stringify(checks), /secret/);
  }
});

test('readiness rejects model timeout and output overflow after provider detection', () => {
  for (const code of ['ETIMEDOUT', 'ENOBUFS']) {
    let calls = 0;
    const checks: { ok: boolean; message: string }[] = [];
    const run = (() => calls++ === 0
      ? { status: 0, stdout: '{"loggedIn":true}' }
      : { status: null, error: Object.assign(new Error('private diagnostic'), { code }) }
    ) as unknown as typeof spawnSync;
    checkClaudeReadiness(check => checks.push(check), true, run);
    assert.equal(calls, 2);
    assert.equal(checks[1]?.ok, false);
    assert.match(checks[1]!.message, code === 'ETIMEDOUT' ? /timed out/ : /output limit/);
    assert.doesNotMatch(JSON.stringify(checks), /private diagnostic/);
  }
});


test('model requests require the explicit CLI option', async (t) => {
  const { run } = await fixture(t);
  const normal = run();
  assert.equal(normal.status, 0, normal.stdout + normal.stderr);
  assert.match(normal.stdout, /model response not checked/);
  const denied = run({}, ['doctor', '--claude']);
  assert.equal(denied.status, 1);
  assert.match(denied.stdout, /model readiness failed/);
  const allowed = run({ TEST_MODEL: 'allow' }, ['doctor', '--claude']);
  assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
  assert.match(allowed.stdout, /expected model response/);
  assert.match(allowed.stdout, /may incur charges/);
  const invalid = run({}, ['doctor', '--unknown']);
  assert.equal(invalid.status, 1);
  assert.doesNotMatch(invalid.stdout, /configuration detected/);
});

test('model probe uses the configured Haiku model or the Haiku alias', () => {
  const previous = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
  try {
    for (const model of [undefined, 'configured-bedrock-haiku']) {
      if (model === undefined) delete process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      else process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = model;
      let selected: string | undefined;
      const run = ((_command: string, args: string[]) => {
        if (args.includes('auth')) return { status: 0, stdout: '{"loggedIn":true}' };
        selected = args[args.indexOf('--model') + 1];
        return { status: 0, stdout: '{"type":"result","subtype":"success","is_error":false,"result":"BART_READY"}' };
      }) as typeof spawnSync;
      checkClaudeReadiness(check => assert.equal(check.ok, true), true, run);
      assert.equal(selected, model ?? 'haiku');
    }
  } finally {
    if (previous === undefined) delete process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
    else process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = previous;
  }
});

test('doctor checks only the selected agent and rejects unknown agents', async (t) => {
  const { bin, run } = await fixture(t);
  await rm(join(bin, 'claude'));
  await writeFile(join(bin, 'opencode'), '#!/bin/sh\n[ "$#" = 1 ] && [ "$1" = --version ] || exit 9\nprintf "opencode 1.2.3\\n"\n', { mode: 0o755 });
  const result = run({ BART_AGENT: 'opencode' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /✅ `opencode`/);
  assert.doesNotMatch(result.stdout, /`claude`/);
  const invalid = run({ BART_AGENT: 'unknown' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stdout, /BART_AGENT must be claude or opencode/);
});

test('doctor rejects a Claude probe when OpenCode is selected without invoking Claude', async (t) => {
  const { bin, run } = await fixture(t);
  await rm(join(bin, 'claude'));
  const result = run({ BART_AGENT: 'opencode' }, ['doctor', '--claude']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /doctor --claude requires BART_AGENT=claude/);
  assert.doesNotMatch(result.stdout, /model check uses|configuration detected|`claude`:/);
});
