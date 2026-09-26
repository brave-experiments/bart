import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareRun, sha256, checkIds } from '../src/run-preparation.ts';
import { startWorkflow, stepWorkflow, finishWorkflow, validateWorkflow, validateWorkflowInput, validateWorkflowStep, validateWorkflowResult } from '../src/workflow.ts';
import type { Config } from '../src/config.ts';

const input = {
  schemaVersion: 1,
  instructions: 'Explore within the frozen plan. No verdict.',
  agent: { name: 'Test controller', mode: 'direct' },
  target: { deviceId: 'test-device', packageId: 'com.example.app', operatorPackage: 'com.clawperator.operator' },
  authority: { allowedActions: ['launch', 'capture'], reset: 'not-authorized', basis: 'Fixture authority' },
  budget: { durationMs: 60000, actions: 2, observations: 3, calibrationTrials: 2 },
};
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'bart-workflow-')));
  const config = { workDir: root, casesDir: join(root, 'cases'), apkCacheDir: join(root, 'cache/apks') } as Config;
  const snapshot = join(root, 'cases/sample/first-pass');
  await mkdir(join(snapshot, 'context'), { recursive: true });
  await writeFile(join(snapshot, 'case.json'), JSON.stringify({ schemaVersion: 2, caseId: 'sample', status: 'prepared-for-attempt', objective: 'fix-verification', target: 'https://github.com/brave/brave-core/pull/39794', revisions: { head: 'a'.repeat(40) } }));
  await writeFile(join(snapshot, 'test-plan.md'), 'Frozen plan');
  await writeFile(join(snapshot, 'context/findings.md'), 'Fixture source');
  const files: Record<string, string> = {};
  for (const path of ['case.json', 'test-plan.md', 'context/findings.md']) files[path] = await sha256(join(snapshot, path));
  await writeFile(join(snapshot, 'manifest.json'), JSON.stringify({ schemaVersion: 1, caseId: 'sample', status: 'prepared-for-attempt', files }));
  const evidence = join(root, 'receipt.txt');
  const apk = join(root, 'sample.apk');
  await writeFile(evidence, 'Synthetic fixture, not runtime evidence');
  await writeFile(apk, 'Fixture APK');
  const preparation = await prepareRun(config, 'sample', {
    schemaVersion: 1, target: input.target, authority: input.authority,
    build: { path: apk, origin: 'Fixture', relationship: 'exact-pr-head', sourceRevision: 'a'.repeat(40), evidence: [evidence] },
    checks: Object.fromEntries(checkIds.map(id => [id, { status: 'pass', observedAt: new Date().toISOString(), method: 'Fixture', detail: 'Synthetic observation', nextAction: null, evidence: [evidence] }])),
    observations: { androidVersion: '17', braveVersion: '1.98', chromiumVersion: '154', activePackage: input.target.packageId, settingsVariant: 'disabled', settings: ['Fixture'], performedActions: [] },
  });
  return { root, run: preparation.runDir };
}
function blocked() {
  return {
    schemaVersion: 1, status: 'blocked', summary: 'Native entry unresolved', deviations: [], limits: ['No scored coverage'], blockers: ['Native entry unknown'],
    agent: input.agent, adapters: { direct: 'not-run', launched: 'not-implemented' }, productVerdict: 'not-assessed',
    observations: [{ claim: 'Navigation unknown', strength: 'unknown', evidence: ['instructions.md'] }],
    workflow: 'skills/SKILL.md', handoff: 'handoff.md', dependencies: ['Clawperator 0.12.2'],
  };
}
async function documents(directory: string) {
  await writeFile(join(directory, 'skills/SKILL.md'), 'Blocked temporary workflow');
  await writeFile(join(directory, 'handoff.md'), 'Do not score');
}

test('contract rejects unbounded input, target overrides and misclassified mutation', () => {
  assert.equal(validateWorkflowInput(input).agent.name, 'Test controller');
  assert.throws(() => validateWorkflowInput({ ...input, budget: { ...input.budget, calibrationTrials: 3 } }), /budget/);
  assert.throws(() => validateWorkflowInput({ ...input, target: { ...input.target, deviceId: '../another' } }), /target/);
  for (const args of [['snapshot', '--device=other'], ['snapshot', '--raw-path', '/tmp/out'], ['click', '--text', 'Reset']]) {
    assert.throws(() => validateWorkflowStep({ kind: 'observation', args, reason: 'Fixture', evidence: [] }));
  }
  assert.throws(() => validateWorkflowStep({ kind: 'action', args: ['click', '--text', 'Next'], reason: 'Fixture', evidence: [] }), /current observation/);
});

test('device ownership, unsupported launch and target agreement fail before dispatch', async () => {
  const f = await fixture();
  try {
    await assert.rejects(startWorkflow(f.run, { ...input, agent: { name: 'Other', mode: 'launched' } }), /No launched adapter/);
    await assert.rejects(startWorkflow(f.run, { ...input, target: { ...input.target, packageId: 'com.other.app' } }), /match preparation/);
    const { directory } = await startWorkflow(f.run, input);
    await assert.rejects(startWorkflow(f.run, input), /EEXIST/);
    await assert.rejects(stepWorkflow(directory, { kind: 'action', args: ['click', '--text', 'Next'], reason: 'No fresh observation', evidence: ['instructions.md'] }), /Refresh observation/);
    await documents(directory);
    await finishWorkflow(directory, blocked());
    assert.equal((await validateWorkflow(directory)).status, 'blocked');
    await assert.rejects(stepWorkflow(directory, { kind: 'trial', args: [], reason: 'Finished', evidence: [] }));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('trial budget survives sessions and interrupted dispatch prevents replay', async () => {
  const f = await fixture();
  try {
    const first = await startWorkflow(f.run, input);
    const marker = { kind: 'trial', args: [], reason: 'Unscored trial', evidence: [] };
    await stepWorkflow(first.directory, marker);
    await stepWorkflow(first.directory, marker);
    await assert.rejects(stepWorkflow(first.directory, marker), /Calibration budget/);
    await documents(first.directory);
    await finishWorkflow(first.directory, blocked());
    const second = await startWorkflow(f.run, input);
    await assert.rejects(stepWorkflow(second.directory, marker), /across case runs/);
    await writeFile(join(second.directory, 'receipts/0001.pending'), JSON.stringify({ kind: 'gear' }));
    await assert.rejects(stepWorkflow(second.directory, { kind: 'observation', args: ['snapshot'], reason: 'Do not dispatch', evidence: [] }), /Interrupted dispatch/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('results reject native-success-only claims, unsafe evidence and changed saved bytes', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    await documents(directory);
    await assert.rejects(validateWorkflowResult(directory, { exitCode: 0 }), /Invalid workflow result/);
    await assert.rejects(validateWorkflowResult(directory, { ...blocked(), productVerdict: 'pass' }), /cannot emit/);
    await assert.rejects(validateWorkflowResult(directory, { ...blocked(), status: 'ready', blockers: [] }), /exercised direct execution/);
    await assert.rejects(validateWorkflowResult(directory, { ...blocked(), handoff: '../run.json' }), /Unsafe evidence/);
    await symlink(join(directory, 'handoff.md'), join(directory, 'escape.md'));
    await assert.rejects(validateWorkflowResult(directory, { ...blocked(), handoff: 'escape.md' }), /symlinks/);
    await rm(join(directory, 'escape.md'));
    await finishWorkflow(directory, blocked());
    assert.equal((await validateWorkflow(directory)).productVerdict, 'not-assessed');
    await writeFile(join(directory, 'handoff.md'), 'Altered');
    await assert.rejects(validateWorkflow(directory), /hash mismatch/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('finishing refuses a live video writer', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    await documents(directory);
    await mkdir(join(directory, 'capture-0001'));
    await writeFile(join(directory, 'capture-0001/manifest.json'), JSON.stringify({ status: 'finalizing' }));
    await assert.rejects(finishWorkflow(directory, blocked()), /finalize capture/);
    assert.equal(JSON.parse(await readFile(join(f.root, 'device-controllers/test-device.json'), 'utf8')).directory, directory);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
