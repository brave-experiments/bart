import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { casePaths, resolveConfig, runPaths } from '../src/config.ts';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'bart-config-test-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const checkout = join(root, 'brave');
  await mkdir(checkout);
  execFileSync('git', ['init', '--quiet', checkout]);
  execFileSync('git', ['-C', checkout, 'remote', 'add', 'origin', 'https://github.com/brave/brave-core.git']);
  await writeFile(join(checkout, 'package.json'), '{"name":"brave-core"}');
  return { root, checkout, env: { HOME: root, BART_BRAVE_CORE_DIR: checkout, BART_WORK_DIR: join(root, 'work') } };
}

test('resolves tilde, explicit work directory, child environment, and planned paths', async (t) => {
  const { root, checkout, env } = await fixture(t);
  const config = await resolveConfig({ ...env, BART_BRAVE_CORE_DIR: '~/brave' });
  assert.equal(config.braveCoreDir, checkout);
  assert.equal(config.workDir, env.BART_WORK_DIR);
  assert.deepEqual(config.childEnv, { BART_BRAVE_CORE_DIR: checkout, BART_WORK_DIR: config.workDir });
  assert.equal(config.apkCacheDir, join(config.workDir, 'cache/apks'));
  const casePath = casePaths(config, 'brave-core-pr-39794');
  const run = runPaths(config, 'brave-core-pr-39794', '20260921T120000Z-unique');
  assert.equal(casePath.contextDir, join(config.casesDir, 'brave-core-pr-39794/context'));
  assert.equal(run.directory, join(casePath.runsDir, '20260921T120000Z-unique'));
  assert.equal(run.verificationDir, join(run.directory, 'verification'));
  assert.deepEqual(await readdir(config.workDir), []);
  assert.throws(() => casePaths(config, '../escape'), /Invalid path ID/);
  assert.throws(() => runPaths(config, 'valid', '/escape'), /Invalid path ID/);
  const explicit = await resolveConfig({ ...env, BART_WORK_DIR: '~/explicit' });
  assert.equal(explicit.workDir, join(root, 'explicit'));
});

test('rejects missing, relative, nonexistent, and wrong checkout configuration', async (t) => {
  const { root, checkout, env } = await fixture(t);
  await assert.rejects(resolveConfig({}), /BART_BRAVE_CORE_DIR is required/);
  await assert.rejects(resolveConfig({ ...env, BART_BRAVE_CORE_DIR: 'brave' }), /absolute path/);
  await assert.rejects(resolveConfig({ ...env, BART_BRAVE_CORE_DIR: join(root, 'missing') }), /not a Brave Core checkout/);
  await assert.rejects(resolveConfig({ ...env, BART_WORK_DIR: 'work' }), /absolute path/);
  await assert.rejects(resolveConfig({ ...env, HOME: undefined, BART_WORK_DIR: undefined }), /BART_WORK_DIR is required/);
  await mkdir(join(checkout, 'subdir'));
  await assert.rejects(resolveConfig({ ...env, BART_BRAVE_CORE_DIR: join(checkout, 'subdir') }), /not a Brave Core checkout/);
  execFileSync('git', ['-C', checkout, 'remote', 'set-url', 'origin', 'https://github.com/other/brave-core.git']);
  await assert.rejects(resolveConfig(env), /not a Brave Core checkout/);
});

test('canonicalizes symlinks and refuses work inside either checkout', async (t) => {
  const { root, checkout, env } = await fixture(t);
  const link = join(root, 'reference-link');
  await symlink(checkout, link);
  assert.equal((await resolveConfig({ ...env, BART_BRAVE_CORE_DIR: link })).braveCoreDir, checkout);
  await assert.rejects(resolveConfig({ ...env, BART_WORK_DIR: join(link, 'new/work') }), /outside/);
  const repositoryRoot = await realpath(fileURLToPath(new URL('../..', import.meta.url)));
  const repositoryLink = join(root, 'bart-link');
  await symlink(repositoryRoot, repositoryLink);
  for (const workDir of [repositoryRoot, join(repositoryRoot, 'docs/new-work'),
    join(repositoryRoot, 'node'), join(repositoryLink, 'new-work')]) {
    await assert.rejects(resolveConfig({ ...env, BART_WORK_DIR: workDir }), /outside/);
  }
  assert.deepEqual((await readdir(checkout)).sort(), ['.git', 'package.json']);
});

test('rejects a file or unwritable work directory without removing existing data', async (t) => {
  const { root, env } = await fixture(t);
  const file = join(root, 'file');
  await writeFile(file, 'retained');
  await assert.rejects(resolveConfig({ ...env, BART_WORK_DIR: file }), /not writable/);
  assert.equal(await readFile(file, 'utf8'), 'retained');
  const locked = join(root, 'locked');
  await mkdir(locked);
  await chmod(locked, 0o555);
  try {
    await assert.rejects(resolveConfig({ ...env, BART_WORK_DIR: locked }), /not writable/);
  } finally {
    await chmod(locked, 0o755);
  }
});


test('requires an explicit nonblank work directory without creating a fallback', async (t) => {
  const { root, env } = await fixture(t);
  const before = await readdir(root);
  for (const value of [undefined, '', '   ', '\t\n']) {
    await assert.rejects(resolveConfig({ ...env, BART_WORK_DIR: value }),
      /BART_WORK_DIR is required; set it to an absolute path in \.envrc/);
    assert.deepEqual(await readdir(root), before);
    await assert.rejects(access(join(root, '.local/share/bart')), { code: 'ENOENT' });
  }
});
