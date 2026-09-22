import { doctor } from './doctor.ts';
import { resolveConfig } from './config.ts';

const args = process.argv.slice(2);
if (args[0] === 'doctor' && (args.length === 1 || (args.length === 2 && args[1] === '--claude'))) {
  process.exitCode = await doctor(args.includes('--claude'));
} else if (args.length === 1 && args[0] === 'config') {
  try {
    console.log(JSON.stringify(await resolveConfig(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
} else {
  console.log('Usage: bart doctor [--claude] | config\n  doctor  Check host and authentication configuration without a model request.\n  --claude  Also test a Claude model reply (network and model charges may apply).\n  config  Validate and print resolved paths.');
  if (args.length && !(args.length === 1 && ['--help', '-h'].includes(args[0]!))) process.exitCode = 1;
}
