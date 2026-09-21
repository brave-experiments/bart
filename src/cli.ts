import { resolveConfig } from './config.ts';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === 'config') {
  try {
    console.log(JSON.stringify(await resolveConfig(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
} else {
  console.log('Usage: bart config\nValidate local configuration and print resolved paths.');
  if (args.length && !(args.length === 1 && ['--help', '-h'].includes(args[0]!))) process.exitCode = 1;
}
