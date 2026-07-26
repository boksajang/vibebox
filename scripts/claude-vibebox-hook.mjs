import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_CONTEXT_CHARS = 9000;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || resolve(scriptDir, '..');
const vibeboxCli = resolve(pluginRoot, 'bin', 'vibebox.mjs');
const vibeboxStore = resolve(process.env.VIBEBOX_HOME || resolve(homedir(), '.vibebox'));

function readStdin() {
  return new Promise((resolveInput) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => resolveInput(input));
    process.stdin.on('error', () => resolveInput(input));
  });
}

function truncate(text) {
  if (!text || text.length <= MAX_CONTEXT_CHARS) {
    return text || '';
  }
  return `${text.slice(0, MAX_CONTEXT_CHARS)}\n...[truncated by VibeBox Claude hook]`;
}

function emitContext(eventName, additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: truncate(additionalContext)
    }
  }));
}

function emitBlock(eventName, reason) {
  const message = truncate(reason);
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: message,
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: message
    }
  }));
}

function runVibeBox(args, cwd) {
  const result = spawnSync(process.execPath, [vibeboxCli, ...args], {
    cwd: cwd || process.cwd(),
    env: {
      ...process.env,
      VIBEBOX_AGENT_RUNTIME: process.env.VIBEBOX_AGENT_RUNTIME || 'claude'
    },
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error
  };
}

const rawInput = await readStdin();
let input = {};

try {
  input = rawInput.trim() ? JSON.parse(rawInput) : {};
} catch {
  input = {};
}

const eventName = input.hook_event_name;

if (eventName === 'UserPromptSubmit') {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) {
    process.exit(0);
  }

  let result;
  if (!existsSync(resolve(vibeboxStore, 'config.json'))) {
    const bootstrap = runVibeBox(['init'], input.cwd);
    result = bootstrap.status === 0
      ? runVibeBox(['pretask', '--task', prompt], input.cwd)
      : bootstrap;
  } else {
    result = runVibeBox(['pretask', '--task', prompt], input.cwd);
  }
  const pretaskFailure = `${result.stderr}${result.stdout}`;
  if (result.status !== 0 && /global store not found|ENOENT|no such file or directory/iu.test(pretaskFailure)) {
    const bootstrap = runVibeBox(['init'], input.cwd);
    if (bootstrap.status === 0) {
      result = runVibeBox(['pretask', '--task', prompt], input.cwd);
    } else {
      result = bootstrap;
    }
  }
  if (result.status === 0) {
    emitContext('UserPromptSubmit', [
      'VibeBox pretask retrieved active memory for this user request.',
      'Apply this guidance before planning or editing. The current user request still wins over older memory.',
      '',
      result.stdout.trim()
    ].join('\n'));
    process.exit(0);
  }

  emitContext('UserPromptSubmit', [
    'VibeBox pretask could not read active memory for this request.',
    'Do not create workspace-local memory snapshots or fallback stores.',
    'If repository work proceeds, report that VibeBox guidance was unavailable when relevant.',
    '',
    result.error ? String(result.error.message || result.error) : `${result.stderr}${result.stdout}`.trim()
  ].join('\n'));
  process.exit(0);
}

if (eventName === 'Stop') {
  if (input.stop_hook_active) {
    process.exit(0);
  }

  emitBlock('Stop', [
    'VibeBox aftertask checkpoint.',
    'Do not stop yet if this turn performed meaningful coding, documentation, packaging, review, validation, or debugging work and the user did not opt out.',
    `Run \`node "${vibeboxCli}" schema --format json\` before writing candidate JSON.`,
    `Then run \`node "${vibeboxCli}" aftertask --request "<original user request or faithful summary>" --summary "..." --candidates-file <structured-candidates.json> --technical-outcome success|failure|partial|unknown --user-acceptance accepted|rejected|mixed|unknown\`.`,
    'The AI agent must provide structured candidates for reusable memory. Core will not infer active memory from raw summaries.',
    'If no durable memory exists, submit no_reusable_memory_candidate with noCandidateReason instead of skipping the checkpoint.'
  ].join('\n'));
  process.exit(0);
}

process.exit(0);
