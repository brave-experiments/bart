import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs, { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

async function writeSources(directory: string) {
  const planPath = join(directory, '../test-plan.md');
  const plan = await readFile(planPath, 'utf8');
  await writeFile(planPath, plan + '\n<a id="check-001"></a>\n[Open settings](#check-001)\n[Feature gate](context/findings.md#finding-001)\n');
  await writeFile(join(directory, 'findings.md'), '<a id="finding-001"></a>\n## Feature gate\nSupported by report.');
  await writeFile(join(directory, 'brief-index.json'), JSON.stringify({
    findings: [{ id: 'finding-001', title: 'Feature gate', sourceIds: ['report'] }],
    checks: [{ id: 'check-001', title: 'Open settings' }],
  }));
  await writeFile(join(directory, 'report.txt'), 'Primary report');
  await writeFile(join(directory, 'sources.json'), JSON.stringify([{
    id: 'report', capture: 'report.txt', retrievedAt: '2026-09-21T00:00:00Z', supports: 'Reported problem',
  }]));
  await writeFile(join(directory, 'source-index.json'), JSON.stringify({
    retrievedAt: '2026-09-21T00:00:00Z', files: [],
  }));
}
import { createCase, freezeCase } from '../src/case-package.ts';
import type { Config } from '../src/config.ts';

test('case creation rejects a symlinked cases directory without writing to its target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bart-package-'));
  const config = { casesDir: join(root, 'work/cases') } as Config;
  const outside = join(root, 'outside-work');
  try {
    await mkdir(join(root, 'work'));
    await mkdir(outside);
    await symlink(outside, config.casesDir);
    await assert.rejects(
      createCase(config, 'sample', 'https://github.com/brave/brave-core/pull/1', 'fix-verification'),
      /Cases directory must be a real directory/,
    );
    assert.deepEqual(await readdir(outside), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('freeze rejects a symlinked cases directory without writing a snapshot to its target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bart-package-'));
  const config = { casesDir: join(root, 'work/cases') } as Config;
  const outside = join(root, 'outside-work');
  try {
    const paths = await createCase(
      { casesDir: outside } as Config, 'sample',
      'https://github.com/brave/brave-core/pull/1', 'fix-verification',
    );
    const record = JSON.parse(await readFile(join(paths.directory, 'case.json'), 'utf8'));
    record.status = 'prepared-for-attempt';
    await writeFile(join(paths.directory, 'case.json'), JSON.stringify(record));
    await writeFile(paths.testPlan, 'Plan');
    await writeSources(paths.contextDir);
    const before = await readdir(paths.directory);
    await mkdir(join(root, 'work'));
    await symlink(outside, config.casesDir);
    await assert.rejects(freezeCase(config, 'sample'), /Cases directory must be a real directory/);
    assert.deepEqual(await readdir(paths.directory), before);
    assert.equal(await readFile(join(paths.directory, 'case.json'), 'utf8'), JSON.stringify(record));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('case allocation refuses reuse and snapshot retains original bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bart-package-'));
  const config = { casesDir: join(root, 'cases') } as Config;
  try {
    await assert.rejects(createCase(config, '../escape', 'https://github.com/brave/brave-core/pull/1', 'fix-verification'));
    const paths = await createCase(config, 'sample', 'https://github.com/brave/brave-core/pull/1', 'fix-verification');
    await assert.rejects(createCase(config, 'sample', 'https://github.com/brave/brave-core/pull/1', 'fix-verification'));
    await assert.rejects(freezeCase(config, 'sample'), { code: 'ENOENT' });
    await writeFile(paths.testPlan, 'Original plan');
    await assert.rejects(freezeCase(config, 'sample'), /prepared-for-attempt/);
    const record = JSON.parse(await readFile(join(paths.directory, 'case.json'), 'utf8'));
    record.status = 'prepared-for-attempt';
    await writeFile(join(paths.directory, 'case.json'), JSON.stringify(record));
    await writeFile(paths.testPlan, 'Original plan');
    await writeSources(paths.contextDir);
    await mkdir(paths.runsDir);
    await writeFile(join(paths.runsDir, 'not-context.txt'), 'run');
    const originalPlan = await readFile(paths.testPlan, 'utf8');
    const frozen = await freezeCase(config, 'sample');
    await writeFile(paths.testPlan, originalPlan.replace('Original plan', 'Later plan'));
    assert.equal(await readFile(join(frozen, 'test-plan.md'), 'utf8'), originalPlan);
    const manifest = JSON.parse(await readFile(join(frozen, 'manifest.json'), 'utf8'));
    assert.equal(manifest.files['test-plan.md'], createHash('sha256').update(originalPlan).digest('hex'));
    await assert.rejects(readFile(join(frozen, 'runs/not-context.txt')), { code: 'ENOENT' });
    await assert.rejects(freezeCase(config, 'sample'), { code: 'EEXIST' });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('freeze rejects links into unrelated material', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bart-package-'));
  const config = { casesDir: join(root, 'cases') } as Config;
  try {
    const paths = await createCase(config, 'sample', 'https://github.com/brave/brave-browser/issues/1', 'issue-reproduction');
    const record = JSON.parse(await readFile(join(paths.directory, 'case.json'), 'utf8'));
    record.status = 'prepared-for-attempt';
    await writeFile(join(paths.directory, 'case.json'), JSON.stringify(record));
    await writeFile(paths.testPlan, 'Plan');
    await writeSources(paths.contextDir);
    await symlink(root, join(paths.contextDir, 'outside'));
    await assert.rejects(freezeCase(config, 'sample'), /Only regular files/);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test('freeze rejects a capture added after enumeration but before recursive copy', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'bart-package-'));
  const config = { casesDir: join(root, 'cases') } as Config;
  try {
    const paths = await createCase(config, 'sample', 'https://github.com/brave/brave-core/pull/1', 'fix-verification');
    const record = JSON.parse(await readFile(join(paths.directory, 'case.json'), 'utf8'));
    record.status = 'prepared-for-attempt';
    await writeFile(join(paths.directory, 'case.json'), JSON.stringify(record));
    await writeFile(paths.testPlan, 'Plan');
    await writeSources(paths.contextDir);
    const copy = fs.cp;
    t.mock.method(fs, 'cp', async (...args: Parameters<typeof fs.cp>) => {
      if (args[0] === paths.contextDir) {
        await writeFile(join(paths.contextDir, 'late-source.txt'), 'Late capture');
      }
      return copy(...args);
    });
    await assert.rejects(freezeCase(config, 'sample'), /changed during freeze/);
    assert.equal(await readFile(join(paths.directory, 'first-pass/context/late-source.txt'), 'utf8'), 'Late capture');
    await assert.rejects(readFile(join(paths.directory, 'first-pass/manifest.json')), { code: 'ENOENT' });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('freeze rejects source edits and removals during copying', async (t) => {
  for (const change of ['edit', 'remove', 'add-after-copy']) {
    await t.test(change, async (t) => {
      const root = await mkdtemp(join(tmpdir(), 'bart-package-'));
      const config = { casesDir: join(root, 'cases') } as Config;
      try {
        const paths = await createCase(config, 'sample', 'https://github.com/brave/brave-core/pull/1', 'fix-verification');
        const record = JSON.parse(await readFile(join(paths.directory, 'case.json'), 'utf8'));
        record.status = 'prepared-for-attempt';
        await writeFile(join(paths.directory, 'case.json'), JSON.stringify(record));
        await writeFile(paths.testPlan, 'Plan');
        await writeSources(paths.contextDir);
        const copy = fs.cp;
        t.mock.method(fs, 'cp', async (...args: Parameters<typeof fs.cp>) => {
          if (args[0] === paths.contextDir && change === 'edit') {
            await writeFile(join(paths.contextDir, 'report.txt'), 'Changed before copy');
          }
          await copy(...args);
          if (args[0] === paths.contextDir && change === 'remove') await rm(join(paths.contextDir, 'report.txt'));
          if (args[0] === paths.contextDir && change === 'add-after-copy') {
            await writeFile(join(paths.contextDir, 'late.txt'), 'Added after copy');
          }
        });
        await assert.rejects(freezeCase(config, 'sample'), /changed during freeze/);
        await assert.rejects(readFile(join(paths.directory, 'first-pass/manifest.json')), { code: 'ENOENT' });
      } finally { await rm(root, { recursive: true, force: true }); }
    });
  }
});
