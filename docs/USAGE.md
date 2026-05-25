# VibeBox Usage

Run commands from the project root.

```bash
node bin/vibebox.mjs <command>
```

If installed or linked as a package, the same commands can be run as `vibebox <command>`.

## Initialize

```bash
node bin/vibebox.mjs init
```

Creates `.vibebox/` with config, wiki pages, JSON indexes, logs, and pending candidate storage. Existing files are not overwritten.

## Before a Task

```bash
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

or:

```bash
node bin/vibebox.mjs pretask "Fix dashboard table scrolling"
```

`pretask` prints a Pre-Task Brief for the AI coding agent. It emphasizes failure risks, success patterns, project guardrails, and potential conflicts.

## After a Task

```bash
node bin/vibebox.mjs aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --outcome success
```

For longer notes:

```bash
node bin/vibebox.mjs aftertask --from-file task-result.txt
```

`aftertask` writes a blackbox event and creates pending memory candidates. It does not create active memory.

## Review and Approval

```bash
node bin/vibebox.mjs review
node bin/vibebox.mjs approve <candidate-id>
node bin/vibebox.mjs reject <candidate-id>
```

Safe approval promotes only candidates that have no known conflict and sufficient confidence:

```bash
node bin/vibebox.mjs approve --safe
```

Conflict, exception, supersede, duplicate, and low-confidence candidates stay pending for explicit review.

## Context Pack

```bash
node bin/vibebox.mjs context --task "Update dashboard dependency handling"
```

`context` prints a compact memory pack. `pretask` is usually better before coding because it is more instruction-oriented.

## Capture and Extract

`capture` stores a raw event supplied by the user or agent:

```bash
node bin/vibebox.mjs capture --request "..." --summary "..." --outcome partial
```

`extract` turns text into pending candidates:

```bash
node bin/vibebox.mjs extract --text "Do not modify package.json unless explicitly requested."
```

## Reports

```bash
node bin/vibebox.mjs report
node bin/vibebox.mjs blackbox --limit 10
```

`report` summarizes active and pending memory. `blackbox` summarizes recent task events, failed approaches, successful approaches, changed files, and prevention rules.

## Doctor

```bash
node bin/vibebox.mjs doctor
```

Checks required files, JSON parsing, index consistency, wiki references, and suspicious unredacted secrets in raw logs.

## Examples

Dashboard database preference:

```bash
node bin/vibebox.mjs extract --text "For dashboard reporting modules, MSSQL fits better because the reporting views already live there."
```

App database preference:

```bash
node bin/vibebox.mjs extract --text "For small app prototypes, Supabase is usually fine unless this project has a database decision."
```

Package avoid rule:

```bash
node bin/vibebox.mjs extract --text "Do not modify package.json unless explicitly requested; dependency churn has broken reviews before."
```

Failed layout approach:

```bash
node bin/vibebox.mjs aftertask --request "Fix table scroll" --summary "Tried changing global body overflow." --errors "Global overflow caused layout regressions." --outcome failure
```

Successful table scroll pattern:

```bash
node bin/vibebox.mjs aftertask --request "Fix wide table scroll" --summary "Wrapper-based table scrolling worked without global layout changes." --outcome success
```

Project decision:

```bash
node bin/vibebox.mjs extract --text "We decided this project uses ECharts for dashboard visualization after rejecting Chart.js."
```
