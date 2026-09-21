import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveBraveCoreDir, resolveWorkDir } from './config.ts';
import { nodeResult, supportsNode } from './node-version.js';

export async function doctor(): Promise<number> {
  let failures = 0;
  function result(ok: boolean, message: string, fix: string) {
    console.log(`${ok ? '✅' : '❌'} ${message}${ok ? '' : `. Fix: ${fix}`}`);
    if (!ok) failures++;
  }

  result(supportsNode(process.versions.node), nodeResult(), 'run nvm install && nvm use in the BART directory');
  try {
    result(true, `BART_BRAVE_CORE_DIR: ${await resolveBraveCoreDir()}`, '');
  } catch (error) {
    result(false, String((error as Error).message), 'set BART_BRAVE_CORE_DIR to the Brave Core checkout root (absolute path or ~/), with package name brave-core and brave/brave-core origin; load .envrc and ensure git is on PATH');
  }
  try {
    result(true, `BART_WORK_DIR: ${await resolveWorkDir()} (writable)`, '');
  } catch (error) {
    result(false, `BART_WORK_DIR: ${(error as Error).message}`, 'set BART_WORK_DIR in .envrc to a writable directory outside BART and the reference checkout, then load it with direnv allow or source .envrc; check parent permissions');
  }

  for (const tool of ['clawperator', 'gh', 'claude']) {
    // Prefer the pinned package executable without changing PATH for other tools.
    const local = fileURLToPath(new URL('../node_modules/.bin/clawperator', import.meta.url));
    const executable = tool === 'clawperator' && existsSync(local) ? local : tool;
    const version = spawnSync(executable, ['--version'], {
      encoding: 'utf8', timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 64 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output = (version.stdout || version.stderr || '').trim().split(/\r?\n/)[0];
    const ok = !version.error && version.status === 0 && Boolean(output);
    const detail = version.error ? version.error.message : `--version exited ${version.status ?? version.signal}${output ? `: ${output}` : ' without a version'}`;
    const fix = tool === 'clawperator' ? 'run npm --prefix node ci in the BART repository root to restore the pinned executable, or make clawperator available on PATH' : `install ${tool} or add its executable to PATH; check ${tool} --version`;
    result(ok, `${tool}: ${ok ? output : detail}${executable === local ? ' (package-local)' : ''}`, fix);
  }
  console.log('⚠️ Host checks only. Authentication, device readiness, and agent integration were not checked.');
  console.log(failures ? `${failures} required check(s) failed.` : 'All required host checks passed.');
  return failures ? 1 : 0;
}
