# VibeBox Command Reference

This reference documents the current CLI surface only.

Preferred command after install or `npm link`:

```bash
vibebox <command>
```

Windows PowerShell may block npm's `.ps1` shim. Use:

```bash
vibebox.cmd <command>
```

Fallback inside the VibeBox repository:

```bash
node bin/vibebox.mjs <command>
```

Global store override:

```bash
VIBEBOX_HOME=/path/to/store vibebox <command>
vibebox <command> --store /path/to/store
```

Language override for human-facing headings:

```bash
VIBEBOX_LOCALE=ko-KR vibebox pretask --task "검증 절차 확인"
VIBEBOX_LANGUAGE=en-US vibebox report
vibebox report --language ja-JP
```

Human-facing output follows explicit CLI options, environment variables, config, and user input language policy. Active memory and wiki user-facing text are normalized to the configured memory language when an agent runtime performs semantic work. Raw logs preserve diagnostic source text. JSON field names, command names, and enum values stay English.

## `vibebox init`

- Purpose: Create the global VibeBox user store at `~/.vibebox` by default, or at `VIBEBOX_HOME` when configured.
- Typical usage: Run once for the user store; it can be invoked from any project.
- Example: `vibebox init`
- Notes: Existing VibeBox files are preserved. VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.

## `vibebox capture`

- Purpose: Append a raw blackbox event from CLI options to the global log with the current `projectId`.
- Typical usage: Record a request, summary, command result, changed files, feedback, technical outcome, user acceptance, and final outcome.
- Example: `vibebox capture --request "Fix table scrolling" --summary "Kept package.json unchanged" --changed-files "src/table.mjs" --technical-outcome success --user-acceptance accepted`
- Notes: Supports `--event-type`, `--request`, `--summary`, `--command`, `--command-result`, `--changed-files`, `--feedback`, `--outcome`, `--technical-outcome`, `--user-acceptance`, and `--final-outcome`. Technical success and user acceptance are separate; user rejection wins over a passing command.

## `vibebox extract`

- Purpose: Convert raw text or current-project event context into memory candidates, then run the Auto Curator.
- Typical usage: Create active guidance, replacements, discarded noise, or quarantined candidates from a task summary or direct user statement.
- Example: `vibebox extract --text "Do not modify package.json unless explicitly requested."`
- Notes: Supports `--text`, `--file`, `--event`, `--last-event`, and `--manual-review`. Normal extraction auto-curates candidates; `--manual-review` keeps candidates pending for debug or override workflows.

## `vibebox review`

- Purpose: Show legacy/manual debug pending candidates.
- Typical usage: Inspect candidates only when debugging, auditing, or overriding Auto Curator decisions.
- Example: `vibebox review`
- Notes: Prints ids, types, scopes, confidence, conflict status, and recommended action.

## `vibebox approve`

- Purpose: Manually promote one pending candidate into active memory.
- Typical usage: Override or debug Auto Curator behavior by id.
- Example: `vibebox approve mem_abc123`
- Notes: Approval updates active indexes, namespace memory files, relation index, and related wiki pages. `global` memory goes under `global/`; project/task memory goes under `projects/{projectId}/`. Replacement, correction, and same-subject refinement remove older competing memory from active retrieval.

## `vibebox approve --safe`

- Purpose: Manually promote only candidates that are safe for batch approval.
- Typical usage: Batch-approve legacy/manual debug candidates while leaving conflict or uncertain candidates pending.
- Example: `vibebox approve --safe`
- Notes: Direct conflicts, supersedes, exceptions, duplicates, low-confidence records, and review-needed candidates are skipped.

## `vibebox reject`

- Purpose: Mark a pending candidate as rejected during manual override.
- Typical usage: Remove an unwanted candidate from debug review flow without deleting raw history.
- Example: `vibebox reject mem_abc123 --reason "Too task-specific"`
- Notes: Rejection applies to pending candidates only.

## `vibebox context`

- Purpose: Generate a compact Context Pack from active memory.
- Typical usage: Attach memory context to an agent prompt before work.
- Example: `vibebox context --task "Update dashboard dependency handling"`
- Notes: `pretask` is usually better before coding because it is more action-oriented. Context can include validation, process, design, correction, and agent failure/success patterns when relevant.

## `vibebox pretask`

- Purpose: Generate an agent-ready Pre-Task Brief.
- Typical usage: Run before non-trivial coding or design work.
- Example: `vibebox pretask --task "Fix dashboard table scrolling"`
- Notes: Also accepts positional task text, such as `vibebox pretask "Fix dashboard table scrolling"`. The brief is situation-aware and prioritizes failure prevention for debugging, validation patterns for verification, and design philosophy for architecture work.

## `vibebox aftertask`

- Purpose: Capture task completion details, extract memory candidates, and run Auto Curator.
- Typical usage: Run after meaningful coding or design work.
- Example: `vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling" --files "src/table.mjs" --commands "npm.cmd test" --technical-outcome success --user-acceptance accepted`
- Notes: Supports `--request`, `--summary`, `--files`, `--commands`, `--command-results`, `--errors`, `--feedback`, `--outcome`, `--technical-outcome`, `--user-acceptance`, `--final-outcome`, `--notes`, `--from-file`, and `--manual-review`. User-rejected outcomes become failure/correction/prevention guidance instead of `success_pattern`.

## `vibebox report`

- Purpose: Summarize current-project active memory, relevant global memory, user patterns, and manual-debug pending state.
- Typical usage: Inspect memory state without dumping raw logs.
- Example: `vibebox report`
- Notes: Useful before cleanup, review, or sharing project memory state with an agent.

## `vibebox blackbox`

- Purpose: Summarize recent current-project task history as a blackbox report.
- Typical usage: Understand repeated failures, successful approaches, decisions, and frequently changed files.
- Example: `vibebox blackbox --limit 10`
- Notes: Supports `--limit`, `--type`, and `--since`.

## `vibebox doctor`

- Purpose: Check global-store health and current project identity.
- Typical usage: Run after packaging changes, suspicious memory behavior, or manual edits.
- Example: `vibebox doctor`
- Notes: Read-only. Checks global storage layout, current project identity, JSON parsing, index consistency, localized wiki links, suspicious raw secrets, duplicate localized docs, and legacy project-local stores. It does not register the user home or mutate the project registry.

## `vibebox backup`

- Purpose: Copy the global VibeBox store to a portable backup directory.
- Typical usage: Run before manual maintenance, restore testing, or language conversion.
- Example: `vibebox backup --output ./vibebox-backup`
- Notes: Works in normal CLI mode. The backup includes config, active graph, indexes, wiki, registry, namespace memory files, pending/debug records, and logs unless `--exclude-logs` is used.

## `vibebox restore`

- Purpose: Restore a backup as a destructive replacement of the current global store.
- Typical usage: Recover from a bad manual edit or test backup integrity.
- Example: `vibebox restore --from ./vibebox-backup --confirm-replace`
- Notes: Restore is replace, not merge. If the store exists, VibeBox refuses to continue until `--confirm-replace` or `--yes` is supplied.

## `vibebox convert-lang`

- Purpose: Convert active memory and the Obsidian active wiki to another configured memory language.
- Typical usage: `vibebox convert-lang ko en`
- Alias: `vibebox language convert ko en`
- Notes: Requires an AI agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`. Without it, the command exits before changing files. Raw logs are not modified. JSON field names, enum values, and command names stay English.

## `vibebox rebuild`

- Purpose: Rebuild active indexes, relation graph, namespace files, localized wiki files, and doc registry from active memory.
- Typical usage: `vibebox rebuild`
- Notes: Semantic rebuild requires an AI agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`. Use `vibebox rebuild --index-only` for the non-semantic index repair path.
