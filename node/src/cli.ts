import { createCase, freezeCase } from './case-package.ts';
import { readFile } from 'node:fs/promises';
import { runAgent } from './agent.ts';
import { doctor } from './doctor.ts';
import { resolveConfig } from './config.ts';

import { parseCheckOptions, runChecks, type CheckCommand } from './checks.ts';

const args = process.argv.slice(2);
if (['check-all', 'check-signatures', 'check-reviewdog', 'pr-ready'].includes(args[0] ?? '')) {
  try {
    const command = args[0] as CheckCommand;
    process.exitCode = await runChecks(command, parseCheckOptions(args.slice(1), command));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
} else if (args[0] === 'doctor' && (args.length === 1 || (args.length === 2 && args[1] === '--claude'))) {
  process.exitCode = await doctor(args[1] === '--claude');
} else if (args.length === 1 && args[0] === 'config') {
  try {
    console.log(JSON.stringify(await resolveConfig(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
} else if (args[0] === 'agent-run' && (args.length === 3 || args.length === 4)) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const config = await resolveConfig();
    const result = await runAgent(config, {
      caseId: args[1]!, instructions: await readFile(args[2]!, 'utf8'),
      timeoutMs: args[3] === undefined ? 120_000 : Number(args[3]), signal: controller.signal,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'completed' ? 0 : result.status === 'cancelled' ? 130 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
} else if ((args[0] === 'case-create' && args.length === 4) || (args[0] === 'case-freeze' && args.length === 2)) {
  try {
    const config = await resolveConfig();
    console.log(args[0] === 'case-create'
      ? JSON.stringify(await createCase(config, args[1]!, args[2]!, args[3]!), null, 2)
      : await freezeCase(config, args[1]!));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
} else {
  console.log('Checks: bart {check-all|pr-ready|check-signatures|check-reviewdog} [--base REF]\n  check-reviewdog also accepts --full\nSee docs/checks.md for setup and signature policy.\nUsage: bart doctor [--claude] | config | case-create <id> <url> <objective> | case-freeze <id> | agent-run <case-id> <instructions-file> [timeout-ms]\n  doctor  Check host readiness without a model request.\n  --claude  Probe a Claude reply (network and charges may apply; requires BART_AGENT=claude).\n  config  Validate and print resolved configuration.\n  agent-run  Run one agent task (default deadline: 120000 ms).');
  if (args.length && !(args.length === 1 && ['--help', '-h'].includes(args[0]!))) process.exitCode = 1;
}
