import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

// Read-only version 1 compatibility. Never apply these case-specific rules to new sessions.
function requireValue(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function object(value: unknown): Record<string, any> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Expected object');
  return value as Record<string, any>;
}
async function json(path: string) { return JSON.parse(await readFile(path, 'utf8')); }
export function validateLegacyWorkflowInput(raw: unknown) {
  const input = object(raw);
  requireValue(input.schemaVersion === 1 && text(input.instructions), 'Expected version 1 and instructions');
  requireValue(text(input.agent?.name) && ['direct', 'launched'].includes(input.agent.mode), 'Missing actual agent/mode');
  for (const key of ['deviceId', 'packageId', 'operatorPackage']) requireValue(text(input.target?.[key]) && /^[\w.:-]+$/.test(input.target[key]), `Invalid target.${key}`);
  requireValue(Array.isArray(input.authority?.allowedActions) && input.authority.allowedActions.every(text) && text(input.authority.basis) && ['authorized', 'not-authorized'].includes(input.authority.reset), 'Invalid authority');
  for (const [key, max] of Object.entries({ durationMs: 7_200_000, actions: 200, observations: 300, calibrationTrials: 2 })) {
    requireValue(Number.isInteger(input.budget?.[key]) && input.budget[key] > 0 && input.budget[key] <= max, `Invalid budget.${key}`);
  }
  if (input.calibrationAuthorization !== undefined) {
    const renewal = object(input.calibrationAuthorization);
    requireValue(Number.isInteger(renewal.totalTrials) && renewal.totalTrials > 2 && renewal.totalTrials <= 10 && text(renewal.basis), 'Invalid calibration authorization');
  }
  return input;
}

export async function validateLegacyReady(directory: string, result: any, history: any[], evidence: (path: string) => Promise<string>) {
  for (const key of ['preconditions', 'actions', 'nativeFullscreen', 'landscapeControls', 'gearTarget', 'captureTransition']) {
    const check = object(result.checks?.[key]);
    requireValue(check.status === 'observed' && text(check.detail) && Array.isArray(check.evidence) && check.evidence.length > 0, `Ready requires ${key} evidence`);
    for (const path of check.evidence) await evidence(path);
  }
  const videos = result.checks.captureTransition.evidence.filter((path: string) => path.endsWith('.mp4'));
  requireValue(videos.length > 0, 'Ready requires retained transition video');
  for (const video of videos) {
    const manifest = await json(join(directory, dirname(video), 'manifest.json'));
    requireValue(manifest.status === 'complete' && manifest.artifacts?.some((artifact: any) => artifact.kind === 'video' && join(dirname(video), artifact.path) === video && artifact.sha256), 'Transition video must have a finalized capture manifest');
  }
  requireValue(history.some(r => r.kind === 'gear' && r.code === 0) && history.some(r => r.kind === 'observation' && r.code === 0), 'Ready requires exercised discovery');
}

export function legacyAttemptBudget(execution: any) {
  validateLegacyWorkflowInput(execution);
  return { total: execution.calibrationAuthorization?.totalTrials ?? 2, basis: execution.calibrationAuthorization?.basis ?? execution.authority.basis };
}
