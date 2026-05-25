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

## `vibebox init`

- Purpose: Create the global VibeBox user store at `~/.vibebox` by default, or at `VIBEBOX_HOME` when configured.
- Typical usage: Run once for the user store; it can be invoked from any project.
- Example: `vibebox init`
- Notes: Existing VibeBox files are preserved. VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.

## `vibebox capture`

- Purpose: Append a raw blackbox event from CLI options to the global log with the current `projectId`.
- Typical usage: Record a request, summary, command result, changed files, feedback, and outcome.
- Example: `vibebox capture --request "Fix table scrolling" --summary "Kept package.json unchanged" --changed-files "src/table.mjs" --outcome success`
- Notes: Supports `--event-type`, `--request`, `--summary`, `--command`, `--command-result`, `--changed-files`, `--feedback`, and `--outcome`.

## `vibebox extract`

- Purpose: Convert raw text or current-project event context into pending memory candidates in the global store.
- Typical usage: Create candidates from a task summary or direct user statement.
- Example: `vibebox extract --text "Do not modify package.json unless explicitly requested."`
- Notes: Supports `--text`, `--file`, `--event`, and `--last-event`. Candidates are not active until approved.

## `vibebox review`

- Purpose: Show pending memory candidates for human review.
- Typical usage: Inspect candidates before approving or rejecting them.
- Example: `vibebox review`
- Notes: Prints ids, types, scopes, confidence, conflict status, and recommended action.

## `vibebox approve`

- Purpose: Promote one pending candidate into active memory.
- Typical usage: Approve a reviewed candidate by id.
- Example: `vibebox approve mem_abc123`
- Notes: Approval updates active indexes, namespace memory files, and related wiki pages. `global` memory goes under `global/`; project/task memory goes under `projects/{projectId}/`.

## `vibebox approve --safe`

- Purpose: Promote only candidates that are safe for batch approval.
- Typical usage: Approve no-conflict candidates while leaving conflict or uncertain candidates pending.
- Example: `vibebox approve --safe`
- Notes: Direct conflicts, supersedes, exceptions, duplicates, low-confidence records, and review-needed candidates are skipped.

## `vibebox reject`

- Purpose: Mark a pending candidate as rejected.
- Typical usage: Remove an unwanted candidate from review flow without deleting raw history.
- Example: `vibebox reject mem_abc123 --reason "Too task-specific"`
- Notes: Rejection applies to pending candidates only.

## `vibebox context`

- Purpose: Generate a compact Context Pack from active memory.
- Typical usage: Attach memory context to an agent prompt before work.
- Example: `vibebox context --task "Update dashboard dependency handling"`
- Notes: `pretask` is usually better before coding because it is more action-oriented.

## `vibebox pretask`

- Purpose: Generate an agent-ready Pre-Task Brief.
- Typical usage: Run before non-trivial coding or design work.
- Example: `vibebox pretask --task "Fix dashboard table scrolling"`
- Notes: Also accepts positional task text, such as `vibebox pretask "Fix dashboard table scrolling"`.

## `vibebox aftertask`

- Purpose: Capture task completion details and create pending memory candidates.
- Typical usage: Run after meaningful coding or design work.
- Example: `vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling" --files "src/table.mjs" --commands "npm.cmd test" --outcome success`
- Notes: Supports `--request`, `--summary`, `--files`, `--commands`, `--command-results`, `--errors`, `--feedback`, `--outcome`, `--notes`, and `--from-file`.

## `vibebox report`

- Purpose: Summarize current-project active memory, relevant global memory, and pending candidates.
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
- Notes: Checks global storage layout, current project identity, JSON parsing, index consistency, wiki links, suspicious raw secrets, and legacy project-local stores. Risky repair and migration remain manual.
