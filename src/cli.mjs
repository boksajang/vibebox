import { readFile } from 'node:fs/promises';
import {
  afterTask,
  approveSafeMemories,
  approveMemory,
  captureEvent,
  extractMemoryCandidates,
  generateBlackboxReport,
  getVibeBoxHome,
  formatDoctorReport,
  generateContextPack,
  generatePreTaskBrief,
  generateReport,
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

function parseList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(/\r?\n|[,;]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function help() {
  return `VibeBox

Usage:
  vibebox init [--store <path>]
  vibebox capture --request <text> --summary <text> [--command <text>] [--command-result <text>] [--changed-files a,b] [--feedback <text>] [--outcome success|failure|partial|unknown]
  vibebox extract --text <text>
  vibebox review
  vibebox approve <candidate-id>
  vibebox approve --safe
  vibebox reject <candidate-id>
  vibebox context --task <text>
  vibebox pretask --task <text>
  vibebox aftertask --request <text> --summary <text> [--files a,b] [--commands <text>] [--outcome success|failure|partial|unknown]
  vibebox report
  vibebox blackbox [--limit 10] [--type success|failure|task_summary] [--since YYYY-MM-DD]
  vibebox doctor

Global store:
  Defaults to ~/.vibebox and can be overridden with VIBEBOX_HOME or --store <path>.
`;
}

export async function runCli(argv = process.argv.slice(2), root = process.cwd()) {
  const [command, ...rest] = argv;
  const { args, flags } = parseArgs(rest);
  if (flags.store) {
    process.env.VIBEBOX_HOME = String(flags.store);
  }

  switch (command) {
    case 'init': {
      const result = await initVibeBox(root);
      return [
        `VibeBox global store initialized at ${result.storeRoot}`,
        `Current projectId: ${result.projectId}`,
        `Current project root: ${result.projectRoot}`,
        `Created ${result.created.length} missing item(s).`
      ].join('\n');
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
      return `Captured event ${event.id}\nProject: ${event.projectId}\nGlobal store: ${getVibeBoxHome()}`;
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
      const projectId = candidates.find((candidate) => candidate.projectId)?.projectId || 'global';
      return `Extracted ${candidates.length} pending candidate(s).\nProject: ${projectId}`;
    }

    case 'review':
      return reviewPending(root);

    case 'approve': {
      if (flags.safe || args[0] === '--safe' || args[0] === 'safe') {
        const result = await approveSafeMemories(root);
        return `Approved ${result.approved.length} safe candidate(s).\nSkipped ${result.skipped.length} candidate(s) requiring review.`;
      }
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
      return generateContextPack(root, { task, debug: Boolean(flags.debug) });
    }

    case 'pretask': {
      const task = flags.task || args.join(' ') || await readStdin();
      return generatePreTaskBrief(root, { task, debug: Boolean(flags.debug) });
    }

    case 'aftertask': {
      let fileText = '';
      if (flags['from-file']) {
        fileText = await readFile(flags['from-file'], 'utf8');
      }
      if (!fileText && !process.stdin.isTTY) {
        fileText = await readStdin();
      }
      const result = await afterTask(root, {
        userRequest: flags.request || flags.userRequest || '',
        aiActionSummary: flags.summary || flags.aiActionSummary || fileText,
        changedFiles: parseList(flags.files || flags['changed-files'] || flags.changedFiles),
        commands: parseList(flags.commands || flags.command),
        commandResults: parseList(flags['command-results'] || flags['command-result'] || flags.commandResult),
        errors: parseList(flags.errors || flags.error),
        userFeedback: flags.feedback || flags.userFeedback || '',
        outcome: flags.outcome || 'unknown',
        notes: flags.notes || fileText
      });
      return result.message;
    }

    case 'report':
      return generateReport(root);

    case 'blackbox': {
      return generateBlackboxReport(root, {
        limit: flags.limit,
        type: flags.type,
        since: flags.since
      });
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
