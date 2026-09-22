import { spawn } from 'node:child_process';
import { closeSync, openSync, writeSync } from 'node:fs';
import { join } from 'node:path';

// Keep output bounded in memory and on disk. The retained prefix explains failures.
const OUTPUT_LIMIT = 8 * 1024 * 1024;
export interface ProcessResult {
  stdout: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stopped?: 'timed_out' | 'cancelled' | 'failed';
  detail?: string;
}

export async function agentProcess(options: {
  executable: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv;
  instructions: string; timeoutMs: number; signal?: AbortSignal;
}): Promise<ProcessResult> {
  if (process.platform === 'win32') throw new Error('The agent prototype requires macOS or Linux process groups');
  const stdoutFd = openSync(join(options.cwd, 'stdout.log'), 'wx', 0o600);
  let stderrFd: number;
  try { stderrFd = openSync(join(options.cwd, 'stderr.log'), 'wx', 0o600); }
  catch (error) { closeSync(stdoutFd); throw error; }
  try {
    if (options.signal?.aborted) return { stdout: '', exitCode: null, signal: null, stopped: 'cancelled' };
    return await new Promise<ProcessResult>((resolve) => {
      const child = spawn(options.executable, options.args, {
        cwd: options.cwd, env: options.env, detached: true, stdio: ['pipe', 'pipe', 'pipe'],
      });
      let stopped: ProcessResult['stopped'];
      let detail: string | undefined;
      let bytes = 0;
      const chunks: Buffer[] = [];
      let killTimer: NodeJS.Timeout | undefined;
      function kill(signal: NodeJS.Signals) {
        if (!child.pid) return;
        try { process.kill(-child.pid, signal); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') detail = `Could not stop process group: ${(error as Error).message}`; }
      }
      function stop(reason: ProcessResult['stopped'], message?: string) {
        if (stopped) return;
        stopped = reason;
        detail = message;
        kill('SIGTERM');
        killTimer = setTimeout(() => kill('SIGKILL'), 300);
      }
      function capture(chunk: Buffer, fd: number, stdout: boolean) {
        const retained = chunk.subarray(0, Math.max(0, OUTPUT_LIMIT - bytes));
        bytes += chunk.length;
        try {
          writeSync(fd, retained);
          if (stdout) chunks.push(retained);
        } catch (error) { stop('failed', `Could not retain logs: ${(error as Error).message}`); }
        if (bytes > OUTPUT_LIMIT) stop('failed', 'Agent output exceeded the 8 MiB limit; logs contain the prefix');
      }
      child.stdout.on('data', (chunk: Buffer) => capture(chunk, stdoutFd, true));
      child.stderr.on('data', (chunk: Buffer) => capture(chunk, stderrFd, false));
      child.on('error', (error) => stop('failed', error.message));
      // A child can exit before consuming stdin. The close event still supplies its result.
      child.stdin.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EPIPE') stop('failed', error.message);
      });
      const timer = setTimeout(() => stop('timed_out', 'Agent deadline exceeded'), options.timeoutMs);
      const abort = () => stop('cancelled', 'Agent run cancelled');
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) abort();
      child.on('close', (exitCode, signal) => {
        clearTimeout(timer);
        clearTimeout(killTimer);
        options.signal?.removeEventListener('abort', abort);
        // Also stop descendants that closed their output pipes before their parent exited.
        kill('SIGKILL');
        resolve({ stdout: Buffer.concat(chunks).toString('utf8'), exitCode, signal, stopped, detail });
      });
      child.stdin.end(options.instructions);
    });
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
  }
}
