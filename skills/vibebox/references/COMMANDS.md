# VibeBox Command Reference

This reference documents the current CLI surface only.

Preferred command after install or `npm link` outside Windows:

```bash
vibebox <command>
```

Windows/Codex direct command preference:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

Do not use `powershell.exe -Command` as a default VibeBox example. If no direct invocation is possible, treat that wrapper as a last-resort fallback and explain that host approval layers may classify wrappers as higher risk than direct `vibebox.cmd` calls.

Global store override:

```bash
VIBEBOX_HOME=/path/to/store vibebox <command>
vibebox <command> --store /path/to/store
```

VibeBox uses one global store as the single source of truth. Sandboxed hosts may require approval to read or write that store when it lives at `~/.vibebox` or outside the current workspace. Do not create workspace-local snapshots, copied memory stores, or project-local `.vibebox` folders as a fallback.

Read-only or inspection commands:

- `vibebox pretask`
- `vibebox context`
- `vibebox report`
- `vibebox blackbox`
- `vibebox doctor` when used for inspection

These commands should not modify repository files, but they read the global VibeBox store. `pretask` and `context` do not create project registry entries; they can only report guidance from an already accessible store.

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

These commands create, update, export, restore, or maintain files in the global VibeBox store. `init`, `aftertask`, and `capture` can register the current project when write access is available.

Permission failure guidance: if a sandbox denies `~/.vibebox` or `$VIBEBOX_HOME`, report that VibeBox global store access is required. For `pretask` or `context`, request read-only global VibeBox store access and report guidance unavailable if approval is denied. For `aftertask`, request global VibeBox store write access for aftertask capture; if approval is denied, report that project registration, active memory, and wiki updates did not happen. Do not work around the denial by copying memory into the workspace.

Aftertask rerun shape after approval:

```bash
vibebox.cmd aftertask --request "<original user request or faithful summary>" --summary "..." --candidates-file structured-candidates.json --technical-outcome success --user-acceptance accepted
```

If the original capture used a long record file:

```bash
vibebox.cmd aftertask --from-file task-result.txt
```

Memory language seed for a new store:

```bash
VIBEBOX_LANGUAGE=ko-KR vibebox init
vibebox init --language ko-KR
```

`VIBEBOX_LOCALE` is only an environment hint. Obsidian wiki managed text follows the configured strict BCP 47 `memoryLanguage`; active JSON memory stays canonical. Raw logs preserve diagnostic source text. JSON field names, command names, relation types, and enum values stay English.

## `vibebox init`

- Purpose: Create the global VibeBox user store at `~/.vibebox` by default, or at `VIBEBOX_HOME` when configured.
- Typical usage: Run once for the user store; it can be invoked from any project.
- Example: `vibebox init`
- Notes: Existing VibeBox files are preserved. VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.

## `vibebox capture`

- Purpose: Append a raw blackbox event from CLI options to the global log with the current `projectId`.
- Typical usage: Record the original user request or faithful request summary, AI action summary, command result, changed files, feedback, technical outcome, user acceptance, and final outcome.
- Example: `vibebox capture --request "Fix table scrolling" --summary "Kept package.json unchanged" --changed-files "src/table.mjs" --technical-outcome success --user-acceptance accepted`
- Notes: Supports `--event-type`, `--request`, `--summary`, `--command`, `--command-result`, `--changed-files`, `--feedback`, `--outcome`, `--technical-outcome`, `--user-acceptance`, and `--final-outcome`. Technical success and user acceptance are separate; user rejection wins over a passing command.

## `vibebox extract`

- Purpose: Ingest AI-agent structured memory candidates, then run validation, dedupe, replacement safety, indexes, and wiki rendering.
- Typical usage: Debug or manually ingest candidate JSON created by the agent.
- Example: `vibebox extract --candidates '[{"candidateId":"mem_demo","memoryRole":"user_success_criteria","type":"avoid_rule","modelClass":"user_model","modelSubClass":"rejection_criteria_model","scope":"global","primaryCategory":"global_avoid_rules","relatedCategories":["user_patterns"],"title":"Package guardrail","summary":"Do not modify package.json unless explicitly requested.","rule":"Do not modify package.json unless explicitly requested.","displayTitle":"Package guardrail","displaySummary":"Do not modify package.json unless explicitly requested.","displayRule":"Do not modify package.json unless explicitly requested.","displayLanguage":"en-US","confidence":"high","sourceType":"agent_semantic_extraction"}]'`
- Notes: Raw `--text`, `--file`, `--event`, or `--last-event` are raw evidence/debug inputs only; Core does not semantically extract active memory from them without structured candidates. `--manual-review` keeps candidates pending for debug or override workflows.

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
- Windows/Codex example: `vibebox.cmd context --task "Update dashboard dependency handling"`
- Cross-platform example: `vibebox context --task "Update dashboard dependency handling"`
- Notes: Read-only memory retrieval for repository files. It prints active guidance and should not modify repository files, but it needs read access to the global VibeBox store. `pretask` is usually better before coding because it is more action-oriented. Context can include `User Success Criteria`, `AI Failure Avoidance`, `AI Successful Approaches`, validation, process, design, correction, and agent failure/success patterns when relevant.

## `vibebox pretask`

- Purpose: Generate an agent-ready Pre-Task Brief.
- Typical usage: Run before non-trivial coding or design work.
- Windows/Codex example: `vibebox.cmd pretask --task "Fix dashboard table scrolling"`
- Cross-platform example: `vibebox pretask --task "Fix dashboard table scrolling"`
- Notes: Read-only memory retrieval for repository files. It prints active guidance and should not modify repository files, but it needs read access to the global VibeBox store. Also accepts positional task text, such as `vibebox pretask "Fix dashboard table scrolling"`. If a host approval layer blocks a wrapper-style command, retry direct `vibebox.cmd pretask --task "..."` before falling back to `node bin/vibebox.mjs pretask --task "..."`. If a sandbox blocks `~/.vibebox`, request read-only global VibeBox store access. The brief is situation-aware and prioritizes the three main guidance lanes: `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`. Agents should use those lanes in the actual plan, not only display them.

## `vibebox aftertask`

- Purpose: Write/capture task completion details and ingest AI-agent structured memory candidates.
- Typical usage: Run after meaningful coding or design work. Always pass the original user request, or a faithful semantic summary of it, with `--request`, and always pass AI-agent structured candidates with `--candidates`, `--candidates-file`, `--structured-candidates-file`, or a `Structured memory candidates:` section.
- Windows/Codex example: `vibebox.cmd aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling" --candidates "<agent-candidate-json>" --files "src/table.mjs" --commands "npm.cmd test" --technical-outcome success --user-acceptance accepted`
- Cross-platform example: `vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling" --candidates "<agent-candidate-json>" --files "src/table.mjs" --commands "npm.cmd test" --technical-outcome success --user-acceptance accepted`
- Notes: Supports `--request`, `--summary`, `--files`, `--commands`, `--command-results`, `--errors`, `--feedback`, `--outcome`, `--technical-outcome`, `--user-acceptance`, `--final-outcome`, `--notes`, `--from-file`, `--candidates`, `--candidates-file`, `--structured-candidates-file`, and `--manual-review`. `--from-file` may include `User request:`, `AI action summary:`, `Changed files:`, `Commands:`, `Errors:`, and `Structured memory candidates:` sections. This is a global store write/capture operation and may need approved write access in sandboxed hosts. Without structured candidates, Core records raw evidence and warns instead of creating active memory. Core does not semantically interpret `userRequest`, headings, bullets, keywords, raw action summaries, or command output. User-request-based memory normally uses `sourceType: agent_semantic_extraction`; active technical failure memory also requires an agent candidate.
- Candidate contract: after meaningful work, the agent should split reusable meaning into multiple candidates when the request contains separate success criteria, validation rules, reporting preferences, failure-prevention rules, project/domain/user patterns, successful approaches, task context, or discarded details. If the agent submits exactly one candidate for a captured `userRequest`, include `whyOnlyOneCandidate`; otherwise Core reports the missing contract field, not a semantic quality judgment. If there is no reusable memory, submit a `no_reusable_memory_candidate` item with `noCandidateReason`.
- Wiki language: the agent writes `displayTitle`, `displaySummary`, `displayRule`, and `displayLanguage` for the configured `memoryLanguage`. Core does not translate missing display text; it records a display-text-missing diagnostic instead of presenting canonical English as localized Wiki prose.

## `vibebox report`

- Purpose: Summarize current-project active memory, relevant global memory, user patterns, and manual-debug pending state.
- Typical usage: Inspect memory state without dumping raw logs.
- Example: `vibebox report`
- Notes: Read-only inspection in normal report mode. Useful before cleanup, review, or sharing project memory state with an agent.

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

- Purpose: Convert the Obsidian wiki display layer to another configured memory language.
- Typical usage: `vibebox convert-lang ko-KR en-US`
- Alias: `vibebox language convert ko-KR en-US`
- Notes: Requires an AI agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and agent-provided localized display candidates. Without them, the command exits before changing files. Core applies BCP 47 validation, Markdown filename changes, category folders, headings, aliases, links, Recent Active Memory, memory notes, and `registry/wiki-docs.json`; it does not translate meaning. Raw logs and internal JSON field names, enum values, relation types, and command names stay English/canonical.

## `vibebox rebuild`

- Purpose: Rebuild active indexes, relation graph, namespace files, localized wiki files, category-based memory notes, and doc registry from active memory.
- Typical usage: `vibebox rebuild`
- Notes: Semantic rebuild requires an AI agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and agent-provided semantic data. Use `vibebox rebuild --index-only` for the non-semantic index repair path. Core rebuilds files and integrity indexes; it does not reclassify categories, relations, titles, or summaries by reading raw requests.
