import { createHash } from 'node:crypto';
import fs, { mkdir, readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateBriefIndex } from './brief-index.ts';
import { validateSourceIndex } from './source-index.ts';
import { casePaths, type Config } from './config.ts';

export type Objective = 'issue-reproduction' | 'fix-verification';

async function requireCasesDirectory(config: Config) {
  if (!(await lstat(config.casesDir)).isDirectory()) {
    throw new Error('Cases directory must be a real directory, not a symlink');
  }
}

export async function createCase(config: Config, caseId: string, target: string, objective: string) {
  if (!/^https:\/\/github\.com\/brave\/(brave-core\/pull|brave-browser\/issues)\/[1-9][0-9]*$/.test(target)) {
    throw new Error('Expected a Brave Core PR or Brave Browser issue URL');
  }
  if (objective !== 'issue-reproduction' && objective !== 'fix-verification') {
    throw new Error('Objective must be issue-reproduction or fix-verification');
  }
  const paths = casePaths(config, caseId);
  await mkdir(config.casesDir, { recursive: true });
  await requireCasesDirectory(config);
  await mkdir(paths.directory); // Never replace an existing case.
  await mkdir(paths.contextDir);
  await writeFile(join(paths.directory, 'case.json'), JSON.stringify({
    schemaVersion: 2, caseId, target, objective, status: 'draft',
    createdAt: new Date().toISOString(),
  }, null, 2) + '\n', { flag: 'wx' });
  return paths;
}

async function files(directory: string, prefix = ''): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await files(directory, path));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Only regular files and directories may be frozen: ${path}`);
  }
  return result.sort();
}

const packageEntries = ['case.json', 'test-plan.md', 'context'];

async function packageFiles(directory: string): Promise<string[]> {
  for (const name of packageEntries) {
    const stat = await lstat(join(directory, name));
    if (name === 'context' ? !stat.isDirectory() : !stat.isFile()) throw new Error(`Invalid package entry: ${name}`);
  }
  return ['case.json', 'test-plan.md', ...(await files(join(directory, 'context'))).map(name => `context/${name}`)].sort();
}

function sameFiles(expected: string[], actual: string[]) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('File set changed during freeze');
}

async function hashes(directory: string, names: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const name of names) {
    if (!(await lstat(join(directory, name))).isFile()) throw new Error(`File type changed during freeze: ${name}`);
    result[name] = createHash('sha256').update(await readFile(join(directory, name))).digest('hex');
  }
  return result;
}

export async function freezeCase(config: Config, caseId: string) {
  const paths = casePaths(config, caseId);
  await requireCasesDirectory(config);
  if (!(await lstat(paths.directory)).isDirectory()) throw new Error('Case must be a real directory');
  const sourceFiles = await packageFiles(paths.directory);
  const record = JSON.parse(await readFile(join(paths.directory, 'case.json'), 'utf8'));
  if (record.schemaVersion !== 2 || record.caseId !== caseId || record.status !== 'prepared-for-attempt' ||
      !['issue-reproduction', 'fix-verification'].includes(record.objective)) {
    throw new Error('case.json must use schemaVersion 2, identify this case and mark it prepared-for-attempt; revise legacy cases under a new ID');
  }
  if (!(await readFile(paths.testPlan, 'utf8')).trim()) throw new Error('Empty test-plan.md');
  const originalHashes = await hashes(paths.directory, sourceFiles);
  await validateBriefIndex(paths.directory, await validateSourceIndex(paths.directory, sourceFiles));
  const destination = join(paths.directory, 'first-pass');
  await mkdir(destination); // A second freeze must fail, even after a partial first attempt.
  for (const name of packageEntries) await fs.cp(join(paths.directory, name), join(destination, name), { recursive: true, errorOnExist: true, force: false });

  // Inspect what was actually copied, including files added during recursive cp.
  const copiedFiles = await files(destination);
  sameFiles(sourceFiles, copiedFiles);
  await packageFiles(destination); // Reject links in the top-level entries too.
  await validateBriefIndex(destination, await validateSourceIndex(destination, copiedFiles));
  const copiedHashes = await hashes(destination, copiedFiles);
  sameFiles(sourceFiles, await packageFiles(paths.directory));
  const finalSourceHashes = await hashes(paths.directory, sourceFiles);
  for (const name of sourceFiles) {
    if (originalHashes[name] !== copiedHashes[name] || originalHashes[name] !== finalSourceHashes[name]) {
      throw new Error(`File content changed during freeze: ${name}`);
    }
  }
  // Catch additions/removals during hashing before marking this snapshot complete.
  sameFiles(sourceFiles, await packageFiles(paths.directory));
  sameFiles(sourceFiles, await files(destination));
  const manifest = { schemaVersion: 1, caseId, frozenAt: new Date().toISOString(), status: 'prepared-for-attempt', files: copiedHashes };
  await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return destination;
}
