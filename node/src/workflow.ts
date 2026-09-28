import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, lstat, realpath, unlink } from 'node:fs/promises';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { validateLegacyWorkflowInput, validateLegacyReady, legacyAttemptBudget } from './workflow-v1.ts';
import { sha256, validateRun } from './run-preparation.ts';

function requireValue(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function object(value: unknown): Record<string, any> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Expected object');
  return value as Record<string, any>;
}
async function json(path: string) { return JSON.parse(await readFile(path, 'utf8')); }
async function save(path: string, value: unknown) { await writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
export interface WorkflowInput {
  schemaVersion: 2;
  instructions: string;
  agent: { name: string; mode: 'direct' | 'launched' };
  target: { deviceId: string; packageId: string; operatorPackage: string };
  authority: { allowedActions: string[]; reset: 'not-authorized' | 'authorized'; basis: string };
  routeChecks: string[];
  attemptBudget?: { total: number; basis: string };
  budget: { durationMs: number; actions: number; observations: number };
}
export function validateWorkflowInput(raw: unknown): WorkflowInput {
  const input = object(raw);
  requireValue(input.schemaVersion === 2 && text(input.instructions), 'Expected version 2 and instructions; version 1 is read-only');
  requireValue(text(input.agent?.name) && ['direct', 'launched'].includes(input.agent.mode), 'Missing actual agent/mode');
  for (const key of ['deviceId', 'packageId', 'operatorPackage']) requireValue(text(input.target?.[key]) && /^[\w.:-]+$/.test(input.target[key]), `Invalid target.${key}`);
  requireValue(Array.isArray(input.authority?.allowedActions) && input.authority.allowedActions.every(text) && text(input.authority.basis) && ['authorized', 'not-authorized'].includes(input.authority.reset), 'Invalid authority');
  requireValue(Array.isArray(input.routeChecks) && input.routeChecks.length > 0 && input.routeChecks.every((key: unknown) => text(key) && /^[a-z][a-zA-Z0-9-]*$/.test(key)) && new Set(input.routeChecks).size === input.routeChecks.length, 'Expected distinct routeChecks');
  requireValue(input.calibrationAuthorization === undefined && input.budget?.calibrationTrials === undefined, 'Use attemptBudget for case limits, not version 1 calibration fields');
  for (const [key, max] of Object.entries({ durationMs: 7_200_000, actions: 200, observations: 300 })) {
    requireValue(Number.isInteger(input.budget?.[key]) && input.budget[key] > 0 && input.budget[key] <= max, `Invalid budget.${key}`);
  }
  if (input.attemptBudget !== undefined) {
    requireValue(Number.isSafeInteger(input.attemptBudget.total) && input.attemptBudget.total > 0 && text(input.attemptBudget.basis), 'Invalid attemptBudget');
  }
  return input as WorkflowInput;
}
function validateSavedInput(raw: any) {
  return raw.schemaVersion === 1 ? validateLegacyWorkflowInput(raw) : validateWorkflowInput(raw);
}
async function safeFile(root: string, path: string) {
  requireValue(text(path) && !isAbsolute(path) && !path.includes('\\') && path.split('/').every(p => p && p !== '.' && p !== '..'), 'Unsafe evidence path');
  const full = join(root, path);
  requireValue(await realpath(full) === full && (await lstat(full)).isFile(), 'Evidence must be a regular file without symlinks');
  return full;
}
async function inventory(root: string, prefix = ''): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...await inventory(root, path));
    else { await safeFile(root, path); paths.push(path); }
  }
  return paths.sort();
}
export async function startWorkflow(runDirectory: string, raw: unknown) {
  const input = validateWorkflowInput(raw);
  requireValue(input.agent.mode === 'direct', 'No launched adapter implemented; use explicit direct execution or report a blocker');
  const run = resolve(runDirectory);
  requireValue((await validateRun(run)).status === 'ready', 'Preparation is blocked');
  const preparation = await json(join(run, 'run.json'));
  requireValue(isDeepStrictEqual(input.target, preparation.target) && isDeepStrictEqual(input.authority, preparation.authority), 'Target/authority must match preparation; create a new preparation for changes');
  requireValue(dirname(dirname(run)).endsWith(`/cases/${preparation.caseId}`), 'Expected prepared case/run layout');
  const attemptHistory = await caseAttempts(run);
  requireValue(!attemptHistory.bounded || input.attemptBudget, 'Carry forward the case attemptBudget and authorization; prior limits cannot be omitted');
  const work = dirname(dirname(dirname(dirname(run))));
  const lockDirectory = join(work, 'device-controllers');
  await mkdir(lockDirectory, { recursive: true });
  requireValue(await realpath(lockDirectory) === lockDirectory, 'Controller directory must not use symlinks');
  const directory = join(run, 'exploration', `workflow-${new Date().toISOString().replace(/[:.]/g, '')}-${randomUUID()}`);
  const lock = join(lockDirectory, `${input.target.deviceId}.json`);
  await save(lock, { directory, agent: input.agent, startedAt: new Date().toISOString() });
  try {
    await mkdir(directory, { recursive: true });
    await mkdir(join(directory, 'receipts'));
    await mkdir(join(directory, 'skills'));
    await save(join(directory, 'execution.json'), { ...input, run: '../..', startedAt: new Date().toISOString(), preparationSha256: await sha256(join(run, 'run.json')), attemptHistory, lock });
    await writeFile(join(directory, 'instructions.md'), input.instructions, { flag: 'wx' });
    return { directory, status: 'active' };
  } catch (error) { await unlink(lock); throw error; }
}
const observationCommands = new Set(['snapshot', 'query', 'read', 'wait', 'screenshot', 'doctor', 'version']);
const actionCommands = new Set(['open', 'click', 'type', 'press', 'back', 'close', 'swipe', 'scroll']);
export type SequenceAction = { type: 'click'; x: number; y: number } | { type: 'sleep'; durationMs: number };
export interface WorkflowStep { sequence?: SequenceAction[]; holdMs?: number; kind: 'observation' | 'action' | 'attempt' | 'capture'; args: string[]; reason: string; evidence: string[] }
export function validateWorkflowStep(raw: unknown): WorkflowStep {
  const step = object(raw);
  requireValue(['observation', 'action', 'attempt', 'capture'].includes(step.kind) && text(step.reason), 'Invalid step kind/reason');
  requireValue(Array.isArray(step.args) && step.args.every(text) && Array.isArray(step.evidence) && step.evidence.every(text), 'Invalid step args/evidence');
  if (step.sequence !== undefined) {
    requireValue(step.kind === 'action' && step.args.length === 0, 'Sequence requires action with empty args');
    requireValue(Array.isArray(step.sequence) && step.sequence.length > 0 && step.sequence.length <= 6, 'Sequence needs 1 to 6 actions');
    let clicks = 0; let delay = 0;
    for (const action of step.sequence) {
      const a = object(action);
      if (a.type === 'click') {
        requireValue(Object.keys(a).sort().join(',') === 'type,x,y' && [a.x, a.y].every(v => Number.isInteger(v) && v >= 0 && v <= 10000), 'Invalid sequence coordinate');
        clicks++;
      } else {
        requireValue(a.type === 'sleep' && Object.keys(a).sort().join(',') === 'durationMs,type' && Number.isInteger(a.durationMs) && a.durationMs >= 0 && a.durationMs <= 2000, 'Invalid sequence delay');
        delay += a.durationMs;
      }
    }
    requireValue(clicks > 0 && clicks <= 2 && delay <= 3000, 'Sequence exceeds click or delay limit');
  } else if (step.kind === 'attempt') requireValue(step.args.length === 0, 'Attempt marker has no command');
  else if (step.kind === 'observation') requireValue(observationCommands.has(step.args[0]), 'Unsupported observation');
  else if (step.kind === 'capture') requireValue(step.args[0] === 'evidence' && ['capture', 'video'].includes(step.args[1]), 'Unsupported capture');
  else requireValue(actionCommands.has(step.args[0]), 'Unsupported action');
  requireValue(!step.args.some((arg: string) => /^--(device|device-id|operator-package|output-dir|path|raw-path|session|timeout|log-dir)(=|$)/.test(arg)), 'Target, capture paths and timeout are supplied by the helper');
  if (step.kind === 'action') requireValue(step.evidence.length > 0, 'Actions need current observation evidence');
  if (step.holdMs !== undefined) requireValue(step.kind === 'action' && Number.isInteger(step.holdMs) && step.holdMs >= 0 && step.holdMs <= 60_000, 'Invalid action holdMs');
  return step as WorkflowStep;
}
export function workflowActionCost(step: Pick<WorkflowStep, 'kind' | 'sequence'>): number {
  return step.kind === 'action' ? (step.sequence?.filter(a => a.type === 'click').length ?? 1) : 0;
}
async function caseAttempts(run: string) {
  let count = 0;
  const budgets: { total: number; basis: string }[] = [];
  for (const entry of await readdir(dirname(run), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const exploration = join(dirname(run), entry.name, 'exploration');
    let sessions;
    try { sessions = await readdir(exploration, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    for (const session of sessions) {
      if (!session.isDirectory() || !session.name.startsWith('workflow-')) continue;
      const root = join(exploration, session.name);
      const execution = await json(join(root, 'execution.json'));
      validateSavedInput(execution);
      const budget = execution.schemaVersion === 1 ? legacyAttemptBudget(execution) : execution.attemptBudget;
      if (budget) budgets.push(budget);
      for (const file of await readdir(join(root, 'receipts'))) {
        if (file.endsWith('.pending') && ['trial', 'attempt'].includes((await json(join(root, 'receipts', file))).kind)) count++;
      }
    }
  }
  return { count, bounded: budgets.length > 0, budgets };
}
async function receipts(directory: string) {
  return Promise.all((await readdir(join(directory, 'receipts'))).filter(p => p.endsWith('.json')).sort().map(p => json(join(directory, 'receipts', p))));
}
async function active(directory: string) {
  directory = resolve(directory);
  const execution = await json(join(directory, 'execution.json'));
  validateSavedInput(execution);
  requireValue((await json(execution.lock)).directory === directory, 'Device controller ownership lost');
  requireValue(!(await readdir(directory)).includes('result.json'), 'Workflow already finished');
  return execution;
}
function isUiObservation(receipt: any) {
  return (receipt.kind === 'observation' && ['snapshot', 'query', 'read', 'wait', 'screenshot'].includes(receipt.args[0])) ||
    (receipt.kind === 'capture' && receipt.args[1] === 'capture');
}
async function requireFinalCaptures(directory: string) {
  for (const file of await inventory(directory)) {
    if (!/^capture-[0-9]+\/manifest.json$/.test(file)) continue;
    const manifest = await json(join(directory, file));
    requireValue(!['recording', 'starting', 'finalizing'].includes(manifest.status), 'Stop and finalize capture before finishing');
  }
}
function requireHoldComplete(history: any[]) {
  const action = history.findLast(r => r.kind === 'action');
  requireValue(!action || Date.now() >= Date.parse(action.finishedAt) + (action.holdMs ?? 0), 'Preserve the requested action hold before another command or finish');
}
async function runCommand(args: string[], timeout: number, logs: string) {
  const entry = fileURLToPath(new URL('../node_modules/clawperator/dist/cli/index.js', import.meta.url));
  return new Promise<{ stdout: string; stderr: string; code: number | null; signal: string | null }>((accept) => {
    const child = spawn(process.execPath, [entry, ...args], { env: { ...process.env, CLAWPERATOR_LOG_DIR: logs }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let bytes = 0;
    const collect = (chunk: Buffer, stream: 'stdout' | 'stderr') => {
      bytes += chunk.length;
      if (bytes > 8_000_000) { child.kill('SIGKILL'); return; }
      if (stream === 'stdout') stdout += chunk; else stderr += chunk;
    };
    child.stdout.on('data', c => collect(c, 'stdout')); child.stderr.on('data', c => collect(c, 'stderr'));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.on('error', e => { stderr += e.message; });
    child.on('close', (code, signal) => { clearTimeout(timer); accept({ stdout, stderr, code, signal }); });
  });
}
export async function stepWorkflow(directory: string, raw: unknown) {
  directory = resolve(directory);
  const step = validateWorkflowStep(raw);
  const execution = await active(directory);
  requireValue(execution.schemaVersion === 2, 'Version 1 sessions are read-only; use their preserved implementation to close active work');
  const mutex = join(directory, 'step.lock');
  await writeFile(mutex, '', { flag: 'wx' });
  try {
    await active(directory);
    const previous = await receipts(directory);
    const pending = (await readdir(join(directory, 'receipts'))).filter(p => p.endsWith('.pending'));
    requireValue(pending.length === previous.length, 'Interrupted dispatch: inspect retained pending receipt and stop; never replay automatically');
    const elapsed = Date.now() - Date.parse(execution.startedAt);
    requireValue(elapsed < execution.budget.durationMs, 'Workflow deadline exhausted; finish with a blocker');
    const actions = previous.reduce((sum, receipt) => sum + workflowActionCost(receipt), 0);
    const observations = previous.filter(r => ['observation', 'capture'].includes(r.kind)).length;
    requireValue(actions + workflowActionCost(step) <= execution.budget.actions, 'Action budget exhausted');
    requireValue(!['observation', 'capture'].includes(step.kind) || observations < execution.budget.observations, 'Observation budget exhausted');
    if (step.kind === 'attempt') {
      requireValue(execution.attemptBudget, 'Attempt marker requires attemptBudget');
      requireValue((await caseAttempts(resolve(directory, '../..'))).count < execution.attemptBudget.total, 'Attempt budget exhausted across case runs');
    }
    if (step.kind === 'action' && execution.attemptBudget) requireValue(previous.some(r => r.kind === 'attempt'), 'Reserve an attempt before actions for this bounded case');
    requireHoldComplete(previous);
    for (const path of step.evidence) await safeFile(directory, path);
    if (step.kind === 'action') {
      const last = previous.at(-1);
      requireValue(last && isUiObservation(last) && last.code === 0 && Date.now() - Date.parse(last.finishedAt) < 120_000 && step.evidence.includes(last.receipt), 'Refresh observation before each action; reference its receipt');
    }
    const id = String(previous.length + 1).padStart(4, '0');
    const receipt = `receipts/${id}.json`;
    const args = step.sequence ? ['exec', JSON.stringify({
      commandId: `workflow-${id}-${randomUUID()}`, taskId: 'bart-workflow', source: 'direct',
      expectedFormat: 'android-ui-automator', timeoutMs: Math.min(10000, execution.budget.durationMs - elapsed),
      actions: step.sequence.map((action, index) => ({ id: `step-${index + 1}`, type: action.type, params: action.type === 'click' ? { coordinate: { x: action.x, y: action.y } } : { durationMs: action.durationMs } })),
    })] : [...step.args];
    if (step.kind === 'capture') {
      if (args[1] === 'capture' || args[2] === 'start') args.push('--output-dir', join(directory, `capture-${id}`));
      else {
        const start = previous.findLast(r => r.kind === 'capture' && r.args[2] === 'start');
        requireValue(start, 'No video session');
        const output = JSON.parse(start.stdout);
        const manifest = output.manifestPath ?? output.session?.manifestPath;
        requireValue(text(manifest) && manifest.startsWith(directory + '/'), 'Video start did not return a retained manifest path');
        args.push('--session', manifest);
      }
    }
    if (args[0] === 'screenshot') args.push('--path', join(directory, `screenshot-${id}.png`));
    if (args.length) args.push('--device', execution.target.deviceId, '--operator-package', execution.target.operatorPackage, '--no-daemon');
    const startedAt = new Date().toISOString();
    // Reserve before dispatch: an interrupted command still consumes its budget.
    await save(join(directory, 'receipts', `${id}.pending`), { ...step, args, receipt, startedAt });
    const response = args.length ? await runCommand(args, Math.min(60_000, execution.budget.durationMs - elapsed), join(directory, 'logs')) : { stdout: '', stderr: '', code: 0, signal: null };
    const result = { ...step, args, receipt, startedAt, finishedAt: new Date().toISOString(), ...response };
    await save(join(directory, receipt), result);
    return result;
  } finally { await unlink(mutex); }
}

export async function validateWorkflowResult(directory: string, raw: unknown) {
  const result = object(raw);
  requireValue([1, 2].includes(result.schemaVersion) && ['ready', 'blocked', 'incomplete'].includes(result.status), 'Invalid workflow result');
  requireValue(text(result.summary) && Array.isArray(result.deviations) && result.deviations.every(text) && Array.isArray(result.limits) && result.limits.every(text), 'Missing summary/deviations/limits');
  requireValue(Array.isArray(result.blockers) && result.blockers.every(text) && (result.status !== 'blocked' || result.blockers.length > 0), 'Blocked result needs blockers');
  requireValue(result.productVerdict === 'not-assessed', 'Phase 3 cannot emit a product verdict');
  requireValue(['exercised', 'not-run'].includes(result.adapters?.direct) && result.adapters?.launched === 'not-implemented', 'Report actual execution paths');
  const execution = await json(join(directory, 'execution.json'));
  validateSavedInput(execution);
  requireValue(result.schemaVersion === execution.schemaVersion, 'Result version differs from execution');
  requireValue(isDeepStrictEqual(result.agent, execution.agent), 'Result agent differs from execution');
  requireValue(Array.isArray(result.observations), 'Missing observations');
  for (const observation of result.observations) {
    requireValue(text(observation.claim) && ['observed', 'inferred', 'unknown'].includes(observation.strength) && Array.isArray(observation.evidence) && observation.evidence.length > 0, 'Observation needs strength and evidence');
    for (const path of observation.evidence) await safeFile(directory, path);
  }
  requireValue(result.workflow?.startsWith('skills/'), 'Workflow must be retained under skills/');
  await safeFile(directory, result.workflow);
  if (result.schemaVersion === 1) await safeFile(directory, result.handoff);
  else {
    requireValue(Array.isArray(result.unresolved) && result.unresolved.every(text), 'Missing unresolved checks');
    requireValue(text(await readFile(join(directory, result.workflow), 'utf8')), 'Repeat instructions must not be empty');
  }
  requireValue(Array.isArray(result.dependencies) && result.dependencies.length > 0 && result.dependencies.every(text), 'Missing dependencies/versions');
  const history = await receipts(directory);
  if (result.adapters.direct === 'exercised') {
    requireValue(history.some(r => ['action', 'gear'].includes(r.kind)) && history.some(r => isUiObservation(r)), 'Exercised direct path requires retained actions and observations');
  }
  if (result.schemaVersion === 2) {
    requireValue(isDeepStrictEqual(Object.keys(object(result.checks)).sort(), [...execution.routeChecks].sort()), 'Result checks must match requested routeChecks');
    for (const key of execution.routeChecks) {
      const check = object(result.checks[key]);
      requireValue(['observed', 'unresolved'].includes(check.status) && text(check.detail) && Array.isArray(check.evidence), `Invalid route check ${key}`);
      for (const path of check.evidence) await safeFile(directory, path);
      if (check.status === 'observed') {
        requireValue(check.evidence.some((path: string) => history.some(r => r.receipt === path && r.code === 0 && isUiObservation(r))), `Observed route check ${key} needs a successful UI observation receipt`);
        for (const video of check.evidence.filter((path: string) => path.endsWith('.mp4'))) {
          const manifestPath = await safeFile(directory, join(dirname(video), 'manifest.json'));
          const manifest = await json(manifestPath);
          const artifact = manifest.artifacts?.find((item: any) => item.kind === 'video' && join(dirname(video), item.path) === video);
          requireValue(manifest.status === 'complete' && artifact?.sha256 === await sha256(join(directory, video)), 'Supporting video needs a complete manifest and matching hash');
        }
      }
      if (result.status === 'ready') requireValue(check.status === 'observed', `Ready requires route check ${key}`);
    }
  }
  if (result.status === 'ready') {
    requireValue(result.adapters.direct === 'exercised', 'Ready requires exercised direct execution');
    requireValue(result.blockers.length === 0 && result.observations.length > 0, 'Ready cannot have blockers or lack observations');
    if (result.schemaVersion === 1) {
      await validateLegacyReady(directory, result, history, path => safeFile(directory, path));
    } else {
      requireValue(result.unresolved.length === 0, 'Ready cannot have unresolved checks');
      const actionIndex = history.findIndex(r => r.kind === 'action' && r.code === 0);
      requireValue(actionIndex >= 0 && history.slice(actionIndex + 1).some(r => isUiObservation(r) && r.code === 0), 'Ready requires a successful action followed by a UI observation');
      const pending = (await readdir(join(directory, 'receipts'))).filter(p => p.endsWith('.pending')).map(p => `receipts/${p.replace(/\.pending$/, '.json')}`).sort();
      requireValue(isDeepStrictEqual(pending, history.map(r => r.receipt).sort()), 'Ready cannot contain an interrupted dispatch');
    }
  }
  return result;
}
export async function finishWorkflow(directory: string, raw: unknown) {
  directory = resolve(directory);
  const mutex = join(directory, 'step.lock');
  await writeFile(mutex, '', { flag: 'wx' });
  try {
    const execution = await active(directory);
    requireValue(execution.schemaVersion === 2, 'Version 1 sessions are read-only; use their preserved implementation to close active work');
    requireHoldComplete(await receipts(directory));
    await requireFinalCaptures(directory);
    const result = await validateWorkflowResult(directory, raw);
    await save(join(directory, 'result.json'), result);
    const hashes: Record<string, string> = {};
    for (const path of await inventory(directory)) {
      if (path !== 'step.lock') hashes[path] = await sha256(join(directory, path));
    }
    await save(join(directory, 'manifest.json'), { schemaVersion: 1, files: hashes });
    await unlink(execution.lock);
    return { directory, status: result.status };
  } finally { await unlink(mutex); }
}
export async function validateWorkflow(directory: string) {
  directory = resolve(directory);
  const manifest = object(await json(join(directory, 'manifest.json')));
  requireValue(manifest.schemaVersion === 1, 'Invalid manifest');
  const files = object(manifest.files);
  requireValue(isDeepStrictEqual((await inventory(directory)).filter(p => p !== 'manifest.json'), Object.keys(files).sort()), 'Workflow inventory changed');
  for (const [path, hash] of Object.entries(files)) requireValue(await sha256(await safeFile(directory, path)) === hash, `Workflow hash mismatch: ${path}`);
  const execution = await json(join(directory, 'execution.json'));
  validateSavedInput(execution);
  const run = resolve(directory, '../..');
  await validateRun(run);
  const preparation = await json(join(run, 'run.json'));
  requireValue(isDeepStrictEqual(execution.target, preparation.target) && isDeepStrictEqual(execution.authority, preparation.authority), 'Execution differs from preparation');
  requireValue(execution.preparationSha256 === await sha256(join(run, 'run.json')), 'Preparation changed');
  const result = await validateWorkflowResult(directory, await json(join(directory, 'result.json')));
  return { status: result.status, productVerdict: 'not-assessed' };
}
