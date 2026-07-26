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

function initializationGuidance() {
  return [
    'VibeBox global store is not initialized.',
    'Before repository work, infer the user-facing language from the current user conversation and choose its exact canonical BCP 47 tag. Do not hardcode Korean, English, or the operating-system locale.',
    `Run \`node "${vibeboxCli}" schema --format json --language <user-language-tag>\` and use initialization.displayTemplate to generate every required template value in that same user language.`,
    `Then run \`node "${vibeboxCli}" init --language <user-language-tag> --display-template-file <generated-template.json>\`.`,
    `After initialization succeeds, run \`node "${vibeboxCli}" pretask --task "<current user request>"\` before continuing.`,
    'Do not run bare init for a non-English user language, and do not substitute English display text.'
  ].join('\n');
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

  if (!existsSync(resolve(vibeboxStore, 'config.json'))) {
    emitContext('UserPromptSubmit', initializationGuidance());
    process.exit(0);
  }
  const result = runVibeBox(['pretask', '--task', prompt], input.cwd);
  const pretaskFailure = `${result.stderr}${result.stdout}`;
  if (result.status !== 0 && /global store not found|ENOENT|no such file or directory/iu.test(pretaskFailure)) {
    emitContext('UserPromptSubmit', initializationGuidance());
    process.exit(0);
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
    'The schema reads the configured memoryLanguage. Write displayTitle, displaySummary, and displayRule in that exact user language and set displayLanguage to the exact schema value; Core rejects missing or mismatched display fields.',
    'The AI agent must provide structured candidates for reusable memory. Core will not infer active memory from raw summaries.',
    'If no durable memory exists, submit no_reusable_memory_candidate with noCandidateReason instead of skipping the checkpoint.'
  ].join('\n'));
  process.exit(0);
}

process.exit(0);
