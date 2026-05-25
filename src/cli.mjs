import { readFile } from 'node:fs/promises';
import {
  approveMemory,
  captureEvent,
  extractMemoryCandidates,
  formatDoctorReport,
  generateContextPack,
  initVibeBox,
  rejectMemory,
  reviewPending,
  runDoctor
} from './core.mjs';

function parseArgs(argv) {
  const args = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      args.push(item);
      continue;
    }
    const withoutPrefix = item.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    if (equalsIndex >= 0) {
      flags[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      flags[withoutPrefix] = next;
      index += 1;
    } else {
      flags[withoutPrefix] = true;
    }
  }
  return { args, flags };
}

async function readStdin() {
  if (process.stdin.isTTY) {
    return '';
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseChangedFiles(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(/[,;]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function help() {
  return `VibeBox

Usage:
  vibebox init
  vibebox capture --request <text> --summary <text> [--command <text>] [--command-result <text>] [--changed-files a,b] [--feedback <text>] [--outcome success|failure|partial|unknown]
  vibebox extract --text <text>
  vibebox review
  vibebox approve <candidate-id>
  vibebox reject <candidate-id>
  vibebox context --task <text>
  vibebox doctor
`;
}

export async function runCli(argv = process.argv.slice(2), root = process.cwd()) {
  const [command, ...rest] = argv;
  const { args, flags } = parseArgs(rest);

  switch (command) {
    case 'init': {
      const result = await initVibeBox(root);
      return `VibeBox initialized at ${result.vibeboxPath}\nCreated ${result.created.length} missing item(s).`;
    }

    case 'capture': {
      const event = await captureEvent(root, {
        eventType: flags['event-type'] || flags.eventType || 'task_summary',
        userRequest: flags.request || flags.userRequest || '',
        aiActionSummary: flags.summary || flags.aiActionSummary || '',
        command: flags.command || '',
        commandResult: flags['command-result'] || flags.commandResult || '',
        changedFiles: parseChangedFiles(flags['changed-files'] || flags.changedFiles),
        userFeedback: flags.feedback || flags.userFeedback || '',
        outcome: flags.outcome || 'unknown'
      });
      return `Captured event ${event.id}`;
    }

    case 'extract': {
      let text = flags.text || '';
      if (flags.file) {
        text = await readFile(flags.file, 'utf8');
      }
      if (!text) {
        text = await readStdin();
      }
      const candidates = await extractMemoryCandidates(root, {
        text,
        eventId: flags.event,
        fromLastEvent: flags['last-event'] || false,
        source: { kind: flags.event ? 'event' : 'cli_extract', id: flags.event || null }
      });
      return `Extracted ${candidates.length} pending candidate(s).`;
    }

    case 'review':
      return reviewPending(root);

    case 'approve': {
      const id = args[0];
      if (!id) throw new Error('approve requires a candidate id.');
      const memory = await approveMemory(root, id);
      return `Approved ${memory.id}`;
    }

    case 'reject': {
      const id = args[0];
      if (!id) throw new Error('reject requires a candidate id.');
      const memory = await rejectMemory(root, id, flags.reason || 'Rejected from CLI.');
      return `Rejected ${memory.id}`;
    }

    case 'context': {
      const task = flags.task || args.join(' ') || await readStdin();
      return generateContextPack(root, { task });
    }

    case 'doctor': {
      const report = await runDoctor(root);
      return formatDoctorReport(report);
    }

    case undefined:
    case '-h':
    case '--help':
    case 'help':
      return help();

    default:
      throw new Error(`Unknown command: ${command}\n\n${help()}`);
  }
}

export async function main() {
  try {
    const output = await runCli();
    if (output) {
      process.stdout.write(`${output}\n`);
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
