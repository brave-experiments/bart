import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveAgent, resolveConfig } from '../src/config.ts';
import { runAgent } from '../src/agent.ts';
import { parseAgentOutput } from '../src/agent-adapters.ts';

const events = [
  { type: 'text', part: { text: 'retained reply' } },
  { type: 'step_finish', part: { reason: 'stop' } },
].map(event => JSON.stringify(event)).join('\n');

async function fixture(t: { after: (fn: () => Promise<void>) => void }, agent = 'opencode') {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'bart-agent-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const checkout = join(root, 'brave');
  execFileSync('git', ['init', '--quiet', checkout]);
  execFileSync('git', ['-C', checkout, 'remote', 'add', 'origin', 'https://github.com/brave/brave-core.git']);
  await writeFile(join(checkout, 'package.json'), '{"name":"brave-core"}');
  const bin = join(root, 'bin');
  await mkdir(bin);
  const env = { PATH: bin, HOME: root, BART_AGENT: agent, BART_BRAVE_CORE_DIR: checkout, BART_WORK_DIR: join(root, 'work') };
  // Resolve with the real git; child agents receive only the controlled fixture PATH.
  const config = await resolveConfig(env);
  async function executable(body: string) {
    await writeFile(join(bin, agent), `#!${process.execPath}\nif (process.argv[2] === '--version') { console.log('fixture 1'); process.exit(0); }\n${body}`, { mode: 0o755 });
  }
  await executable(`let input = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', c => input += c); process.stdin.on('end', () => {
    require('node:fs').writeFileSync('received.json', JSON.stringify({ input, args: process.argv.slice(2), cwd: process.cwd(), pwd: process.env.PWD, work: process.env.BART_WORK_DIR, reference: process.env.BART_BRAVE_CORE_DIR }));
    console.error('diagnostic'); console.log(${JSON.stringify(events)});
  });`);
  return { root, config, env, executable, task: { caseId: 'trial', instructions: '-literal $HOME `echo nope`\nsecond line', timeoutMs: 5000 } };
}

test('agent selection defaults to Claude and rejects unknown or blank selections', () => {
  assert.equal(resolveAgent({}), 'claude');
  assert.equal(resolveAgent({ BART_AGENT: 'opencode' }), 'opencode');
  for (const value of ['', ' ', 'bravebot', 'claude --print']) assert.throws(() => resolveAgent({ BART_AGENT: value }), /BART_AGENT/);
});

test('OpenCode gets literal stdin, resolved paths, unique runs, and no model override', async (t) => {
  const { config, env, task } = await fixture(t);
  const result = await runAgent(config, task, env);
  assert.equal(result.status, 'completed', result.detail);
  const received = JSON.parse(await readFile(join(result.runDir, 'received.json'), 'utf8'));
  assert.deepEqual(received, { input: task.instructions, args: ['run', '--format', 'json', '--dir', result.runDir], cwd: result.runDir, pwd: result.runDir, work: config.workDir, reference: config.braveCoreDir });
  assert.equal(await readFile(join(result.runDir, 'instructions.txt'), 'utf8'), task.instructions);
  assert.equal(await readFile(join(result.runDir, 'reply.txt'), 'utf8'), 'retained reply');
  assert.match(await readFile(join(result.runDir, 'stderr.log'), 'utf8'), /diagnostic/);
  const record = JSON.parse(await readFile(result.recordPath, 'utf8'));
  assert.equal(record.status, 'completed');
  assert.equal(record.version, 'fixture 1');
  assert.equal(record.stdout, 'stdout.log');
  assert.equal(record.modelSelection, 'agent-default');
  assert.notEqual((await runAgent(config, task, env)).runDir, result.runDir);
});

test('Claude uses its native result without model overrides or permission bypass', async (t) => {
  const { config, env, task, executable } = await fixture(t, 'claude');
  await executable(`require('node:assert/strict').deepEqual(process.argv.slice(2), ['--safe-mode', '--restricted', '--strict-mcp-config', '--tools', 'Read,Write,Edit', '--permission-mode', 'acceptEdits', '--print', '--output-format', 'json', '--no-session-persistence']);
    process.stdin.resume(); process.stdin.on('end', () => console.log(JSON.stringify({type:'result', subtype:'success', is_error:false, result:'fixture only'})));`);
  const result = await runAgent(config, task, env);
  assert.equal(result.status, 'completed', result.detail);
  assert.equal(result.reply, 'fixture only');
});

test('native errors, denied permissions, malformed output, and partial output never pass', () => {
  assert.equal(parseAgentOutput('claude', JSON.stringify({ type: 'result', subtype: 'success', is_error: false, permission_denials: [{}] })).status, 'blocked');
  assert.equal(parseAgentOutput('claude', JSON.stringify({ type: 'result', subtype: 'error_max_budget_usd', is_error: true })).status, 'failed');
  for (const output of ['', 'not JSON', '{"type":"text","part":{"text":"partial"}}', events + '\n{"type":"error"}', events + '\n{"type":"step_start"}', events.replace('stop', 'length'), events + '\n{"type":"tool_use","part":{"state":{"status":"error"}}}']) {
    assert.equal(parseAgentOutput('opencode', output).status, 'failed', output);
  }
});

test('nonzero exit cannot pass even with a successful native result', async (t) => {
  const { config, env, task, executable } = await fixture(t);
  await executable(`console.log(${JSON.stringify(events)}); process.exitCode = 7;`);
  const result = await runAgent(config, task, env);
  assert.equal(result.status, 'failed');
  assert.equal(result.reply, 'retained reply');
  assert.match(result.detail!, /7/);
});

test('deadline kills a child that ignores SIGTERM and preserves logs', async (t) => {
  const { config, env, task, executable } = await fixture(t);
  await executable(`process.on('SIGTERM', () => {}); console.error('before timeout'); setInterval(() => {}, 1000);`);
  const result = await runAgent(config, { ...task, timeoutMs: 300 }, env);
  assert.equal(result.status, 'timed_out');
  assert.match(await readFile(join(result.runDir, 'stderr.log'), 'utf8'), /before timeout/);
});

test('cancellation stops running descendants and retains cancelled status', async (t) => {
  const { config, env, task, executable } = await fixture(t);
  const pidFile = join(config.workDir, 'child.pid');
  await executable(`const child = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'});
    require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(child.pid)); setInterval(() => {}, 1000);`);
  const controller = new AbortController();
  const pending = runAgent(config, { ...task, signal: controller.signal }, env);
  let pid: number | undefined;
  for (let i = 0; i < 100; i++) {
    try { pid = Number(await readFile(pidFile, 'utf8')); break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  controller.abort();
  const result = await pending;
  assert.ok(pid, 'child was started');
  assert.equal(result.status, 'cancelled');
  // The operating system may take a moment to reap the descendant.
  for (let i = 0; i < 100; i++) {
    try { process.kill(pid, 0); } catch { return; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail('descendant survived cancellation');
});

test('pre-cancelled requests never start a paid agent command', async (t) => {
  const { config, env, task, executable } = await fixture(t);
  await executable(`require('node:fs').writeFileSync('should-not-exist', 'bad');`);
  const result = await runAgent(config, { ...task, signal: AbortSignal.abort() }, env);
  assert.equal(result.status, 'cancelled');
  await assert.rejects(readFile(join(result.runDir, 'should-not-exist')), { code: 'ENOENT' });
});

test('missing executable and oversized output leave failed run records', async (t) => {
  const { config, env, task, executable } = await fixture(t);
  const absent = await runAgent(config, task, { ...env, PATH: '/nonexistent' });
  assert.equal(absent.status, 'failed');
  assert.equal(JSON.parse(await readFile(absent.recordPath, 'utf8')).status, 'failed');
  await executable(`process.stdout.write('x'.repeat(9 * 1024 * 1024)); setInterval(() => {}, 1000);`);
  const result = await runAgent(config, task, env);
  assert.equal(result.status, 'failed');
  assert.match(result.detail!, /8 MiB/);
  assert.equal((await readFile(join(result.runDir, 'stdout.log'))).length, 8 * 1024 * 1024);
});

test('rejects bad inputs and case symlinks before launching', async (t) => {
  const { root, config, env, task } = await fixture(t);
  for (const timeoutMs of [0, -1, NaN, 0.1, 2_147_483_648]) await assert.rejects(runAgent(config, { ...task, timeoutMs }, env), /timeoutMs/);
  await assert.rejects(runAgent(config, { ...task, instructions: ' ' }, env), /instructions/);
  await assert.rejects(runAgent(config, { ...task, caseId: '../escape' }, env), /path ID/);
  await mkdir(config.casesDir);
  await symlink(root, join(config.casesDir, task.caseId));
  await assert.rejects(runAgent(config, task, env), /symlinks/);
  await assert.rejects(readFile(join(root, 'runs')), { code: 'ENOENT' });
});


test('version probe stops after ten seconds even when the executable ignores SIGTERM', async (t) => {
  const { config, env, task } = await fixture(t);
  await writeFile(join(env.PATH, 'opencode'), `#!${process.execPath}
    if (process.argv[2] !== '--version') process.exit(9);
    process.on('SIGTERM', () => {});
    setTimeout(() => process.exit(0), 15_000);
  `, { mode: 0o755 });
  const started = performance.now();
  const result = await runAgent(config, task, env);
  const elapsed = performance.now() - started;
  assert.equal(result.status, 'failed');
  assert.match(result.detail!, /ETIMEDOUT/);
  assert.ok(elapsed < 14_000, `version probe waited ${elapsed} ms`);
  assert.equal(JSON.parse(await readFile(result.recordPath, 'utf8')).status, 'failed');
});
