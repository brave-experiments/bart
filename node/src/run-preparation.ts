import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { casePaths, type Config } from './config.ts';

export const checkIds = ['build-provenance', 'device', 'operator', 'agent-integration', 'recording',
  'installed-package', 'active-package', 'starting-conditions', 'case-prerequisites'] as const;
type CheckId = typeof checkIds[number];
interface Check {
  status: 'pass' | 'fail' | 'unknown'; observedAt: string | null; method: string;
  detail: string; nextAction: string | null; evidence: string[];
}
interface Build {
  path: string; origin: string; relationship: 'exact-pr-head' | 'containing-release' | 'unresolved';
  sourceRevision: string | null; evidence: string[]; expectedSha256?: string;
}
interface Input {
  schemaVersion: 1;
  target: { deviceId: string | null; packageId: string | null; operatorPackage: string | null };
  authority: { allowedActions: string[]; reset: 'not-authorized' | 'authorized'; basis: string };
  build: Build | null;
  checks: Partial<Record<CheckId, Check>>;
  observations: {
    androidVersion: string | null; braveVersion: string | null; chromiumVersion: string | null;
    activePackage: string | null; settingsVariant: 'disabled' | 'enabled' | null;
    settings: string[]; performedActions: string[];
  };
}
interface RunRecord extends Omit<Input, 'build' | 'checks'> {
  kind: 'run-preparation'; runId: string; caseId: string; createdAt: string; completedAt: string;
  objective: string; caseTarget: string; inputSha256: string; package: { path: string; manifestSha256: string };
  build: (Build & { sha256: string }) | null; checks: { [K in CheckId]: Check };
  evidence: { [path: string]: string }; status: 'ready' | 'blocked'; blockers: string[]; unknowns: string[];
  handoff: { plan: string; recheck: string[]; next: string };
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown): { [key: string]: any } {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected an object');
  return value;
}
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function nullableText(value: unknown) { return value === null || text(value); }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(text); }
function timestamp(value: unknown) { return text(value) && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)); }
function digest(value: unknown) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
function safeRelative(path: string) {
  requireValue(text(path) && !isAbsolute(path) && !path.includes('\\') && path.split('/').every(p => p && p !== '.' && p !== '..'), `Unsafe relative path: ${path}`);
}
function validateInput(value: unknown, saved = false): Input {
  const input = object(value);
  requireValue(input.schemaVersion === 1, 'Expected schemaVersion 1');
  const target = object(input.target);
  for (const key of ['deviceId', 'packageId', 'operatorPackage']) requireValue(nullableText(target[key]), `Invalid target.${key}`);
  for (const key of ['packageId', 'operatorPackage']) requireValue(target[key] === null || /^[a-zA-Z][\w]*(?:\.[\w]+)+$/.test(target[key]), `Invalid target.${key}`);
  const authority = object(input.authority);
  requireValue(strings(authority.allowedActions) && ['not-authorized', 'authorized'].includes(authority.reset) && text(authority.basis), 'Invalid setup authority');
  const observations = object(input.observations);
  for (const key of ['androidVersion', 'braveVersion', 'chromiumVersion', 'activePackage']) requireValue(nullableText(observations[key]), `Invalid observations.${key}`);
  requireValue([null, 'disabled', 'enabled'].includes(observations.settingsVariant) && strings(observations.settings) && strings(observations.performedActions), 'Invalid starting conditions');
  if (input.build !== null) {
    const build = object(input.build);
    requireValue(text(build.path) && isAbsolute(build.path) && text(build.origin), 'Build needs an absolute APK path and origin');
    requireValue(['exact-pr-head', 'containing-release', 'unresolved'].includes(build.relationship), 'Invalid build relationship');
    requireValue(build.sourceRevision === null || (typeof build.sourceRevision === 'string' && /^[a-f0-9]{40}$/.test(build.sourceRevision)), 'Invalid source revision');
    requireValue(strings(build.evidence), 'Build evidence must be an array');
    requireValue(build.relationship === 'unresolved' || (build.sourceRevision && build.evidence.length), 'Resolved provenance needs a revision and evidence');
    requireValue(build.expectedSha256 === undefined || digest(build.expectedSha256), 'Invalid expectedSha256');
  }
  const checks = object(input.checks);
  for (const [id, raw] of Object.entries(checks)) {
    requireValue(checkIds.includes(id as CheckId), `Unknown check: ${id}`);
    const check = object(raw);
    requireValue(['pass', 'fail', 'unknown'].includes(check.status), `Invalid status: ${id}`);
    requireValue(text(check.method) && text(check.detail) && strings(check.evidence), `Invalid check: ${id}`);
    requireValue(check.observedAt === null || timestamp(check.observedAt), `Invalid observation time: ${id}`);
    requireValue(check.status === 'pass' ? timestamp(check.observedAt) && check.evidence.length && check.nextAction === null : text(check.nextAction), `Check needs evidence/time or next action: ${id}`);
    if (check.observedAt) requireValue(Date.parse(check.observedAt) <= Date.now() + 60_000, `Future observation: ${id}`);
  }
  const paths = [...Object.values(checks).flatMap(c => c.evidence), ...(input.build?.evidence ?? [])];
  for (const path of paths) {
    if (saved) { safeRelative(path); requireValue(path.startsWith('preparation/evidence/'), 'Evidence must be retained in preparation/evidence'); }
    else requireValue(isAbsolute(path), 'Input evidence paths must be absolute');
  }
  return input as Input;
}
export async function sha256(path: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
async function regularFile(path: string) {
  requireValue((await lstat(path)).isFile(), `Expected a regular file: ${path}`);
}
async function realDirectory(path: string) {
  requireValue((await lstat(path)).isDirectory() && await realpath(path) === resolve(path), `Directory must not use symlinks: ${path}`);
}
async function inventory(root: string, prefix = ''): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await inventory(root, path));
    else { requireValue(entry.isFile(), `Snapshot contains a non-regular file: ${path}`); result.push(path); }
  }
  return result.sort();
}
async function verifyPackage(directory: string, caseId: string) {
  await realDirectory(directory);
  await regularFile(join(directory, 'manifest.json'));
  const manifest = object(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')));
  requireValue(manifest.schemaVersion === 1 && manifest.caseId === caseId && manifest.status === 'prepared-for-attempt', 'Invalid frozen manifest');
  const files = object(manifest.files);
  requireValue(['case.json', 'test-plan.md'].every(name => name in files) && Object.keys(files).some(name => name.startsWith('context/')), 'Incomplete frozen package');
  requireValue(JSON.stringify((await inventory(directory)).filter(p => p !== 'manifest.json')) === JSON.stringify(Object.keys(files).sort()), 'Frozen file set differs from manifest');
  for (const [name, hash] of Object.entries(files)) {
    safeRelative(name);
    requireValue(digest(hash) && await sha256(join(directory, name)) === hash, `Frozen hash mismatch: ${name}`);
  }
  const identity = object(JSON.parse(await readFile(join(directory, 'case.json'), 'utf8')));
  requireValue([1, 2].includes(identity.schemaVersion) && identity.caseId === caseId && identity.status === 'prepared-for-attempt' && ['fix-verification', 'issue-reproduction'].includes(identity.objective) && text(identity.target), 'Invalid frozen case identity');
  return { identity, files: Object.keys(files), manifestSha256: await sha256(join(directory, 'manifest.json')) };
}
function readiness(input: Input) {
  const checks = {} as RunRecord['checks'];
  for (const id of checkIds) checks[id] = input.checks[id] ?? {
    status: 'unknown', observedAt: null, method: 'Not observed', detail: `${id} has not been established.`,
    nextAction: `Gather and assess ${id} evidence using the saved plan.`, evidence: [],
  };
  const missing = (id: CheckId, reason: string) => {
    if (checks[id].status === 'pass') throw new Error(`${id} cannot pass: ${reason}`);
  };
  if (!input.build || input.build.relationship === 'unresolved') missing('build-provenance', 'binary or source relationship unresolved');
  if (!input.target.deviceId || !input.observations.androidVersion) missing('device', 'device or Android identity missing');
  if (!input.target.operatorPackage) missing('operator', 'Operator package missing');
  if (!input.target.packageId || !input.build || !input.observations.braveVersion || !input.observations.chromiumVersion) missing('installed-package', 'build, package or versions missing');
  if (!input.target.packageId || input.target.packageId !== input.observations.activePackage) missing('active-package', 'active package differs or is unknown');
  if (!input.observations.settings.length) missing('starting-conditions', 'settings are unobserved');
  const blockers = checkIds.filter(id => checks[id].status !== 'pass').map(id => `${id}: ${checks[id].detail} Next: ${checks[id].nextAction}`);
  return { checks, blockers, unknowns: checkIds.filter(id => checks[id].status === 'unknown').map(id => `${id}: ${checks[id].detail}`), status: blockers.length ? 'blocked' as const : 'ready' as const };
}

function retainedEvidencePath(path: string, index: number) {
  return `preparation/evidence/${index}-${basename(path).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function validateInputConsistency(record: RunRecord, receipt: Input) {
  const normalized = { ...receipt, checks: readiness(receipt).checks };
  const imported = new Map<string, string>();
  const retain = (path: string) => {
    if (!imported.has(path)) imported.set(path, retainedEvidencePath(path, imported.size));
    return imported.get(path)!;
  };
  for (const check of Object.values(normalized.checks)) check.evidence = check.evidence.map(retain);
  if (normalized.build && record.build) {
    normalized.build = { ...normalized.build, path: record.build.path,
      evidence: normalized.build.evidence.map(retain) };
  }
  const savedBuild = record.build ? { ...record.build } : null;
  if (savedBuild) delete (savedBuild as Partial<NonNullable<RunRecord['build']>>).sha256;
  for (const key of ['schemaVersion', 'target', 'authority', 'observations', 'checks', 'build'] as const) {
    requireValue(isDeepStrictEqual(normalized[key], key === 'build' ? savedBuild : record[key]), `Run ${key} differs from preserved input`);
  }
  requireValue(isDeepStrictEqual(Object.keys(record.evidence).sort(), [...imported.values()].sort()), 'Evidence inventory differs from preserved input');
}

export async function prepareRun(config: Config, caseId: string, raw: unknown) {
  const input = validateInput(structuredClone(raw));
  const state = readiness(input);
  const paths = casePaths(config, caseId);
  await realDirectory(config.casesDir);
  await realDirectory(paths.directory);
  const source = join(paths.directory, 'first-pass');
  const frozen = await verifyPackage(source, caseId);
  if (frozen.identity.target.endsWith('/39794') && state.checks['starting-conditions'].status === 'pass') requireValue(input.observations.settingsVariant !== null, '#39794 needs one current settings variant');
  if (input.build?.relationship === 'exact-pr-head') requireValue(input.build.sourceRevision === frozen.identity.revisions?.head, 'Exact PR build revision differs from frozen PR head');
  // Validate files before allocating a run. A failed copy leaves a partial run for inspection.
  for (const path of [...Object.values(input.checks).flatMap(c => c.evidence), ...(input.build?.evidence ?? []), ...(input.build ? [input.build.path] : [])]) await regularFile(path);
  if (input.build?.expectedSha256) requireValue(await sha256(input.build.path) === input.build.expectedSha256, 'APK digest does not match expectedSha256');
  try { await mkdir(paths.runsDir); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  await realDirectory(paths.runsDir);
  const createdAt = new Date().toISOString();
  const runId = `${createdAt.replace(/[^0-9TZ]/g, '')}-${randomUUID()}`;
  const directory = join(paths.runsDir, runId);
  await mkdir(directory, { mode: 0o700 });
  await mkdir(join(directory, 'preparation/evidence'), { recursive: true });
  const snapshot = join(directory, 'preparation/package');
  await mkdir(snapshot);
  for (const name of [...frozen.files, 'manifest.json']) {
    const destination = join(snapshot, name);
    await mkdir(resolve(destination, '..'), { recursive: true });
    await copyFile(join(source, name), destination);
  }
  requireValue((await verifyPackage(snapshot, caseId)).manifestSha256 === frozen.manifestSha256, 'Manifest changed during snapshot');
  await writeFile(join(directory, 'preparation/input.json'), JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
  const evidence: RunRecord['evidence'] = {};
  const imported = new Map<string, string>();
  async function retain(path: string) {
    if (imported.has(path)) return imported.get(path)!;
    const name = retainedEvidencePath(path, imported.size);
    await copyFile(path, join(directory, name));
    evidence[name] = await sha256(join(directory, name));
    imported.set(path, name);
    return name;
  }
  async function retainAll(paths: string[]) {
    const retained: string[] = [];
    for (const path of paths) retained.push(await retain(path));
    return retained;
  }
  for (const check of Object.values(state.checks)) check.evidence = await retainAll(check.evidence);
  let build: RunRecord['build'] = null;
  if (input.build) {
    const hash = await sha256(input.build.path);
    // The shared cache is content addressed; never replace existing bytes.
    for (const path of [join(config.workDir, 'cache'), config.apkCacheDir]) {
      try { await mkdir(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      await realDirectory(path);
    }
    const artifact = join(config.apkCacheDir, `${hash}.apk`);
    try { await copyFile(input.build.path, artifact, constants.COPYFILE_EXCL); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    await regularFile(artifact);
    requireValue(await sha256(artifact) === hash, 'Cached APK hash mismatch');
    requireValue(!input.build.expectedSha256 || hash === input.build.expectedSha256, 'APK changed during preparation');
    build = { ...input.build, path: artifact, sha256: hash, evidence: await retainAll(input.build.evidence) };
  }
  const record: RunRecord = {
    ...input, ...state, build, schemaVersion: 1, kind: 'run-preparation', runId, caseId, createdAt,
    inputSha256: await sha256(join(directory, 'preparation/input.json')),
    completedAt: new Date().toISOString(), objective: frozen.identity.objective, caseTarget: frozen.identity.target,
    package: { path: 'preparation/package', manifestSha256: frozen.manifestSha256 }, evidence,
    handoff: { plan: 'preparation/package/test-plan.md', recheck: checkIds.filter(id => id !== 'build-provenance'),
      next: state.status === 'ready' ? 'Recheck mutable conditions, then begin Phase 3 workflow development.' : 'Resolve the listed blockers and create a new preparation; preserve this attempt.' },
  };
  await validateRecord(directory, record);
  await writeFile(join(directory, 'preparation.md'), renderSummary(record), { flag: 'wx' });
  // Publish readiness last, after all retained files and the summary exist.
  await writeFile(join(directory, 'run.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  return { status: record.status, runDir: directory, recordPath: join(directory, 'run.json'), blockers: record.blockers };
}

function renderSummary(record: RunRecord) {
  return `# Preparation: ${record.status}\n\nCase: ${record.caseId}\nObjective: ${record.objective}\nPrepared: ${record.completedAt}\n\nThis is preparation readiness, not a product verdict.\n\n[Saved plan](${record.handoff.plan}) · [Run record](run.json) · [Manifest](preparation/package/manifest.json)\n\nBuild: ${record.build ? `${record.build.path} (${record.build.sha256}); ${record.build.relationship}; ${record.build.origin}` : 'Unknown; no binary supplied.'}\nTarget: ${record.target.deviceId ?? 'unknown'} / ${record.target.packageId ?? 'unknown'}.\nAndroid: ${record.observations.androidVersion ?? 'unknown'}; Brave: ${record.observations.braveVersion ?? 'unknown'}; Chromium: ${record.observations.chromiumVersion ?? 'unknown'}.\nCurrent settings variant: ${record.observations.settingsVariant ?? 'unknown'}.\nReset: ${record.authority.reset}. ${record.authority.basis}\n\n${checkIds.map(id => `- **${id}: ${record.checks[id].status}**. ${record.checks[id].detail} ${record.checks[id].nextAction ?? ''} ${record.checks[id].evidence.map(p => `[Evidence](${p})`).join(' ')}`).join('\n')}\n\n${record.handoff.next}\nRecheck before execution: ${record.handoff.recheck.join(', ')}.\n`;
}

export async function validateRun(directory: string) {
  directory = resolve(directory);
  await realDirectory(directory);
  await regularFile(join(directory, 'run.json'));
  await regularFile(join(directory, 'preparation.md'));
  const record = JSON.parse(await readFile(join(directory, 'run.json'), 'utf8'));
  const result = await validateRecord(directory, record);
  requireValue(await readFile(join(directory, 'preparation.md'), 'utf8') === renderSummary(record), 'Preparation summary differs from run record');
  return result;
}

async function validateRecord(directory: string, value: unknown) {
  const raw = object(value);
  const input = validateInput(raw, true);
  requireValue(raw.kind === 'run-preparation' && text(raw.runId) && text(raw.caseId) && timestamp(raw.createdAt) && timestamp(raw.completedAt), 'Invalid run identity');
  requireValue(Date.parse(raw.completedAt) >= Date.parse(raw.createdAt), 'Completion precedes creation');
  requireValue(raw.package?.path === 'preparation/package' && digest(raw.package.manifestSha256), 'Invalid package reference');
  const frozen = await verifyPackage(join(directory, raw.package.path), raw.caseId);
  requireValue(frozen.manifestSha256 === raw.package.manifestSha256 && raw.objective === frozen.identity.objective && raw.caseTarget === frozen.identity.target, 'Run identity differs from frozen package');
  requireValue(checkIds.every(id => id in input.checks), 'Missing readiness checks');
  if (raw.caseTarget.endsWith('/39794') && input.checks['starting-conditions']?.status === 'pass') requireValue(input.observations.settingsVariant !== null, '#39794 needs one current settings variant');
  if (input.build?.relationship === 'exact-pr-head') requireValue(input.build.sourceRevision === frozen.identity.revisions?.head, 'Exact PR build revision differs from frozen PR head');
  const expected = readiness(input);
  for (const key of ['status', 'blockers', 'unknowns'] as const) requireValue(JSON.stringify(raw[key]) === JSON.stringify(expected[key]), `Inconsistent ${key}`);
  await regularFile(join(directory, 'preparation/input.json'));
  requireValue(digest(raw.inputSha256) && await sha256(join(directory, 'preparation/input.json')) === raw.inputSha256, 'Input hash mismatch');
  const receipt = validateInput(JSON.parse(await readFile(join(directory, 'preparation/input.json'), 'utf8')));
  validateInputConsistency(raw as RunRecord, receipt);
  const evidence = object(raw.evidence);
  for (const [path, hash] of Object.entries(evidence)) {
    safeRelative(path);
    requireValue(path.startsWith('preparation/evidence/') && digest(hash), 'Invalid evidence entry');
    requireValue(await realpath(join(directory, path)) === join(directory, path), 'Evidence must not use symlinks');
    await regularFile(join(directory, path));
    requireValue(await sha256(join(directory, path)) === hash, `Evidence hash mismatch: ${path}`);
  }
  for (const path of [...Object.values(input.checks).flatMap(c => c.evidence), ...(input.build?.evidence ?? [])]) requireValue(path in evidence, `Unretained evidence: ${path}`);
  if (input.build) {
    requireValue(digest(raw.build.sha256), 'Missing APK hash');
    await regularFile(input.build.path);
    requireValue(await sha256(input.build.path) === raw.build.sha256 && (!input.build.expectedSha256 || input.build.expectedSha256 === raw.build.sha256), 'APK hash mismatch');
  }
  requireValue(raw.handoff?.plan === 'preparation/package/test-plan.md' && JSON.stringify(raw.handoff.recheck) === JSON.stringify(checkIds.filter(id => id !== 'build-provenance')) && text(raw.handoff.next), 'Invalid handoff');
  return { status: raw.status as 'ready' | 'blocked', runId: raw.runId as string };
}
