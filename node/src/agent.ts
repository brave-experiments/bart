import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { join, relative, isAbsolute, sep } from 'node:path';
import { agentArgs, parseAgentOutput, type AgentOutput } from './agent-adapters.ts';
import { agentProcess } from './agent-process.ts';
import { casePaths, runPaths, type Config } from './config.ts';

export interface AgentTask {
  caseId: string;
  instructions: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

export async function runAgent(config: Config, task: AgentTask, env: NodeJS.ProcessEnv = process.env) {
  if (!task.instructions.trim()) throw new Error('Agent instructions must not be empty');
  if (!Number.isSafeInteger(task.timeoutMs) || task.timeoutMs < 1 || task.timeoutMs > 2_147_483_647) {
    throw new Error('timeoutMs must be an integer between 1 and 2147483647');
  }
  // Check each existing ancestor before creating children so case symlinks cannot redirect writes.
  const workDir = await realpath(config.workDir);
  const runsDir = casePaths(config, task.caseId).runsDir;
  let directory = workDir;
  const relativeRuns = relative(workDir, runsDir);
  if (relativeRuns === '..' || relativeRuns.startsWith(`..${sep}`) || isAbsolute(relativeRuns)) throw new Error('Runs must be inside BART_WORK_DIR');
  for (const segment of relativeRuns.split(sep)) {
    directory = join(directory, segment);
    try { await mkdir(directory, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    const actual = await realpath(directory);
    if (actual !== directory) throw new Error('Case and run directories must not use symlinks');
  }
  const runId = `${new Date().toISOString().replace(/[^0-9TZ]/g, '')}-${randomUUID()}`;
  const paths = runPaths(config, task.caseId, runId);
  await mkdir(paths.directory, { mode: 0o700 });
  const args = agentArgs(config.agent, paths.directory);
  const startedAt = new Date().toISOString();
  const record = {
    schema: 1, kind: 'agent-prototype', agent: config.agent, runId, caseId: task.caseId,
    startedAt, timeoutMs: task.timeoutMs, modelSelection: 'agent-default',
    args, instructions: 'instructions.txt', stdout: 'stdout.log', stderr: 'stderr.log', reply: 'reply.txt',
  };
  await writeFile(join(paths.directory, record.instructions), task.instructions, { flag: 'wx', mode: 0o600 });
  const save = (value: unknown) => writeFile(paths.record, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await save({ ...record, status: 'running' });
  let output: AgentOutput;
  let exitCode: number | null = null;
  let signal: NodeJS.Signals | null = null;
  let version: string | null = null;
  try {
    const childEnv = { ...env, ...config.childEnv, PWD: paths.directory };
    const probe = spawnSync(config.agent, ['--version'], {
      cwd: paths.directory, env: childEnv, encoding: 'utf8', timeout: 10_000, killSignal: 'SIGKILL',
      maxBuffer: 64 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (probe.error || probe.status !== 0 || !probe.stdout.trim()) {
      throw new Error(`Cannot read ${config.agent} version: ${probe.error?.message ?? probe.stderr.trim() ?? probe.status}`);
    }
    version = probe.stdout.trim();
    const result = await agentProcess({
      executable: config.agent, args, cwd: paths.directory, env: childEnv,
      instructions: task.instructions, timeoutMs: task.timeoutMs, signal: task.signal,
    });
    exitCode = result.exitCode;
    signal = result.signal;
    output = parseAgentOutput(config.agent, result.stdout);
    if (result.stopped) output = { ...output, status: result.stopped, detail: result.detail };
    else if (exitCode !== 0 || signal) output = { ...output, status: output.status === 'blocked' ? 'blocked' : 'failed', detail: `Agent exited with ${signal ?? exitCode}` };
  } catch (error) {
    output = { status: 'failed', reply: '', detail: (error as Error).message };
  }
  await writeFile(join(paths.directory, record.reply), output.reply, { mode: 0o600 });
  const { reply: _reply, ...execution } = output;
  await save({ ...record, ...execution, version, exitCode, signal, endedAt: new Date().toISOString() });
  return { ...output, runDir: paths.directory, recordPath: paths.record };
}
