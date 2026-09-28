import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareRun, sha256, checkIds } from '../src/run-preparation.ts';
import { startWorkflow, stepWorkflow, finishWorkflow, validateWorkflow, validateWorkflowInput, validateWorkflowStep, validateWorkflowResult } from '../src/workflow.ts';
import type { Config } from '../src/config.ts';

const input = {
  schemaVersion: 2,
  routeChecks: ['details-screen'],
  instructions: 'Explore within the frozen plan. No verdict.',
  agent: { name: 'Test controller', mode: 'direct' },
  target: { deviceId: 'test-device', packageId: 'com.example.app', operatorPackage: 'com.clawperator.operator' },
  authority: { allowedActions: ['launch', 'capture'], reset: 'not-authorized', basis: 'Fixture authority' },
  budget: { durationMs: 60000, actions: 2, observations: 3 },
};
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'bart-workflow-')));
  const config = { workDir: root, casesDir: join(root, 'cases'), apkCacheDir: join(root, 'cache/apks') } as Config;
  const snapshot = join(root, 'cases/sample/first-pass');
  await mkdir(join(snapshot, 'context'), { recursive: true });
  await writeFile(join(snapshot, 'case.json'), JSON.stringify({ schemaVersion: 2, caseId: 'sample', status: 'prepared-for-attempt', objective: 'fix-verification', target: 'https://github.com/example/android-app/issues/42', revisions: { head: 'a'.repeat(40) } }));
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
    schemaVersion: 2, status: 'blocked', summary: 'Details route unresolved', deviations: [], limits: ['No scored coverage'], blockers: ['Details screen unknown'],
    agent: input.agent, adapters: { direct: 'not-run', launched: 'not-implemented' }, productVerdict: 'not-assessed',
    observations: [{ claim: 'Navigation unknown', strength: 'unknown', evidence: ['instructions.md'] }],
    workflow: 'skills/SKILL.md', unresolved: ['Details screen unknown'], checks: { 'details-screen': { status: 'unresolved', detail: 'No observation yet', evidence: [] } }, dependencies: ['Clawperator 0.12.4'],
  };
}
async function documents(directory: string) {
  await writeFile(join(directory, 'skills/SKILL.md'), 'Blocked temporary workflow');

}

test('contract rejects unbounded input, target overrides and misclassified mutation', () => {
  assert.equal(validateWorkflowInput(input).agent.name, 'Test controller');
  assert.throws(() => validateWorkflowInput({ ...input, budget: { ...input.budget, actions: 201 } }), /budget/);
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
    await assert.rejects(stepWorkflow(directory, { kind: 'attempt', args: [], reason: 'Finished', evidence: [] }));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('attempt budget survives sessions and interrupted dispatch prevents replay', async () => {
  const f = await fixture();
  try {
    const bounded = { ...input, attemptBudget: { total: 3, basis: 'Fixture case ceiling' } };
    const first = await startWorkflow(f.run, bounded);
    const marker = { kind: 'attempt', args: [], reason: 'Unscored trial', evidence: [] };
    await stepWorkflow(first.directory, marker);
    await stepWorkflow(first.directory, marker);
    await stepWorkflow(first.directory, marker);
    await assert.rejects(stepWorkflow(first.directory, marker), /Attempt budget/);
    await documents(first.directory);
    await finishWorkflow(first.directory, blocked());
    await assert.rejects(startWorkflow(f.run, input), /Carry forward/);
    const second = await startWorkflow(f.run, bounded);
    await assert.rejects(stepWorkflow(second.directory, marker), /across case runs/);
    await writeFile(join(second.directory, 'receipts/0001.pending'), JSON.stringify({ kind: 'action' }));
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
    await assert.rejects(validateWorkflowResult(directory, { ...blocked(), status: 'ready', blockers: [] }), /Ready requires/);
    await assert.rejects(validateWorkflowResult(directory, { ...blocked(), workflow: 'skills/../../run.json' }), /Unsafe evidence/);
    await symlink(join(directory, 'skills/SKILL.md'), join(directory, 'skills/escape.md'));
    await assert.rejects(validateWorkflowResult(directory, { ...blocked(), workflow: 'skills/escape.md' }), /symlinks/);
    await rm(join(directory, 'skills/escape.md'));
    await finishWorkflow(directory, blocked());
    assert.equal((await validateWorkflow(directory)).productVerdict, 'not-assessed');
    await writeFile(join(directory, 'skills/SKILL.md'), 'Altered');
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

test('bounded sequences count every click and reject arbitrary payloads', async () => {
  const { workflowActionCost } = await import('../src/workflow.ts');
  const step = { kind: 'action', args: [], reason: 'Reveal then tap a transient action', evidence: ['receipts/0001.json'], sequence: [{ type: 'click', x: 540, y: 740 }, { type: 'sleep', durationMs: 300 }, { type: 'click', x: 954, y: 917 }] };
  assert.equal(workflowActionCost(validateWorkflowStep(step)), 2);
  assert.throws(() => validateWorkflowStep({ ...step, sequence: [{ type: 'click', x: 1, y: 2, path: '/tmp/escape' }] }), /coordinate/);
  assert.throws(() => validateWorkflowStep({ ...step, sequence: [{ type: 'open', packageId: 'other' }] }), /delay/);
  assert.throws(() => validateWorkflowStep({ ...step, sequence: [...step.sequence, { type: 'click', x: 1, y: 2 }] }), /limit/);
  assert.throws(() => validateWorkflowStep({ ...step, kind: 'gear' }), /kind/);
  assert.throws(() => validateWorkflowStep({ ...step, holdMs: -1 }), /holdMs/);
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, { ...input, budget: { ...input.budget, actions: 1 } });
    await assert.rejects(stepWorkflow(directory, step), /Action budget/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('failed sequences keep all reserved clicks charged before another dispatch', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    const failed = { kind: 'action', args: ['exec'], sequence: [{ type: 'click', x: 1, y: 1 }, { type: 'click', x: 2, y: 2 }], code: 1, stdout: '{"status":"failed","stepResults":[{"id":"step-1","success":true}]}', finishedAt: new Date().toISOString() };
    await writeFile(join(directory, 'receipts/0001.pending'), JSON.stringify(failed));
    await writeFile(join(directory, 'receipts/0001.json'), JSON.stringify(failed));
    await assert.rejects(stepWorkflow(directory, { kind: 'action', args: ['click', '--text', 'Next'], evidence: ['instructions.md'], reason: 'Would replay uncertain sequence' }), /Action budget/);
    assert.equal(JSON.parse(await readFile(join(directory, 'receipts/0001.json'), 'utf8')).stdout, failed.stdout);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

// Synthetic receipts exercise the contract; no device or Clawperator process runs.
async function receipt(directory: string, id: string, kind: string, args: string[], code = 0, extra = {}) {
  const value = { kind, args, code, reason: 'Synthetic fixture', evidence: [], receipt: `receipts/${id}.json`, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), stdout: 'Synthetic fixture', stderr: '', ...extra };
  await writeFile(join(directory, `receipts/${id}.pending`), JSON.stringify(value));
  await writeFile(join(directory, value.receipt), JSON.stringify(value));
  return value;
}
function ready() {
  return { ...blocked(), status: 'ready', summary: 'The details route is repeatable', blockers: [], unresolved: [], adapters: { direct: 'exercised', launched: 'not-implemented' },
    observations: [{ claim: 'Details screen reached', strength: 'observed', evidence: ['receipts/0003.json', 'details.xml'] }],
    checks: { 'details-screen': { status: 'observed', detail: 'Observed details after opening the item', evidence: ['receipts/0003.json', 'details.xml'] } } };
}
async function routeEvidence(directory: string) {
  await documents(directory);
  await writeFile(join(directory, 'skills/SKILL.md'), 'Observe the item list; open an item; verify its details. Refresh targets before repeating.');
  await writeFile(join(directory, 'details.xml'), '<hierarchy><node text="Item details"/></hierarchy>');
  await receipt(directory, '0001', 'observation', ['snapshot']);
  await receipt(directory, '0002', 'action', ['click', '--text', 'Item']);
  await receipt(directory, '0003', 'observation', ['snapshot']);
}

test('non-39794 route can finish ready without video, gear, trials, timing or handoff', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    await routeEvidence(directory);
    await receipt(directory, '0004', 'observation', ['snapshot'], 1); // Retained failure does not erase established evidence.
    assert.equal((await finishWorkflow(directory, ready())).status, 'ready');
    assert.equal((await validateWorkflow(directory)).status, 'ready');
    assert.equal(JSON.parse(await readFile(join(directory, 'receipts/0004.json'), 'utf8')).code, 1);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('readiness rejects missing route checks, unsupported claims and unfinished dispatch', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    await routeEvidence(directory);
    await assert.rejects(validateWorkflowResult(directory, { ...ready(), checks: {} }), /match requested/);
    const check = ready().checks['details-screen'];
    for (const evidence of [[], ['instructions.md'], ['receipts/0002.json']]) {
      await assert.rejects(validateWorkflowResult(directory, { ...ready(), checks: { 'details-screen': { ...check, evidence } } }), /UI observation receipt/);
    }
    await assert.rejects(validateWorkflowResult(directory, { ...ready(), checks: { 'details-screen': { ...check, status: 'unresolved' } } }), /Ready requires route check/);
    await assert.rejects(validateWorkflowResult(directory, { ...ready(), unresolved: ['Unknown route step'] }), /unresolved/);
    await receipt(directory, '0004', 'observation', ['snapshot'], 1);
    await assert.rejects(validateWorkflowResult(directory, { ...ready(), checks: { 'details-screen': { ...check, evidence: ['receipts/0004.json'] } } }), /UI observation receipt/);
    await writeFile(join(directory, 'receipts/0005.pending'), '{}');
    await assert.rejects(validateWorkflowResult(directory, ready()), /interrupted dispatch/);
    await rm(join(directory, 'receipts/0005.pending'));
    await rm(join(directory, 'details.xml'));
    await assert.rejects(validateWorkflowResult(directory, ready()), /ENOENT/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('optional supporting videos require complete capture and matching bytes', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    await routeEvidence(directory);
    await mkdir(join(directory, 'capture-0004'));
    await writeFile(join(directory, 'capture-0004/video.mp4'), 'Synthetic video bytes');
    const result = ready();
    result.checks['details-screen'].evidence.push('capture-0004/video.mp4');
    const manifest = { status: 'complete', artifacts: [{ kind: 'video', path: 'video.mp4', sha256: await sha256(join(directory, 'capture-0004/video.mp4')) }] };
    for (const value of [{ ...manifest, status: 'partial' }, { ...manifest, artifacts: [] }, manifest]) {
      await writeFile(join(directory, 'capture-0004/manifest.json'), JSON.stringify(value));
      if (value === manifest) assert.equal((await validateWorkflowResult(directory, result)).status, 'ready');
      else await assert.rejects(validateWorkflowResult(directory, result), /complete manifest/);
    }
    await writeFile(join(directory, 'capture-0004/video.mp4'), 'Changed bytes');
    await assert.rejects(validateWorkflowResult(directory, result), /matching hash/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('action holds are explicit, bounded and apply to commands and finish', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    await documents(directory);
    await receipt(directory, '0001', 'action', ['click'], 1, { holdMs: 60000 });
    await assert.rejects(stepWorkflow(directory, { kind: 'observation', args: ['snapshot'], reason: 'Too soon', evidence: [] }), /requested action hold/);
    await assert.rejects(finishWorkflow(directory, blocked()), /requested action hold/);
    const saved = JSON.parse(await readFile(join(directory, 'receipts/0001.json'), 'utf8'));
    saved.finishedAt = new Date(Date.now() - 60001).toISOString();
    await writeFile(join(directory, 'receipts/0001.json'), JSON.stringify(saved));
    assert.equal((await finishWorkflow(directory, blocked())).status, 'blocked');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

function legacyInput() {
  const { routeChecks: _, ...rest } = input;
  return { ...rest, schemaVersion: 1, budget: { ...rest.budget, calibrationTrials: 2 }, calibrationAuthorization: { totalTrials: 4, basis: 'Explicit previous renewal' } };
}

test('legacy reservations and explicit authorization survive version 2 continuation', async () => {
  const f = await fixture();
  try {
    const old = join(f.run, 'exploration/workflow-legacy');
    await mkdir(join(old, 'receipts'), { recursive: true });
    await writeFile(join(old, 'execution.json'), JSON.stringify(legacyInput()));
    for (const id of ['0001', '0002', '0003']) await writeFile(join(old, `receipts/${id}.pending`), JSON.stringify({ kind: 'trial' }));
    await assert.rejects(startWorkflow(f.run, input), /Carry forward/);
    await assert.rejects(startWorkflow(f.run, legacyInput()), /version 2/);
    const { directory } = await startWorkflow(f.run, { ...input, attemptBudget: { total: 4, basis: 'Carry forward the previous explicit renewal' } });
    const execution = JSON.parse(await readFile(join(directory, 'execution.json'), 'utf8'));
    assert.equal(execution.attemptHistory.count, 3);
    assert.deepEqual(execution.attemptHistory.budgets, [{ total: 4, basis: 'Explicit previous renewal' }]);
    await assert.rejects(stepWorkflow(directory, { kind: 'action', args: ['click'], reason: 'No attempt reserved', evidence: ['instructions.md'] }), /Reserve an attempt/);
    const marker = { kind: 'attempt', args: [], reason: 'Last authorized attempt', evidence: [] };
    await stepWorkflow(directory, marker);
    await assert.rejects(stepWorkflow(directory, marker), /exhausted across case/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('legacy results retain version 1 readiness semantics and cannot be resumed as version 2', async () => {
  const f = await fixture();
  try {
    const { directory } = await startWorkflow(f.run, input);
    await routeEvidence(directory);
    const current = JSON.parse(await readFile(join(directory, 'execution.json'), 'utf8'));
    await writeFile(join(directory, 'execution.json'), JSON.stringify({ ...current, ...legacyInput() }));
    await writeFile(join(directory, 'handoff.md'), 'Historical case handoff');
    const result = { ...ready(), schemaVersion: 1, handoff: 'handoff.md' };
    await assert.rejects(validateWorkflowResult(directory, result), /Expected object/); // Generic checks cannot reinterpret old readiness.
    await assert.rejects(validateWorkflowResult(directory, ready()), /version differs/);
    await assert.rejects(stepWorkflow(directory, { kind: 'observation', args: ['snapshot'], reason: 'Cannot resume', evidence: [] }), /read-only/);
    await assert.rejects(finishWorkflow(directory, result), /read-only/);
    assert.equal((await validateWorkflowResult(directory, { ...result, status: 'blocked', blockers: ['Historical blocker'] })).status, 'blocked');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
