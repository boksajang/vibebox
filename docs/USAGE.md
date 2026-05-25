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

`vibebox init` creates `.vibebox/` inside the current project. That folder is runtime state: config, local wiki pages, JSON indexes, raw logs, and pending memory candidates.

For public repositories, `.vibebox/` should usually stay uncommitted. This repository ignores `.vibebox/`, `.vscode/`, `node_modules/`, temp output, and common log files.

## Project Initialization

```bash
vibebox init
```

Fallback:

```bash
node bin/vibebox.mjs init
```

Initialization creates missing VibeBox files and preserves existing ones.

## Pre-Task Usage

Run before non-trivial coding or design work:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

or:

```bash
vibebox pretask "Fix dashboard table scrolling"
```

`pretask` prints a Pre-Task Brief with relevant active memory, known failure risks, success patterns, project guardrails, potential conflicts, and instructions for the agent.

## After-Task Usage

Run after meaningful work:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --outcome success
```

For longer notes:

```bash
vibebox aftertask --from-file task-result.txt
```

`aftertask` writes a blackbox event and creates pending memory candidates. It does not create active memory.

## Capture And Extract

`capture` records a raw event supplied by the user or agent:

```bash
vibebox capture --request "..." --summary "..." --outcome partial
```

`extract` turns text or event context into pending candidates:

```bash
vibebox extract --text "Do not modify package.json unless explicitly requested."
```

## Review And Approval

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

Safe approval promotes only candidates with sufficient confidence and no known conflict:

```bash
vibebox approve --safe
```

Conflict, exception, supersede, duplicate, low-confidence, and review-needed candidates remain pending for explicit review.

## Context Pack

```bash
vibebox context --task "Update dashboard dependency handling"
```

`context` prints a compact memory pack. `pretask` is usually better before coding because it is more instruction-oriented.

## Reports

```bash
vibebox report
vibebox blackbox --limit 10
```

`report` summarizes active and pending memory. `blackbox` summarizes recent task events, failed approaches, successful approaches, changed files, decisions, and prevention rules.

## Doctor

```bash
vibebox doctor
```

`doctor` checks required files, JSON parsing, index consistency, wiki references, and suspicious unredacted secrets in raw logs.

## External Project Workflow

After `npm link`, VibeBox can be used from another repository:

```bash
cd path/to/another-project
vibebox init
vibebox pretask --task "Check project memory before editing"
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --outcome success
vibebox extract --text "Do not modify package.json unless explicitly requested."
vibebox review
vibebox approve <candidate-id>
vibebox context --task "Change dependency handling"
vibebox report
vibebox blackbox --limit 5
vibebox doctor
```

On Windows PowerShell, use `vibebox.cmd` for the same commands if `vibebox` is blocked.

## Troubleshooting

- If `vibebox` is not found, run `npm link` from the VibeBox repository or use `node bin/vibebox.mjs <command>`.
- If PowerShell blocks `vibebox.ps1`, use `vibebox.cmd <command>`.
- If pre-task output is empty, approve relevant pending memory first with `review` and `approve`.
- If indexes or wiki files look inconsistent, run `vibebox doctor`.
- Do not fix runtime state by committing `.vibebox/` to a public repository.

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
