import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { supportsNode } from '../src/node-version.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'bart-doctor-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, 'app');
  await mkdir(join(app, 'node'), { recursive: true });
  for (const name of ['src', 'package.json']) await cp(join(packageRoot, name), join(app, 'node', name), { recursive: true });
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
  for (const name of ['clawperator', 'gh', 'claude']) {
    await writeFile(join(bin, name), `#!/bin/sh\n[ "$#" = 1 ] && [ "$1" = --version ] || exit 9\nprintf '${name} 1.2.3\\n'\n`, { mode: 0o755 });
  }
  const env: NodeJS.ProcessEnv = { PATH: bin, HOME: root, BART_BRAVE_CORE_DIR: checkout, BART_WORK_DIR: join(root, 'work') };
  const run = (overrides: NodeJS.ProcessEnv = {}, args = ['doctor']) => spawnSync(join(app, 'scripts/bart'), args, {
    env: { ...env, ...overrides }, cwd: root, encoding: 'utf8', timeout: 20_000,
  });
  return { root, app, bin, checkout, env, run };
}

test('doctor succeeds from another directory with default work path and version-only tools', async (t) => {
  const { root, checkout, run } = await fixture(t);
  const before = await readFile(join(checkout, '.git/config'), 'utf8');
  const result = run({ BART_WORK_DIR: undefined });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All required host checks passed/);
  assert.ok(result.stdout.includes(join(root, '.local/share/bart')));
  assert.match(result.stdout, /writable, default/);
  for (const name of ['clawperator', 'gh', 'claude']) assert.ok(result.stdout.includes(`✅ ${name}: ${name} 1.2.3`));
  assert.match(result.stdout, /Authentication, device readiness, and agent integration were not checked/);
  assert.equal(await readFile(join(checkout, '.git/config'), 'utf8'), before);
});

test('doctor reports missing configuration and invalid checkout while continuing tool checks', async (t) => {
  const { root, run } = await fixture(t);
  for (const path of [undefined, 'relative', join(root, 'absent'), root]) {
    const result = run({ BART_BRAVE_CORE_DIR: path });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /❌.*BART_BRAVE_CORE_DIR/);
    assert.match(result.stdout, /Fix: set BART_BRAVE_CORE_DIR/);
    assert.match(result.stdout, /✅ claude:/);
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
  for (const name of ['clawperator', 'gh', 'claude']) {
    const path = join(bin, name);
    const original = await readFile(path);
    await rm(path);
    const result = run();
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stdout.includes(`❌ ${name}:`));
    assert.match(result.stdout, /Fix:/);
    await writeFile(path, original, { mode: 0o755 });
  }
  await writeFile(join(bin, 'claude'), '#!/bin/sh\nexit 7\n', { mode: 0o755 });
  assert.match(run().stdout, /❌ claude: --version exited 7/);
});

test('doctor prefers the package-local Clawperator executable', async (t) => {
  const { app, run } = await fixture(t);
  const local = join(app, 'node/node_modules/.bin/clawperator');
  await mkdir(dirname(local), { recursive: true });
  await writeFile(local, '#!/bin/sh\nprintf "0.12.0\\n"\n', { mode: 0o755 });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /clawperator: 0.12.0 \(package-local\)/);
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
  assert.match(result.stdout, /Usage: bart doctor \| config/);
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
