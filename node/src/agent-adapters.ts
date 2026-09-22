import { claudePreparationArgs } from './claude-profile.ts';
import type { Agent } from './config.ts';

export type ExecutionStatus = 'completed' | 'failed' | 'blocked' | 'timed_out' | 'cancelled';
export interface AgentOutput { status: ExecutionStatus; reply: string; detail?: string }

// No model or reasoning flags: the selected agent resolves its own defaults.
export function agentArgs(agent: Agent, runDir: string): string[] {
  return agent === 'opencode'
    ? ['run', '--format', 'json', '--dir', runDir]
    : [...claudePreparationArgs, '--print', '--output-format', 'json', '--no-session-persistence'];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
  return value as Record<string, unknown>;
}

export function parseAgentOutput(agent: Agent, stdout: string): AgentOutput {
  let reply = '';
  try {
    if (agent === 'claude') {
      const result = object(JSON.parse(stdout));
      if (typeof result.result === 'string') reply = result.result;
      if (result.type !== 'result') throw new Error('Missing Claude result');
      if (Array.isArray(result.permission_denials) && result.permission_denials.length) {
        return { status: 'blocked', reply, detail: 'Claude reported permission denials; inspect stdout.log' };
      }
      if (result.subtype !== 'success' || result.is_error !== false) {
        return { status: 'failed', reply, detail: 'Claude did not report success; inspect stdout.log' };
      }
      return { status: 'completed', reply };
    }

    let finished = false;
    let failed = false;
    for (const line of stdout.split(/\r?\n/).filter(line => line.trim())) {
      const event = object(JSON.parse(line));
      if (typeof event.type !== 'string') throw new Error('Missing OpenCode event type');
      if (event.type === 'error') failed = true;
      if (event.type === 'text') {
        const part = object(event.part);
        if (typeof part.text !== 'string') throw new Error('Invalid OpenCode text');
        reply += part.text;
      }
      if (event.type === 'step_start') finished = false;
      if (event.type === 'step_finish') finished = object(event.part).reason === 'stop';
      if (event.type === 'tool_use' && object(object(event.part).state).status === 'error') failed = true;
    }
    if (failed || !finished) {
      return { status: 'failed', reply, detail: failed ? 'OpenCode reported an error; inspect stdout.log' : 'Missing final OpenCode stop event' };
    }
    return { status: 'completed', reply };
  } catch (error) {
    return { status: 'failed', reply, detail: `Invalid agent output: ${(error as Error).message}` };
  }
}
