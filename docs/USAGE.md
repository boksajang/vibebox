# VibeBox Usage

This is the practical guide for installing and running VibeBox.

## Requirements

- Node.js `>=20`
- npm for `npm install` and `npm link`

## Installation

From a clone:

```bash
npm install
```

To create a global development command:

```bash
npm link
vibebox --help
```

On Windows PowerShell, npm's `.ps1` shim can be blocked by execution policy. Use the generated command shim instead:

```bash
vibebox.cmd --help
```

The direct Node fallback works from the VibeBox repository root:

```bash
node bin/vibebox.mjs <command>
```

## Runtime Storage

`vibebox init` creates or updates one user-level global store. By default that store is `~/.vibebox` on macOS/Linux and `C:\Users\{USER}\.vibebox` on Windows. Set `VIBEBOX_HOME` or pass `--store <path>` to use a different store.

The current AI working directory is treated as a project workspace unless it is an excluded internal path such as the user home directory, the VibeBox global store, a drive root, `.codex`, `.agents`, plugin cache, `node_modules`, or the system temp root. Git remote origin and `package.json` name improve project identity when present; otherwise VibeBox uses the current folder name. Project memory is stored under `projects/{projectId}/` inside the global store. VibeBox does not create `.vibebox/`, pointer files, or hidden metadata inside work repositories.

The global store contains:

- `config.json`
- `global/` for user-wide preferences and rules
- `projects/{projectId}/` for project decisions, failures, successes, and workflow rules
- `wiki/` for the Obsidian-compatible cross-project wiki
- `index/` for retrieval indexes
- `logs/events.jsonl` for raw blackbox events with `projectId`
- `pending/memory-candidates.jsonl` for legacy/manual debug candidates with `projectId` or `scope`
- `registry/projects.json` for known project identities
- `registry/wiki-docs.json` for stable `docKey` to localized wiki filename/title/alias mapping

`config.json` stores one primary `memoryLanguage`. Obsidian filenames, category folders, headings, section labels, Recent Active Memory, managed summaries, aliases, and links follow that language. `VIBEBOX_LOCALE` is only an environment hint and does not rewrite an existing store. Raw logs can preserve source text. JSON field names, command names, relation types, enum values, file paths, and technical literals remain canonical, and VibeBox does not use external translation APIs.

## Project Initialization

```bash
vibebox init
```

Fallback:

```bash
node bin/vibebox.mjs init
```

Initialization creates missing global-store files and preserves existing ones. It registers or refreshes the current project identity for the current working directory unless that directory is an excluded internal path. Plain folders, static HTML/PHP folders, JSON-only app folders, and documentation folders can all be project workspaces when an AI coding agent is working there.

## Pre-Task Usage

Run before non-trivial coding or design work:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

or:

```bash
vibebox pretask "Fix dashboard table scrolling"
```

`pretask` prints a Pre-Task Brief with relevant active memory, validation and process patterns, known failure risks, prevention rules, success patterns, project guardrails, potential conflicts, and instructions for the agent. It chooses guidance by task situation, so debugging work emphasizes failure prevention and verification work emphasizes validation patterns.

The most important sections are:

- `User Success Criteria`: the user's current and remembered success conditions.
- `AI Failure Avoidance`: rejected directions, instruction misses, technical failures, environment failures, permission failures, tool failures, and prevention rules.
- `AI Successful Approaches`: reusable implementation, validation, command, recovery, or workaround methods.

Agents should apply these sections in the actual plan and work. Printing the guidance without using it is an incomplete VibeBox workflow.

## After-Task Usage

Run after meaningful work:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --technical-outcome success --user-acceptance accepted
```

For longer notes:

```bash
vibebox aftertask --from-file task-result.txt
```

`aftertask` writes a blackbox event, extracts candidates, and lets the Auto Curator decide whether each candidate becomes active, replaces older active memory, is discarded, or is quarantined. Users do not need to review memory after every task. The user's request can create active success criteria before a result exists. Technical success and user acceptance are separate; user acceptance is the user's reaction to the work result, not memory approval. Passing validation with no rejection can become an inferred AI successful approach. Rejected user feedback means the AI missed the user's criteria, so it becomes AI failure/correction/prevention guidance and updated success criteria, not user failure.

Do not call `aftertask` with only an AI action summary. Use `--request` or include a `User request:` section in a `--from-file` payload. If `userRequest` is missing, VibeBox records the event but skips active user success criteria extraction; clear command/tool/environment failures can still become AI failure memory.

## End-To-End Consumption Routine

A complete VibeBox cycle is:

1. Run `pretask` or `context` before work.
2. Read `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.
3. Write a plan that explicitly applies the relevant criteria, avoids relevant failures, and reuses relevant successful approaches.
4. Perform the work.
5. Run real validation when available.
6. Report changed files and validation results when the user's criteria require it.
7. Run `aftertask` with the original user request or faithful summary so the active graph can update.

This is the expected practical behavior for agents using the VibeBox skill or adapters.

## Capture And Extract

`capture` records a raw event supplied by the user or agent:

```bash
vibebox capture --request "..." --summary "..." --outcome partial
```

`extract` turns text or event context into memory candidates for Auto Curator handling:

```bash
vibebox extract --text "Do not modify package.json unless explicitly requested."
```

## Manual Review And Override

Normal workflows are auto-curated. Use these commands for debugging, audits, or manual override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

Safe approval is a manual/debug helper for no-conflict candidates:

```bash
vibebox approve --safe
```

Conflict, exception, supersede, duplicate, low-confidence, and review-needed candidates are discarded, quarantined, or left in legacy/manual pending state when automatic handling is not appropriate. When a candidate replaces or refines older active memory for the same subject and scope, the older memory is removed from active retrieval, Context Packs, Pre-Task Briefs, active wiki sections, active relations, and namespace files.

## Memory Language

`memoryLanguage` controls the human-facing display language. Internal JSON fields, enum values, relation types, command names, file paths, and raw logs stay canonical. Obsidian filenames, category folders, headings, Recent Active Memory, managed summaries, aliases, and links follow the configured language. Individual memory notes use human-readable filenames under category folders; ids remain in frontmatter. `VIBEBOX_LANGUAGE` or `--language` can seed a new store; `VIBEBOX_LOCALE` is only an environment hint and does not change an existing store. To intentionally change the wiki display language and localized filenames, run `convert-lang` from an adapter runtime.

## Context Pack

```bash
vibebox context --task "Update dashboard dependency handling"
```

`context` prints a compact memory pack. `pretask` is usually better before coding because it is more instruction-oriented.

`pretask` and `context` include three core guidance lanes when relevant:

- User Success Criteria: what the user wants, including style, validation, reporting, preservation, and project-specific criteria.
- AI Failure Avoidance: preference mismatches, instruction misses, command failures, environment failures, permission failures, tool failures, and prevention rules.
- AI Successful Approaches: reusable implementation, validation, command, recovery, or workaround methods.

The Context Pack can include user patterns such as `validation_pattern`, `process_pattern`, `design_philosophy`, `correction_pattern`, and `agent_failure_pattern` when those patterns match the current task situation.

## Reports

```bash
vibebox report
vibebox blackbox --limit 10
```

`report` summarizes active memory and any legacy/manual debug pending state. `blackbox` summarizes recent task events, failed approaches, successful approaches, changed files, decisions, and prevention rules.

Reports and blackbox output are active-graph oriented. Raw logs remain diagnostic and are not treated as current guidance.

## Doctor

```bash
vibebox doctor
```

`doctor` checks the global store, current project identity, registry, JSON parsing, index consistency, wiki references, pending consistency, suspicious unredacted secrets in raw logs, and legacy project-local `.vibebox/` folders.

## Backup And Restore

Create a backup:

```bash
vibebox backup --output ./vibebox-backup
```

Restore by destructive replace:

```bash
vibebox restore --from ./vibebox-backup --confirm-replace
```

Restore never merges. If a store already exists, VibeBox prints a destructive replace warning and refuses to continue until explicitly confirmed.

## Language Conversion And Rebuild

Semantic operations require an AI agent runtime marker:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko en
VIBEBOX_AGENT_RUNTIME=adapter vibebox language convert ko en
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

Without `VIBEBOX_AGENT_RUNTIME` or an adapter-provided runtime marker, `convert-lang` and semantic `rebuild` exit before changing files. `convert-lang` updates the Obsidian display layer: Markdown filenames, category folders, headings, aliases, managed links, Recent Active Memory, category pages, project pages, memory notes, and the wiki-doc registry. Raw logs are not rewritten, and internal JSON field names, enum values, relation types, and command names stay English.

## External Project Workflow

After `npm link`, VibeBox can be used from another repository:

```bash
cd path/to/another-project
vibebox init
vibebox pretask --task "Check project memory before editing"
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --technical-outcome success --user-acceptance accepted
vibebox extract --text "Do not modify package.json unless explicitly requested."
vibebox context --task "Change dependency handling"
vibebox report
vibebox blackbox --limit 5
vibebox doctor
```

For manual debugging or override, add `vibebox review`, `vibebox approve <candidate-id>`, or `vibebox reject <candidate-id>`.

On Windows PowerShell, use `vibebox.cmd` for the same commands if `vibebox` is blocked.

## Troubleshooting

- If `vibebox` is not found, run `npm link` from the VibeBox repository or use `node bin/vibebox.mjs <command>`.
- If PowerShell blocks `vibebox.ps1`, use `vibebox.cmd <command>`.
- If you need an isolated store, set `VIBEBOX_HOME` before running commands.
- If pre-task output is empty, check whether events were captured and inspect active memory with `report`. Use `review` and `approve` only for legacy/manual override.
- If indexes or wiki files look inconsistent, run `vibebox doctor`.
- If `doctor` reports an old project-local `.vibebox/`, treat it as legacy. No destructive migration is performed automatically.

## Examples

Dashboard database preference:

```bash
vibebox extract --text "For dashboard reporting modules, MSSQL fits better because the reporting views already live there."
```

App database preference:

```bash
vibebox extract --text "For small app prototypes, Supabase is usually fine unless this project has a database decision."
```

Package avoid rule:

```bash
vibebox extract --text "Do not modify package.json unless explicitly requested; dependency churn has broken reviews before."
```

Failed layout approach:

```bash
vibebox aftertask --request "Fix table scroll" --summary "Tried changing global body overflow." --errors "Global overflow caused layout regressions." --outcome failure
```

Successful table scroll pattern:

```bash
vibebox aftertask --request "Fix wide table scroll" --summary "Wrapper-based table scrolling worked without global layout changes." --technical-outcome success --user-acceptance accepted
```

Project decision:

```bash
vibebox extract --text "We decided this project uses ECharts for dashboard visualization after rejecting Chart.js."
```
