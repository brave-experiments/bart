import { spawnSync, type SpawnSyncOptionsWithStringEncoding } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkClaudeReadiness } from './claude-readiness.ts';
import { resolveAgent, resolveBraveCoreDir, resolveWorkDir } from './config.ts';
import { nodeResult, supportsNode } from './node-version.js';

export interface DoctorDevice {
  serial: string;
  operatorPackage: string;
}

function meetsClawperatorVersion(output: string, required: string): boolean {
  const parse = (value: string) => /^(?:clawperator\s+)?v?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())?.slice(1).map(Number);
  const installed = parse(output);
  const minimum = parse(required);
  if (!installed || !minimum) return false;
  for (let part = 0; part < minimum.length; part++) {
    if (installed[part] !== minimum[part]) return installed[part]! > minimum[part]!;
  }
  return true;
}

export async function doctor(checkModel = false, device?: DoctorDevice): Promise<number> {
  let failures = 0;
  function result(ok: boolean, message: string, fix: string) {
    console.log(`${ok ? '✅' : '❌'} ${message}${ok ? '' : `. Fix: ${fix}`}`);
    if (!ok) failures++;
  }

  result(supportsNode(process.versions.node), nodeResult(), 'run nvm install && nvm use in the BART directory');
  const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const requiredClawperatorVersion: string = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).dependencies.clawperator;
  const localClawperator = join(packageRoot, 'node_modules/.bin/clawperator');
  const clawperatorExecutable = existsSync(localClawperator) ? localClawperator : 'clawperator';
  const probeOptions: SpawnSyncOptionsWithStringEncoding = {
    encoding: 'utf8', timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 64 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  const missingPackages = ['.bin/tsc', '.bin/lockfile-lint', 'yaml/package.json', 'clawperator/package.json']
    .filter(path => !existsSync(join(packageRoot, 'node_modules', path)));
  result(missingPackages.length === 0,
    `Node package dependencies: ${missingPackages.length ? `missing ${missingPackages.join(', ')}` : 'installed'}`,
    'run npm --prefix node ci from this BART worktree root to install the locked Node packages');
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

  const tools = ['clawperator', 'gh', 'adb', 'ffmpeg', 'ffprobe'];
  const available = new Set<string>();
  try {
    const agent = resolveAgent();
    if (checkModel && agent !== 'claude') {
      result(false, 'doctor --claude requires BART_AGENT=claude', 'select claude explicitly or omit --claude for OpenCode host checks');
      return 1;
    }
    tools.push(agent);
    if (agent === 'opencode') console.log('⚠️ OpenCode authentication and model access were not checked.');
  } catch (error) { result(false, (error as Error).message, 'set BART_AGENT to claude or opencode'); }
  for (const tool of tools) {
    // Prefer the pinned package executable without changing PATH for other tools.
    const executable = tool === 'clawperator' ? clawperatorExecutable : tool;
    const versionArg = tool === 'ffmpeg' || tool === 'ffprobe' ? '-version' : '--version';
    const version = spawnSync(executable, [versionArg], probeOptions);
    const output = (version.stdout || version.stderr || '').trim().split(/\r?\n/)[0];
    const versionAvailable = !version.error && version.status === 0 && Boolean(output);
    const ok = versionAvailable && (tool !== 'clawperator' || meetsClawperatorVersion(output, requiredClawperatorVersion));
    const detail = version.error ? version.error.message : `${versionArg} exited ${version.status ?? version.signal}${output ? `: ${output}` : ' without a version'}`;
    const fix = tool === 'clawperator' ? `run npm --prefix node ci in this BART checkout to install Clawperator ${requiredClawperatorVersion} (required >=${requiredClawperatorVersion})`
      : tool === 'adb' ? 'install Android SDK Platform-Tools with Android Studio SDK Manager or `brew install --cask android-platform-tools` on macOS, then add adb to PATH'
      : tool === 'ffmpeg' || tool === 'ffprobe' ? 'install FFmpeg with `brew install ffmpeg` on macOS, then add both ffmpeg and ffprobe to PATH'
      : `install ${tool} or add its executable to PATH; check ${tool} --version`;
    result(ok, `\`${tool}\`: ${versionAvailable ? output : detail}${tool === 'clawperator' ? ` (required >=${requiredClawperatorVersion})` : ''}${executable === localClawperator ? ' (package-local)' : ''}`, fix);
    if (ok) available.add(tool);
    if (tool === 'claude' && ok) {
      if (checkModel) console.log('⚠️ Claude Haiku model check uses the network and may incur charges or consume quota (30s, one turn, Claude budget setting $0.01).');
      else console.log('⚠️ Claude model response not checked. Use `./scripts/bart doctor --claude` to opt into a model request that may incur charges.');
      checkClaudeReadiness(({ ok, message, fix }) => result(ok, message, fix), checkModel);
    }
  }
  if (device) {
    let connected = false;
    if (!available.has('adb')) console.log('⚠️ Device capture checks skipped because adb is unavailable.');
    else {
      const state = spawnSync('adb', ['-s', device.serial, 'get-state'], probeOptions);
      connected = !state.error && state.status === 0 && state.stdout.trim() === 'device';
      result(connected, `Device ${device.serial}: ${connected ? 'connected' : 'unavailable or unauthorized'}`,
        `check \`adb -s ${device.serial} get-state\` and authorize or reconnect the designated device`);
      if (connected) {
        const run = (args: string[]) => spawnSync('adb', ['-s', device.serial, 'shell', ...args], probeOptions);
        const recording = run(['screenrecord', '--help']);
        const recordingHelp = `${recording.stdout ?? ''}${recording.stderr ?? ''}`;
        result(!recording.error && recording.status === 0 && recordingHelp.includes('--size') && recordingHelp.includes('--time-limit'),
          'Android screenrecord supports --size and --time-limit',
          'use a device with Android screenrecord support; check `adb -s <serial> shell screenrecord --help`');
        const screenshot = run(['command', '-v', 'screencap']);
        result(!screenshot.error && screenshot.status === 0 && Boolean(screenshot.stdout.trim()),
          'Android screencap is available',
          'use a device with Android screencap support; check `adb -s <serial> shell command -v screencap`');
      }
    }
    if (!available.has('clawperator')) console.log('⚠️ Operator compatibility check skipped because Clawperator is unavailable.');
    else if (connected) {
      const compatibility = spawnSync(clawperatorExecutable, ['version', '--check-compat', '--device', device.serial,
        '--operator-package', device.operatorPackage, '--output', 'json'], probeOptions);
      let compatible = false;
      try { compatible = compatibility.status === 0 && JSON.parse(compatibility.stdout).compatible === true; }
      catch { /* Invalid or missing JSON is a failed check. */ }
      result(compatible, `Operator ${device.operatorPackage}: ${compatible ? 'compatible' : 'compatibility unverified'}`,
        `check the installed Operator package and version with \`clawperator version --check-compat --device ${device.serial} --operator-package ${device.operatorPackage} --output json\``);
    } else console.log('⚠️ Operator compatibility check skipped because the device is unavailable.');
  }
  console.log(device
    ? '⚠️ A capture clip, file-tool execution, GitHub authentication, and full agent integration were not checked.'
    : '⚠️ Device readiness, capture capability, file-tool execution, GitHub authentication, and full agent integration were not checked. Use `./scripts/bart doctor --device <serial>` for device capture checks.');
  console.log(failures ? `${failures} required check(s) failed.` : 'All required doctor checks passed.');
  return failures ? 1 : 0;
}
