import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
export type CheckCommand = 'check-all' | 'check-signatures' | 'check-reviewdog' | 'pr-ready';
export interface CheckOptions { base: string; full: boolean }

export function parseCheckOptions(args: string[], command: CheckCommand): CheckOptions {
  const options = { base: 'origin/main', full: false };
  while (args.length) {
    const arg = args.shift();
    if (arg === '--base' && args[0] && !args[0].startsWith('-')) options.base = args.shift()!;
    else if (arg === '--full' && command === 'check-reviewdog') options.full = true;
    else throw new Error(`Unknown or incomplete check option: ${arg}`);
  }
  return options;
}

export function gitEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  // Directory and index overrides must never redirect checks to the caller's Git state.
  return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('GIT_')));
}

export function git(root: string, args: string[]): string {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: gitEnvironment() });
  if (result.error || result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trimEnd();
}

export function mergeBase(root: string, base: string): string {
  if (git(root, ['rev-parse', '--is-shallow-repository']) === 'true') {
    throw new Error('Checks require full Git history; fetch with --unshallow before retrying.');
  }
  const commit = git(root, ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]);
  return git(root, ['merge-base', 'HEAD', commit]);
}

export function checkSignatures(root: string, base: string, strict: boolean, log = console.log): number {
  const ancestor = mergeBase(root, base);
  const commits = git(root, ['rev-list', '--reverse', `${ancestor}..HEAD`]).split('\n').filter(Boolean);
  let problems = 0;
  for (const commit of commits) {
    // %G? distinguishes unsigned commits from invalid or locally unverifiable signatures.
    const result = git(root, ['show', '-s', '--format=%G?%n%s', commit]);
    const [status, ...subject] = result.split('\n');
    if (status === 'G') continue;
    problems++;
    const reason = status === 'N' ? 'unsigned' : status === 'B' ? 'invalid signature' :
      status === 'U' ? 'valid signature with unknown trust' :
      status === 'X' || status === 'Y' || status === 'R' ? 'expired or revoked signature/key' :
      'signature cannot be verified locally (check keys and Git trust configuration)';
    log(`${strict ? 'FAIL' : 'WARNING'}: ${commit.slice(0, 12)} ${reason}: ${subject.join(' ')}`);
  }
  log(`Signatures: ${commits.length} branch commit(s), ${problems} problem(s); base ${base} (${ancestor.slice(0, 12)}).`);
  return strict && problems ? 1 : 0;
}

export function runCheck(command: string, args: string[], root = repositoryRoot): number {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}

export async function runChecks(command: CheckCommand, options: CheckOptions, dependencies = {
  root: repositoryRoot,
  run: runCheck,
  signatures: checkSignatures,
  scan: async (root: string, options: CheckOptions) => (await import('./reviewdog.ts')).checkReviewdog(root, options),
}): Promise<number> {
  if (command === 'check-signatures') return dependencies.signatures(dependencies.root, options.base, true);
  if (command === 'check-reviewdog') return dependencies.scan(dependencies.root, options);
  let failed = false;
  // Continue independent checks, preserving every failure, including a missing base ref.
  const checks = [
    () => dependencies.run('npm', ['--prefix', 'node', 'run', 'check'], dependencies.root),
    () => dependencies.run('npm', ['--prefix', 'node', 'run', 'lint:lockfile'], dependencies.root),
    () => dependencies.signatures(dependencies.root, options.base, command === 'pr-ready'),
    () => dependencies.scan(dependencies.root, options),
  ];
  for (const check of checks) {
    try { if (await check() !== 0) failed = true; }
    catch (error) { console.error(error instanceof Error ? error.message : String(error)); failed = true; }
  }
  return failed ? 1 : 0;
}
