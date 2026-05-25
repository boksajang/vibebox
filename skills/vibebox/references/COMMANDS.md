# VibeBox Command Reference

Use the installed command when available:

```bash
vibebox <command>
```

Fallback inside the VibeBox repository:

```bash
node bin/vibebox.mjs <command>
```

Do not invent commands or flags. The examples below reflect the current CLI surface.

## `vibebox init`

- Purpose: Create the local `.vibebox/` storage layout.
- Typical use: Run once at the root of a repository.
- Example: `vibebox init`
- Output purpose: Reports where VibeBox was initialized and how many missing items were created.
- Notes: Existing VibeBox files are preserved.

## `vibebox capture`

- Purpose: Append a raw blackbox event from CLI options.
- Typical use: Record a request, summary, command result, changed files, feedback, and outcome.
- Example: `vibebox capture --request "Fix table scrolling" --summary "Kept package.json unchanged" --changed-files "src/table.mjs" --outcome success`
- Output purpose: Returns the captured event id.
- Notes: Supported options include `--event-type`, `--request`, `--summary`, `--command`, `--command-result`, `--changed-files`, `--feedback`, and `--outcome`.

## `vibebox extract`

- Purpose: Convert raw text or event context into pending memory candidates.
- Typical use: Create candidates from a task summary or direct user statement.
- Example: `vibebox extract --text "Do not modify package.json unless explicitly requested."`
- Output purpose: Reports how many pending candidates were created.
- Notes: Supports `--text`, `--file`, `--event`, and `--last-event`. Candidates are not active until approved.

## `vibebox review`

- Purpose: Show pending memory candidates for human review.
- Typical use: Inspect candidates before approving or rejecting them.
- Example: `vibebox review`
- Output purpose: Prints ids, types, scopes, confidence, conflict status, and recommended action.
- Notes: Review output is meant to be readable by humans and agents.

## `vibebox approve`

- Purpose: Promote one pending candidate into active memory.
- Typical use: Approve a reviewed candidate by id.
- Example: `vibebox approve mem_abc123`
- Output purpose: Confirms the approved memory id.
- Notes: Approval updates active indexes and related wiki pages.

## `vibebox approve --safe`

- Purpose: Promote only candidates that are safe for batch approval.
- Typical use: Approve no-conflict candidates while leaving conflict or uncertain candidates pending.
- Example: `vibebox approve --safe`
- Output purpose: Reports approved and skipped counts.
- Notes: Direct conflicts, supersedes, exceptions, duplicates, low-confidence records, and review-needed candidates are skipped.

## `vibebox reject`

- Purpose: Mark a pending candidate as rejected.
- Typical use: Remove an unwanted candidate from review flow without deleting raw history.
- Example: `vibebox reject mem_abc123 --reason "Too task-specific"`
- Output purpose: Confirms the rejected memory id.
- Notes: Rejection applies to pending candidates only.

## `vibebox context`

- Purpose: Generate a compact Context Pack from active memory.
- Typical use: Attach memory context to an agent prompt before work.
- Example: `vibebox context --task "Update dashboard dependency handling"`
- Output purpose: Prints relevant user preferences, project decisions, avoid rules, failure memory, success patterns, and guidance.
- Notes: `pretask` is usually better before coding because it is more action-oriented.

## `vibebox pretask`

- Purpose: Generate an agent-ready Pre-Task Brief.
- Typical use: Run before non-trivial coding or design work.
- Example: `vibebox pretask --task "Fix dashboard table scrolling"`
- Output purpose: Prints task context, known risks, success patterns, project guardrails, potential conflicts, and instructions for the agent.
- Notes: Also accepts positional task text, such as `vibebox pretask "Fix dashboard table scrolling"`.

## `vibebox aftertask`

- Purpose: Capture task completion details and create pending memory candidates.
- Typical use: Run after meaningful coding or design work.
- Example: `vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling" --files "src/table.mjs" --commands "npm.cmd test" --outcome success`
- Output purpose: Confirms blackbox capture and points to review.
- Notes: Supports `--request`, `--summary`, `--files`, `--commands`, `--command-results`, `--errors`, `--feedback`, `--outcome`, `--notes`, and `--from-file`.

## `vibebox report`

- Purpose: Summarize current active memory and pending candidates.
- Typical use: Inspect project memory state without dumping raw logs.
- Example: `vibebox report`
- Output purpose: Prints grouped memory sections and potential conflicts.
- Notes: Useful before cleanup, review, or sharing project memory state with an agent.

## `vibebox blackbox`

- Purpose: Summarize recent task history as a blackbox report.
- Typical use: Understand repeated failures, successful approaches, decisions, and frequently changed files.
- Example: `vibebox blackbox --limit 10`
- Output purpose: Prints timeline, failed approaches, successful approaches, rejected directions, confirmed decisions, recurring failure types, changed files, and prevention rules.
- Notes: Supports `--limit`, `--type`, and `--since`.

## `vibebox doctor`

- Purpose: Check VibeBox storage health.
- Typical use: Run after packaging changes, suspicious memory behavior, or manual edits.
- Example: `vibebox doctor`
- Output purpose: Prints errors and warnings for storage layout, JSON parsing, index consistency, wiki links, and suspicious raw secrets.
- Notes: Doctor reports problems; risky repair remains manual.
