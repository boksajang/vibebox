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

The current working project is identified from the current directory, using git remote origin first, then `package.json` name, then the git root folder name, then the current folder name. Project memory is stored under `projects/{projectId}/` inside the global store. VibeBox does not create `.vibebox/`, pointer files, or hidden metadata inside work repositories.

The global store contains:

- `config.json`
- `global/` for user-wide preferences and rules
- `projects/{projectId}/` for project decisions, failures, successes, and workflow rules
- `wiki/` for the Obsidian-compatible cross-project wiki
- `index/` for retrieval indexes
- `logs/events.jsonl` for raw blackbox events with `projectId`
- `pending/memory-candidates.jsonl` for legacy/manual debug candidates with `projectId` or `scope`
- `registry/projects.json` for known project identities

`config.json` includes `locale`, `outputLanguage`, `wikiLanguage`, `reportLanguage`, and `contextLanguage`. Human-facing output follows explicit CLI options, `VIBEBOX_LOCALE`, `VIBEBOX_LANGUAGE`, config, and user input language policy. It is not limited to Korean or English. Stored memory text is preserved, JSON field names, command names, and enum values remain English, and VibeBox does not use external translation APIs.

## Project Initialization

```bash
vibebox init
```

Fallback:

```bash
node bin/vibebox.mjs init
```

Initialization creates missing global-store files, preserves existing ones, and registers or refreshes the current project identity. It does not write runtime state into the current project.

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

## After-Task Usage

Run after meaningful work:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --outcome success
```

For longer notes:

```bash
vibebox aftertask --from-file task-result.txt
```

`aftertask` writes a blackbox event, extracts candidates, and lets the Auto Curator decide whether each candidate becomes active, replaces older active memory, is discarded, or is quarantined. Users do not need to review memory after every task.

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

## Context Pack

```bash
vibebox context --task "Update dashboard dependency handling"
```

`context` prints a compact memory pack. `pretask` is usually better before coding because it is more instruction-oriented.

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

## External Project Workflow

After `npm link`, VibeBox can be used from another repository:

```bash
cd path/to/another-project
vibebox init
vibebox pretask --task "Check project memory before editing"
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --outcome success
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
vibebox aftertask --request "Fix wide table scroll" --summary "Wrapper-based table scrolling worked without global layout changes." --outcome success
```

Project decision:

```bash
vibebox extract --text "We decided this project uses ECharts for dashboard visualization after rejecting Chart.js."
```
