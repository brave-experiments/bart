import { spawnSync } from 'node:child_process';

import { claudePreparationArgs } from './claude-profile.ts';

const authFix = 'for Bedrock, configure the provider, AWS profile, region and models in `.envrc`, then run `source .envrc` before retrying. `--restricted` ignores Claude user/project settings. For direct Anthropic access, use `claude auth login` in the same environment. See [docs/agent-configuration.md](docs/agent-configuration.md) for setup and troubleshooting';

type Check = { ok: boolean; message: string; fix: string };
type Runner = typeof spawnSync;

export function checkClaudeReadiness(report: (check: Check) => void, checkModel = false, run: Runner = spawnSync): void {
  function invoke(args: string[], timeout: number) {
    return run('claude', [...claudePreparationArgs, ...args], {
      encoding: 'utf8', timeout, killSignal: 'SIGKILL', maxBuffer: 64 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  function parse(output: unknown): Record<string, unknown> | undefined {
    try {
      const value: unknown = JSON.parse(String(output));
      if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch { /* Report malformed output without exposing CLI diagnostics or credentials. */ }
    return undefined;
  }
  function failure(result: ReturnType<Runner>): string {
    if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT') return 'timed out';
    if (result.error) return 'could not execute or exceeded the output limit';
    return `exited ${result.status ?? result.signal}`;
  }

  const auth = invoke(['auth', 'status', '--json'], 10_000);
  const status = parse(auth.stdout);
  if (auth.error || auth.status !== 0 || status?.loggedIn !== true) {
    report({ ok: false, message: `Claude authentication/provider configuration unavailable for the preparation flags (${failure(auth)})`, fix: authFix });
    return;
  }
  report({ ok: true, message: 'Claude authentication/provider configuration detected; credentials and model access are not yet verified', fix: '' });
  if (!checkModel) return;
  const response = invoke([
    '--model', process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'haiku',
    '--print', '--output-format', 'json', '--no-session-persistence',
    '--disallowedTools', 'Read,Write,Edit', '--max-turns', '1', '--max-budget-usd', '0.01',
    '--system-prompt', 'This is a readiness check. Do not use tools. Reply exactly BART_READY.',
    'Reply exactly BART_READY.',
  ], 30_000);
  const reply = parse(response.stdout);
  const ok = !response.error && response.status === 0 && reply?.type === 'result'
    && reply.subtype === 'success' && reply.is_error === false
    && typeof reply.result === 'string' && reply.result.trim() === 'BART_READY';
  report({
    ok,
    message: ok ? 'Claude returned the expected model response with the preparation flags (file tools denied for this check)'
      : `Claude model readiness failed (${failure(response)}; no verified BART_READY response)`,
    fix: 'check provider credentials, model access, quota and network access in this execution context; renew the intended provider login if needed and rerun `./scripts/bart doctor --claude`. Authentication status alone does not prove model access. See [docs/agent-configuration.md](docs/agent-configuration.md) for setup and troubleshooting',
  });
}
