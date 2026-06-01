# VibeBox Command Reference

This reference documents the current CLI surface.

Preferred installed command:

```bash
vibebox <command>
```

Windows/Codex command order:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

Do not use `powershell.exe -Command` as a default VibeBox example. Use it only when direct invocation is unavailable.

Global store override:

```bash
VIBEBOX_HOME=<USER_HOME>/vibebox-store vibebox <command>
vibebox <command> --store <USER_HOME>/vibebox-store
```

VibeBox uses one global store as the single source of truth. Do not create workspace-local memory snapshots, copied stores, or project-local `.vibebox` folders as a fallback.

## Access Categories

Read-only or inspection commands:

- `vibebox pretask`
- `vibebox context`
- `vibebox report`
- `vibebox blackbox`
- `vibebox doctor` when used for inspection

These commands read the global store. `pretask` and `context` do not create project registry entries.

Write or maintenance commands:

- `vibebox aftertask`
- `vibebox capture`
- `vibebox extract`
- `vibebox approve`
- `vibebox reject`
- `vibebox init`
- `vibebox backup`
- `vibebox restore`
- `vibebox convert-lang`
- `vibebox rebuild`

These commands create, update, export, restore, or maintain files in the global store. `init`, `aftertask`, and `capture` can register the current project when write access is available.

If access is denied, request the narrow global-store access needed. For `pretask` or `context`, request approved read-only global VibeBox store access. For `aftertask`, request approved global VibeBox store write access or report capture unavailable and state that project registration, active memory, and wiki updates did not happen.

## Language Policy

Seed a new store:

```bash
VIBEBOX_LANGUAGE=ko-KR vibebox init
vibebox init --language ko-KR
```

Configured `memoryLanguage` controls Obsidian Wiki display text. It must be a valid canonical BCP 47 language tag. Short aliases such as `ko`, `en`, `ja`, `cn`, or `tw` are not accepted.

Common examples:

- `ko-KR`
- `en-US`
- `ja-JP`
- `zh-CN`
- `zh-TW`
- `ar`

These are examples, not the full language limit.

`VIBEBOX_LOCALE` is only an environment hint. The AI Agent writes `displayTitle`, `displaySummary`, `displayRule`, and `displayLanguage` in the configured language. VibeBox Core validates the BCP 47 tag and renders files from the agent-provided display fields. Core does not translate, summarize, or generate missing user-facing display text.

## `vibebox init`

Purpose: create or update the global VibeBox user store.

Example:

```bash
vibebox init
```

Notes: existing VibeBox files are preserved. VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.

## `vibebox pretask`

Purpose: generate an agent-ready Pre-Task Brief from active memory.

Examples:

```bash
vibebox.cmd pretask --task "Fix dashboard table scrolling"
vibebox pretask --task "Fix dashboard table scrolling"
vibebox pretask "Fix dashboard table scrolling"
```

Notes: read-only retrieval. It should not modify repository files, but it needs read access to the global store. Agents should apply `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` in their actual work.

## `vibebox context`

Purpose: generate a compact Context Pack.

Examples:

```bash
vibebox.cmd context --task "Update dependency handling"
vibebox context --task "Update dependency handling"
```

Notes: read-only retrieval. `pretask` is usually better before acting because it includes direct agent instructions.

## `vibebox aftertask`

Purpose: capture task completion details and ingest AI-agent structured memory candidates.

Examples:

```bash
vibebox.cmd aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-level scrolling" --files "src/table.mjs" --commands "npm.cmd test" --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-level scrolling" --structured-candidates-file structured-candidates.json
```

Supported candidate inputs:

- `--candidates <json>`
- `--candidates-file <path>`
- `--structured-candidates-file <path>`
- `Structured memory candidates:` in a `--from-file` payload

Notes:

- Always pass the original user request or a faithful semantic summary with `--request` when active memory should connect to the user criteria.
- Do not call aftertask with only an AI action summary.
- Without candidates, VibeBox records the event and warns instead of creating active memory.
- Without structured candidates, Core records raw evidence and warns instead of creating active memory.
- Core does not semantically interpret `userRequest`, headings, bullets, keywords, summaries, or command output.
- If one candidate represents a captured complex request, include `whyOnlyOneCandidate`.
- If there is no reusable memory, submit `no_reusable_memory_candidate` with `noCandidateReason`.
- Wiki display fields must match configured `memoryLanguage`.

## `vibebox capture`

Purpose: append a raw diagnostic event to the global log.

Example:

```bash
vibebox capture --request "Fix table scrolling" --summary "Kept package setup unchanged" --changed-files "src/table.mjs" --technical-outcome success --user-acceptance unknown
```

Notes: raw capture does not create active memory by itself.

## `vibebox extract`

Purpose: ingest AI-agent structured candidates for validation, dedupe, replacement safety, indexes, and Wiki rendering.

Example:

```bash
vibebox extract --candidates-file structured-candidates.json
```

Notes: raw `--text`, `--file`, `--event`, or `--last-event` inputs are manual/debug evidence paths only. Core does not create active user memory from them without structured candidates. `--manual-review` keeps candidates pending for debug or override workflows.

## Legacy / Manual Debugging Only

Summary-only `aftertask` and raw-text `extract --text` are raw evidence/debug paths only. They do not create active memory because Core does not semantically interpret user requests, headings, bullets, keywords, raw action summaries, or command output.

## Manual Review Commands

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

Use these for debugging, audits, or manual override. Normal workflow is auto-curated.

## Reports

```bash
vibebox report
vibebox blackbox --limit 10
```

`report` summarizes active memory and legacy/manual debug pending state. `blackbox` summarizes recent diagnostic task history without dumping raw logs.

## `vibebox doctor`

Purpose: check global-store health and current project identity.

Example:

```bash
vibebox doctor
```

Notes: read-only inspection. It checks storage layout, JSON parsing, indexes, localized Wiki links, suspicious raw secrets, duplicate localized docs, orphan project pages, and legacy project-local stores.

## Backup And Restore

```bash
vibebox backup --output <USER_HOME>/vibebox-backup
vibebox restore --from <USER_HOME>/vibebox-backup --confirm-replace
```

Restore is destructive replacement, not merge.

## Language Conversion And Rebuild

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko-KR en-US
VIBEBOX_AGENT_RUNTIME=adapter vibebox language convert ko-KR en-US
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

These commands require an AI Agent runtime marker and agent-provided localized/semantic data. Core applies file operations, link rewrites, registry updates, indexes, and integrity checks; it does not translate, summarize, or reclassify memory by reading raw requests.

Use `vibebox rebuild --index-only` for non-semantic index repair.
