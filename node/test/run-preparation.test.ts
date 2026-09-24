import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareRun, validateRun, sha256, checkIds } from '../src/run-preparation.ts';
import type { Config } from '../src/config.ts';

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'bart-prepare-')));
  const config = { workDir: root, casesDir: join(root, 'cases'), apkCacheDir: join(root, 'cache/apks') } as Config;
  const snapshot = join(root, 'cases/sample/first-pass');
  await mkdir(join(snapshot, 'context'), { recursive: true });
  await writeFile(join(snapshot, 'case.json'), JSON.stringify({ schemaVersion: 2, caseId: 'sample', status: 'prepared-for-attempt', objective: 'fix-verification', target: 'https://github.com/brave/brave-core/pull/39794', revisions: { head: 'a'.repeat(40) } }));
  await writeFile(join(snapshot, 'test-plan.md'), 'One frozen plan');
  await writeFile(join(snapshot, 'context/findings.md'), 'Findings');
  const files: { [key: string]: string } = {};
  for (const path of ['case.json', 'test-plan.md', 'context/findings.md']) files[path] = await sha256(join(snapshot, path));
  await writeFile(join(snapshot, 'manifest.json'), JSON.stringify({ schemaVersion: 1, caseId: 'sample', status: 'prepared-for-attempt', files }));
  const evidence = join(root, 'receipt.json');
  await writeFile(evidence, '{"observation":"fixture"}');
  const input = {
    schemaVersion: 1, target: { deviceId: 'emulator-5554', packageId: 'com.brave.browser_nightly', operatorPackage: 'com.clawperator.operator' },
    authority: { allowedActions: [], reset: 'not-authorized', basis: 'Test fixture' }, build: null as any, checks: {} as any,
    observations: { androidVersion: null as string | null, braveVersion: null as string | null, chromiumVersion: null as string | null, activePackage: null as string | null, settingsVariant: null as string | null, settings: [] as string[], performedActions: [] },
  };
  return { root, config, snapshot, input, evidence };
}

test('missing observations save a valid blocked handoff and immutable package copy', async () => {
  const f = await fixture();
  try {
    const result = await prepareRun(f.config, 'sample', f.input);
    assert.equal(result.status, 'blocked');
    assert.equal(result.blockers.length, checkIds.length);
    assert.equal((await validateRun(result.runDir)).status, 'blocked');
    await writeFile(join(f.snapshot, 'test-plan.md'), 'Changed after preparation');
    assert.equal((await validateRun(result.runDir)).status, 'blocked');
    assert.equal(await readFile(join(result.runDir, 'preparation/package/test-plan.md'), 'utf8'), 'One frozen plan');
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /hash mismatch/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('pass requires evidence and identity; malformed checks cannot imply readiness', async () => {
  const f = await fixture();
  try {
    f.input.checks.device = { status: 'pass', observedAt: new Date().toISOString(), method: 'ADB', detail: 'Observed', nextAction: null, evidence: [] };
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /needs evidence/);
    f.input.checks.device.evidence = [f.evidence];
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /Android identity missing/);
    f.input.checks.device.status = 'unknown';
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /next action/);
    f.input.checks = { typo: {} };
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /Unknown check/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('ready record retains receipts and APK, detects tampering and rejects wrong PR head', async () => {
  const f = await fixture();
  try {
    const apk = join(f.root, 'fixture.apk');
    await writeFile(apk, 'APK bytes fixture');
    f.input.build = { path: apk, origin: 'Fixture', relationship: 'exact-pr-head', sourceRevision: 'a'.repeat(40), evidence: [f.evidence], expectedSha256: await sha256(apk) };
    f.input.observations = { ...f.input.observations, androidVersion: '17', braveVersion: '1.98.19', chromiumVersion: '154.0', activePackage: f.input.target.packageId, settingsVariant: 'disabled', settings: ['Settings Disabled after relaunch; video-fit Enabled'] };
    for (const id of checkIds) f.input.checks[id] = { status: 'pass', observedAt: new Date().toISOString(), method: 'Fixture observation', detail: 'Fixture', nextAction: null, evidence: [f.evidence] };
    const result = await prepareRun(f.config, 'sample', f.input);
    assert.equal(result.status, 'ready');
    assert.equal((await validateRun(result.runDir)).status, 'ready');
    const record = JSON.parse(await readFile(result.recordPath, 'utf8'));
    assert.equal(Object.keys(record.evidence).length, 1);
    assert.equal(f.input.checks.device.evidence[0], f.evidence, 'must not mutate caller input');
    assert.equal(record.build.sha256, await sha256(record.build.path));
    const disagreements: [string, (record: any) => void, RegExp][] = [
      ['settings variant', r => { r.observations.settingsVariant = 'enabled'; }, /observations differs from preserved input/],
      ['reset authority', r => { r.authority.reset = 'authorized'; }, /authority differs from preserved input/],
      ['target', r => { r.target.deviceId = 'another-device'; }, /target differs from preserved input/],
      ['check details', r => { r.checks.device.detail = 'Changed observation'; }, /checks differs from preserved input/],
      ['build origin', r => { r.build.origin = 'Another source'; }, /build differs from preserved input/],
    ];
    for (const [name, change, error] of disagreements) {
      const edited = structuredClone(record);
      change(edited);
      await writeFile(result.recordPath, JSON.stringify(edited));
      await assert.rejects(validateRun(result.runDir), error, name);
    }
    await writeFile(result.recordPath, JSON.stringify(record));
    const summaryPath = join(result.runDir, 'preparation.md');
    const summary = await readFile(summaryPath, 'utf8');
    await writeFile(summaryPath, summary.replace('# Preparation: ready', '# Preparation: blocked'));
    await assert.rejects(validateRun(result.runDir), /summary differs from run record/);
    await writeFile(summaryPath, summary);
    assert.equal((await validateRun(result.runDir)).status, 'ready');
    f.input.build.sourceRevision = 'b'.repeat(40);
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /differs from frozen PR head/);
    await writeFile(join(result.runDir, record.checks.device.evidence[0]), 'tampered');
    await assert.rejects(validateRun(result.runDir), /Evidence hash mismatch/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('rejects snapshot traversal, symlinked runs and mismatched APK digests', async () => {
  const f = await fixture();
  try {
    const outside = join(f.root, 'outside');
    await mkdir(outside);
    await symlink(outside, join(f.root, 'cases/sample/runs'));
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /symlinks/);
    await rm(join(f.root, 'cases/sample/runs'));
    f.input.build = { path: f.evidence, origin: 'Fixture', relationship: 'unresolved', sourceRevision: null, evidence: [], expectedSha256: '0'.repeat(64) };
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /digest does not match/);
    f.input.build = null;
    const manifest = JSON.parse(await readFile(join(f.snapshot, 'manifest.json'), 'utf8'));
    manifest.files['../outside'] = 'a'.repeat(64);
    await writeFile(join(f.snapshot, 'manifest.json'), JSON.stringify(manifest));
    await assert.rejects(prepareRun(f.config, 'sample', f.input), /file set/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('validator rejects forged ready status and missing checks in saved output', async () => {
  const f = await fixture();
  try {
    const result = await prepareRun(f.config, 'sample', f.input);
    const record = JSON.parse(await readFile(result.recordPath, 'utf8'));
    record.status = 'ready';
    await writeFile(result.recordPath, JSON.stringify(record));
    await assert.rejects(validateRun(result.runDir), /Inconsistent status/);
    record.status = 'blocked';
    delete record.checks.recording;
    await writeFile(result.recordPath, JSON.stringify(record));
    await assert.rejects(validateRun(result.runDir), /Missing readiness checks/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});


test('input consistency preserves evidence mapping without needing original files', async () => {
  const f = await fixture();
  try {
    const other = join(f.root, 'other/receipt.json');
    await mkdir(join(f.root, 'other'));
    await writeFile(other, 'Another receipt');
    f.input.checks.device = { status: 'unknown', observedAt: null, method: 'Fixture', detail: 'Missing identity', nextAction: 'Observe device', evidence: [f.evidence, other, f.evidence] };
    f.input.build = { path: f.evidence, origin: 'Fixture', relationship: 'unresolved', sourceRevision: null, evidence: [other] };
    const result = await prepareRun(f.config, 'sample', f.input);
    await rm(f.evidence);
    await rm(other);
    assert.equal((await validateRun(result.runDir)).status, 'blocked');
    const record = JSON.parse(await readFile(result.recordPath, 'utf8'));
    assert.deepEqual(record.checks.device.evidence, ['preparation/evidence/0-receipt.json', 'preparation/evidence/1-receipt.json', 'preparation/evidence/0-receipt.json']);
    assert.deepEqual(record.build.evidence, ['preparation/evidence/1-receipt.json']);
    // Swap distinct receipts while retaining valid hashes and inventory.
    [record.checks.device.evidence[0], record.checks.device.evidence[1]] = [record.checks.device.evidence[1], record.checks.device.evidence[0]];
    await writeFile(result.recordPath, JSON.stringify(record));
    await assert.rejects(validateRun(result.runDir), /checks differs from preserved input/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
