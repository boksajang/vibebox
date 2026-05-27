import { readFile } from 'node:fs/promises';
import {
  afterTask,
  approveSafeMemories,
  approveMemory,
  backupVibeBox,
  captureEvent,
  convertLanguage,
  extractMemoryCandidates,
  generateBlackboxReport,
  getVibeBoxHome,
  formatDoctorReport,
  generateContextPack,
  generatePreTaskBrief,
  generateReport,
  initVibeBox,
  rejectMemory,
  rebuildVibeBox,
  restoreVibeBox,
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
  vibebox capture --request <text> --summary <text> [--command <text>] [--command-result <text>] [--changed-files a,b] [--feedback <text>] [--outcome success|failure|partial|unknown] [--technical-outcome success|failure|partial|unknown] [--user-acceptance accepted|rejected|mixed|unknown]
  vibebox extract --text <text> [--manual-review]
  vibebox review
  vibebox approve <candidate-id>
  vibebox approve --safe
  vibebox reject <candidate-id>
  vibebox context --task <text>
  vibebox pretask --task <text>
  vibebox aftertask --request <text> --summary <text> [--files a,b] [--commands <text>] [--outcome success|failure|partial|unknown] [--technical-outcome success|failure|partial|unknown] [--user-acceptance accepted|rejected|mixed|unknown] [--manual-review]
  vibebox report
  vibebox blackbox [--limit 10] [--type success|failure|task_summary] [--since YYYY-MM-DD]
  vibebox doctor
  vibebox backup [--output <path>] [--include-logs|--exclude-logs]
  vibebox restore --from <path> --confirm-replace
  vibebox convert-lang <from> <to>
  vibebox language convert <from> <to>
  vibebox rebuild [--index-only]

Global store:
  Defaults to ~/.vibebox and can be overridden with VIBEBOX_HOME or --store <path>.
  Human-facing output can be localized with VIBEBOX_LOCALE, VIBEBOX_LANGUAGE, --locale, or --language.
  Semantic operations convert-lang and rebuild require VIBEBOX_AGENT_RUNTIME from an adapter.
`;
}

export async function runCli(argv = process.argv.slice(2), root = process.cwd()) {
  const [command, ...rest] = argv;
  const { args, flags } = parseArgs(rest);
  if (flags.store) {
    process.env.VIBEBOX_HOME = String(flags.store);
  }
  if (flags.locale) {
    process.env.VIBEBOX_LOCALE = String(flags.locale);
  }
  if (flags.language) {
    if (!flags.locale) {
      delete process.env.VIBEBOX_LOCALE;
    }
    process.env.VIBEBOX_LANGUAGE = String(flags.language);
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
        technicalOutcome: flags['technical-outcome'] || flags.technicalOutcome,
        userAcceptance: flags['user-acceptance'] || flags.userAcceptance,
        finalOutcome: flags['final-outcome'] || flags.finalOutcome,
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
        manualReview: flags['manual-review'] || flags.review || false,
        source: { kind: flags.event ? 'event' : 'cli_extract', id: flags.event || null }
      });
      const projectId = candidates.find((candidate) => candidate.projectId)?.projectId || 'global';
      return `Extracted ${candidates.length} candidate(s).\nProject: ${projectId}`;
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
        technicalOutcome: flags['technical-outcome'] || flags.technicalOutcome,
        userAcceptance: flags['user-acceptance'] || flags.userAcceptance,
        finalOutcome: flags['final-outcome'] || flags.finalOutcome,
        outcome: flags.outcome || 'unknown',
        manualReview: flags['manual-review'] || flags.review || false,
        notes: flags.notes || fileText
      });
      return result.message;
    }

    case 'report':
      return generateReport(root, { locale: flags.locale });

    case 'blackbox': {
      return generateBlackboxReport(root, {
        limit: flags.limit,
        type: flags.type,
        since: flags.since,
        locale: flags.locale
      });
    }

    case 'doctor': {
      const report = await runDoctor(root);
      return formatDoctorReport(report, { locale: flags.locale });
    }

    case 'backup': {
      const result = await backupVibeBox(root, {
        output: flags.output || flags.to || args[0],
        includeLogs: flags['exclude-logs'] ? false : flags['include-logs'] !== false
      });
      return `VibeBox backup created at ${result.backupPath}`;
    }

    case 'restore': {
      const result = await restoreVibeBox(root, {
        from: flags.from || flags.path || args[0],
        confirmReplace: Boolean(flags['confirm-replace'] || flags.yes),
        yes: Boolean(flags.yes)
      });
      return [
        `VibeBox store restored from ${result.restoredFrom}`,
        `Store: ${result.storeRoot}`,
        'Restore used destructive replace, not merge.'
      ].join('\n');
    }

    case 'convert-lang': {
      const from = args[0] || flags.from || '';
      const to = args[1] || flags.to || flags.language || flags.target || '';
      if (!to) throw new Error('convert-lang requires source and target language, for example: vibebox convert-lang ko en');
      const result = await convertLanguage(root, { from, to });
      return `VibeBox language converted to ${result.language} (${result.locale}). Raw logs were not changed.`;
    }

    case 'language': {
      if (args[0] !== 'convert') {
        throw new Error(`Unknown language command: ${args[0] || ''}\n\n${help()}`);
      }
      const to = args[2] || flags.to || flags.language || flags.target || '';
      if (!to) throw new Error('language convert requires source and target language, for example: vibebox language convert ko en');
      const result = await convertLanguage(root, {
        from: args[1] || flags.from || '',
        to
      });
      return `VibeBox language converted to ${result.language} (${result.locale}). Raw logs were not changed.`;
    }

    case 'rebuild': {
      const result = await rebuildVibeBox(root, {
        indexOnly: Boolean(flags['index-only']),
        semantic: !flags['index-only'],
        cleanup: flags.cleanup !== false
      });
      return `VibeBox rebuild complete. semantic=${result.semantic}`;
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
