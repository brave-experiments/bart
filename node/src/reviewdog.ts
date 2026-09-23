import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import { git, gitEnvironment, mergeBase, type CheckOptions } from './checks.ts';
import { resolveWorkDir } from './config.ts';

const actionRevision = '0e33cb6a9c05ff50538df044f7eda3983084d40c';
const opengrepVersion = '1.30.0';
const reviewdogVersion = '0.17.5';
// Match brave/security-action's binary pins at actionRevision.
const distributions: Record<string, [string, string]> = {
  'darwin-arm64': ['opengrep_osx_arm64', '0f5bc3dec09d995c61331a4017b856ede508f90d95b018d95f1dc6166be89fdd'],
  'linux-x64': ['opengrep_manylinux_x86', '35779bdd72e92129c8df2a77f0c55e8c08356801ea92591ef32108d6b28d564c'],
};

function execute(command: string, args: string[], cwd: string, env = process.env): string {
  const result = spawnSync(command, args, { cwd, env: gitEnvironment(env), timeout: 120_000, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout;
}

async function download(url: string, path: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
}

async function prepareScannerTools(directory: string): Promise<void> {
  const dist = distributions[`${process.platform}-${process.arch}`];
  if (!dist) throw new Error('Security checks currently support macOS arm64 and Linux x64.');
  await mkdir(directory, { recursive: true });
  const opengrep = join(directory, 'opengrep');
  let content: Buffer | undefined;
  try { content = await readFile(opengrep); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (!content || createHash('sha256').update(content).digest('hex') !== dist[1]) {
    const temporary = join(directory, `download-${randomUUID()}`);
    try {
      await download(`https://github.com/opengrep/opengrep/releases/download/v${opengrepVersion}/${dist[0]}`, temporary);
      if (createHash('sha256').update(await readFile(temporary)).digest('hex') !== dist[1]) throw new Error('OpenGrep checksum mismatch');
      await chmod(temporary, 0o755);
      await rename(temporary, opengrep);
    } finally { await rm(temporary, { force: true }); }
  }
  await chmod(opengrep, 0o755);
  // Use an installed, version-checked reviewdog. Installation is explicit in docs and CI.
  if (execute('reviewdog', ['-version'], directory).trim() !== reviewdogVersion) {
    throw new Error(`Install reviewdog ${reviewdogVersion}; see docs/checks.md.`);
  }
  console.log(`Security rules: brave/security-action@${actionRevision}; OpenGrep ${opengrepVersion}; reviewdog ${reviewdogVersion}.`);
}

export async function snapshot(root: string, destination: string): Promise<void> {
  execute('git', ['clone', '--quiet', '--no-hardlinks', '--no-checkout', root, destination], root);
  git(destination, ['checkout', '--quiet', '--detach', git(root, ['rev-parse', 'HEAD'])]);
  const included = new Set(
    git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean),
  );
  const links: string[] = [];
  const sourceRoot = await realpath(root);
  const original = git(destination, ['ls-files', '-z']).split('\0').filter(Boolean);
  for (const file of new Set([...original, ...included])) {
    const source = join(root, file);
    const target = join(destination, file);
    await rm(target, { force: true, recursive: true });
    if (!included.has(file)) continue;
    let stat;
    try { stat = await lstat(source); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    await mkdir(dirname(target), { recursive: true });
    if (stat.isSymbolicLink()) {
      const resolved = relative(sourceRoot, await realpath(source));
      if (resolved === '..' || resolved.startsWith(`..${sep}`)) {
        throw new Error(`Security snapshot rejects links outside the repository: ${file}`);
      }
      await symlink(relative(dirname(target), join(destination, resolved)), target);
      links.push(target);
      continue;
    }
    if (!stat.isFile()) throw new Error(`Security snapshot requires regular files or internal links: ${file}`);
    await copyFile(source, target);
    await chmod(target, stat.mode);
  }
  // Fail if a link points to ignored content that was not copied.
  for (const link of links) await realpath(link);
  // All copied files came from the source index or nonignored untracked files.
  // Preserve force-added ignored files in reviewdog's diff as well.
  git(destination, ['add', '--all', '--force']);
}

export function runnerCommand(command: string, name: string, failureFile: string): string {
  // Upstream formatting discards JSON .errors. Strict mode makes partial parsing
  // and other scan warnings fail before that information is lost.
  if (name === 'opengrep') command = 'opengrep() { command opengrep --strict "$@"; }\n' + command;
  const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
  return `bash -o pipefail -c ${quote(command)}\nstatus=$?\nif [ "$status" -ne 0 ]; then printf '%s\\n' ${quote(name)} >> ${quote(failureFile)}; fi\nexit "$status"`;
}

export async function runRunners(directory: string, assets: string, run: string, base: string, full: boolean, env: NodeJS.ProcessEnv): Promise<number> {
  const config = parse(await readFile(join(assets, 'reviewdog/reviewdog.yml'), 'utf8'));
  const selected = ['opengrep', 'npm-audit'];
  const failures = join(run, 'runner-failures.txt');
  await writeFile(failures, '');
  const runners: Record<string, unknown> = {};
  for (const name of selected) {
    const runner = config.runner?.[name];
    if (!runner || typeof runner.cmd !== 'string') throw new Error(`Missing security runner: ${name}`);
    runners[name] = { ...runner, cmd: runnerCommand(runner.cmd, name, failures) };
  }
  const configPath = join(run, 'reviewdog.json');
  await writeFile(configPath, JSON.stringify({ runner: runners }));
  const files = git(directory, full ? ['ls-files', '-z'] : ['diff', '--name-only', '-z', '--diff-filter=d', base]);
  await writeFile(join(assets, 'all_changed_files.txt'), files);
  let failed = false;
  // Always scan current source without OpenGrep's commit-only baseline. Reviewdog
  // filters the result to the complete branch and working-tree diff.
  // Upstream commands expand SCRIPTPATH unquoted. The sibling run layout keeps
  // this relative path free of spaces inherited from BART_WORK_DIR.
  const childEnv: NodeJS.ProcessEnv = { ...gitEnvironment(env), SCRIPTPATH: relative(directory, assets) };
  delete childEnv.GITHUB_BASE_REF;
  for (const name of selected) {
    console.log(`Security scan: ${name}`);
    const result = spawnSync('reviewdog', ['-reporter=local', `-runners=${name}`, `-conf=${configPath}`,
      ...(full ? ['-filter-mode=nofilter'] : [`-diff=git diff -U0 ${base}`])],
    { cwd: directory, env: childEnv, timeout: 600_000, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    await writeFile(join(run, `${name}.stdout`), result.stdout ?? '');
    await writeFile(join(run, `${name}.stderr`), result.stderr ?? '');
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) console.error(result.error.message);
    if (result.error || result.status !== 0 || result.stdout?.trim()) failed = true;
    let stderr = '';
    try { stderr = await readFile(join(directory, `reviewdog.${name}.stderr.log`), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (stderr.trim()) { console.error(stderr); failed = true; }
  }
  if ((await readFile(failures, 'utf8')).trim()) failed = true;
  console.log(failed ? 'Security check failed; inspect findings and scanner errors.' : 'Security scan completed with no findings in scope.');
  return failed ? 1 : 0;
}

export async function checkReviewdog(root: string, options: CheckOptions): Promise<number> {
  const base = options.full ? '' : mergeBase(root, options.base);
  const work = await resolveWorkDir();
  const runs = join(work, 'cases', 'presubmit', 'runs');
  await mkdir(runs, { recursive: true });
  const run = await mkdtemp(join(runs, `${Date.now()}-`));
  console.log(`Security scan files: ${run}`);
  try {
    const bin = join(work, 'cache', `opengrep-${opengrepVersion}`);
    await prepareScannerTools(bin);
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
    for (const tool of ['bash', 'git', 'jq', 'ruby', 'python3', 'npm']) execute(tool, ['--version'], run, env);
    const action = join(run, 'security-action');
    execute('git', ['init', '--quiet', action], run);
    git(action, ['remote', 'add', 'origin', 'https://github.com/brave/security-action.git']);
    git(action, ['fetch', '--quiet', '--depth=1', 'origin', actionRevision]);
    git(action, ['checkout', '--quiet', '--detach', 'FETCH_HEAD']);
    const source = join(run, 'source');
    await snapshot(root, source);
    console.log(options.full ? 'Scanning the full source tree.' : `Scanning changes from ${options.base} (${base.slice(0, 12)}), including uncommitted files.`);
    return await runRunners(source, join(action, 'assets'), run, base, options.full, env);
  } catch (error) {
    await writeFile(join(run, 'error.txt'), `${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}
