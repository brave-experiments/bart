import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rmdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export type Agent = 'claude' | 'opencode';

export function resolveAgent(env: NodeJS.ProcessEnv = process.env): Agent {
  const agent = env.BART_AGENT ?? 'claude';
  if (agent !== 'claude' && agent !== 'opencode') throw new Error('BART_AGENT must be claude or opencode');
  return agent;
}

export interface Config {
  agent: Agent;
  braveCoreDir: string;
  workDir: string;
  apkCacheDir: string;
  casesDir: string;
  childEnv: { BART_BRAVE_CORE_DIR: string; BART_WORK_DIR: string };
}

function absolutePath(value: string, name: string, home: string | undefined): string {
  if (value === '~' || value.startsWith('~/')) {
    if (!home || !isAbsolute(home)) throw new Error('HOME must be an absolute path to expand ~');
    value = join(home, value.slice(2));
  }
  if (!isAbsolute(value)) throw new Error(`${name} must be an absolute path (or start with ~/)`);
  return value;
}

function git(directory: string, ...args: string[]): string {
  // Ignore inherited Git overrides so validation examines the supplied directory.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function isWithin(parent: string, child: string): boolean {
  const difference = relative(parent, child);
  return difference === '' || (!difference.startsWith(`..${sep}`) && difference !== '..' && !isAbsolute(difference));
}

export async function resolveBraveCoreDir(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  if (!env.BART_BRAVE_CORE_DIR?.trim()) throw new Error('BART_BRAVE_CORE_DIR is required');
  const checkout = absolutePath(env.BART_BRAVE_CORE_DIR, 'BART_BRAVE_CORE_DIR', env.HOME);
  let braveCoreDir: string;
  try {
    braveCoreDir = await realpath(checkout);
    const root = await realpath(git(braveCoreDir, 'rev-parse', '--show-toplevel'));
    const remote = git(braveCoreDir, 'remote', 'get-url', 'origin');
    const manifest = JSON.parse(await readFile(join(braveCoreDir, 'package.json'), 'utf8'));
    if (root !== braveCoreDir || manifest.name !== 'brave-core' ||
        !/^(?:https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)brave\/brave-core(?:\.git)?\/?$/.test(remote)) {
      throw new Error('expected checkout root, brave-core package, and brave/brave-core origin');
    }
  } catch (error) {
    throw new Error(`BART_BRAVE_CORE_DIR is not a Brave Core checkout: ${checkout}`, { cause: error });
  }
  return braveCoreDir;
}

export async function resolveWorkDir(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const work = env.BART_WORK_DIR;
  if (!work?.trim()) {
    throw new Error('BART_WORK_DIR is required; set it to an absolute path in .envrc and load it with direnv allow or source .envrc');
  }
  const requestedWorkDir = absolutePath(work, 'BART_WORK_DIR', env.HOME);
  // Resolve existing ancestors before creating directories, including symlinks.
  let ancestor = resolve(requestedWorkDir);
  const missing: string[] = [];
  while (true) {
    try { ancestor = await realpath(ancestor); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      missing.unshift(basename(ancestor));
      ancestor = dirname(ancestor);
    }
  }
  const workDir = join(ancestor, ...missing);
  // Both node/src and node/dist sit two levels below the repository root.
  const repositoryRoot = await realpath(new URL('../..', import.meta.url));
  let checkout: string | undefined;
  if (env.BART_BRAVE_CORE_DIR?.trim()) {
    checkout = absolutePath(env.BART_BRAVE_CORE_DIR, 'BART_BRAVE_CORE_DIR', env.HOME);
    try { checkout = await realpath(checkout); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  if ((checkout && isWithin(checkout, workDir)) || isWithin(repositoryRoot, workDir)) {
    throw new Error('BART_WORK_DIR must be outside the reference checkout and BART repository');
  }
  try {
    await mkdir(workDir, { recursive: true });
    const probe = await mkdtemp(join(workDir, '.bart-write-check-'));
    await rmdir(probe);
  } catch (error) {
    throw new Error(`BART_WORK_DIR is not writable: ${workDir}`, { cause: error });
  }
  return workDir;
}

export async function resolveConfig(env: NodeJS.ProcessEnv = process.env): Promise<Config> {
  const agent = resolveAgent(env);
  const braveCoreDir = await resolveBraveCoreDir(env);
  const workDir = await resolveWorkDir(env);
  return {
    agent, braveCoreDir, workDir,
    apkCacheDir: join(workDir, 'cache/apks'), casesDir: join(workDir, 'cases'),
    childEnv: { BART_BRAVE_CORE_DIR: braveCoreDir, BART_WORK_DIR: workDir },
  };
}

function segment(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) throw new Error(`Invalid path ID: ${value}`);
  return value;
}

export function casePaths(config: Config, caseId: string) {
  const directory = join(config.casesDir, segment(caseId));
  return { directory, contextDir: join(directory, 'context'), testPlan: join(directory, 'test-plan.md'), runsDir: join(directory, 'runs') };
}

export function runPaths(config: Config, caseId: string, runId: string) {
  const directory = join(casePaths(config, caseId).runsDir, segment(runId));
  return {
    directory, record: join(directory, 'run.json'), skillsDir: join(directory, 'skills'),
    explorationDir: join(directory, 'exploration'), verificationDir: join(directory, 'verification'),
    report: join(directory, 'report.md'),
  };
}
