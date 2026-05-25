# VibeBox

VibeBox is a local-first memory middleware and blackbox recorder for AI coding sessions.

It helps an AI coding agent look up the user's project decisions, preferences, avoid rules, failure memories, and successful patterns before it starts answering, designing, or editing code. After the task, it records what happened as a blackbox event and creates pending memory candidates for review.

VibeBox is agent-neutral. It can sit in front of Codex, Claude Code, Gemini CLI, Cursor-style agents, or any workflow that can run a local command.

## Core Concept

AI coding agents often repeat the same mistakes:

- They forget project decisions.
- They suggest tools the user already rejected.
- They repeat failed approaches.
- They touch files that should stay stable.
- They force the user to explain the same rules again.

VibeBox reduces that loop with a review-first local memory layer.

```text
User task
-> vibebox pretask
-> Pre-Task Brief
-> AI coding agent works
-> vibebox aftertask
-> Blackbox Event
-> pending memory candidates
-> review / approve / reject
-> active memory for future tasks
```

## Local Storage

`vibebox init` creates a local `.vibebox/` directory:

```text
.vibebox/
  config.json
  wiki/
  index/
  logs/
  pending/
```

The wiki is for humans. The JSON indexes are for retrieval. The raw event log is evidence. Pending candidates are not active memory until approved.

## Quick Start

Run commands from the project root:

```bash
node bin/vibebox.mjs init
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

After the AI agent finishes:

```powershell
node bin/vibebox.mjs aftertask `
  --request "Fix dashboard table scrolling" `
  --summary "Used wrapper-based table scrolling and kept dependencies unchanged." `
  --files "src/table.mjs,src/layout.css" `
  --commands "npm.cmd test" `
  --outcome success
```

Then review and approve useful memory:

```bash
node bin/vibebox.mjs review
node bin/vibebox.mjs approve <candidate-id>
node bin/vibebox.mjs reject <candidate-id>
```

Safe batch approval skips conflict and low-confidence candidates:

```bash
node bin/vibebox.mjs approve --safe
```

## Common Workflow

1. Initialize VibeBox once with `init`.
2. Before work, run `pretask` with the user's task.
3. Give the Pre-Task Brief to the AI coding agent.
4. After work, run `aftertask` with the result summary.
5. Run `review` to inspect pending memory candidates.
6. Approve only memories that should affect future sessions.
7. Use `report`, `context`, `blackbox`, and `doctor` to inspect state.

## Commands

```bash
node bin/vibebox.mjs init
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
node bin/vibebox.mjs context --task "Fix dashboard table scrolling"
node bin/vibebox.mjs aftertask --request "..." --summary "..." --outcome success
node bin/vibebox.mjs capture --request "..." --summary "..."
node bin/vibebox.mjs extract --text "..."
node bin/vibebox.mjs review
node bin/vibebox.mjs approve <candidate-id>
node bin/vibebox.mjs approve --safe
node bin/vibebox.mjs reject <candidate-id>
node bin/vibebox.mjs report
node bin/vibebox.mjs blackbox --limit 10
node bin/vibebox.mjs doctor
```

## Pre-Task Brief

`pretask` produces an execution-oriented brief:

```text
VibeBox Pre-Task Brief

User Task:
Fix dashboard table scrolling.

Known Failure Risks:
- Global body overflow changes caused layout regressions before.

Known Success Patterns:
- Wrapper-based table scrolling worked successfully for wide dashboard tables.

Project Guardrails:
- Do not modify package.json unless explicitly requested.

Instruction for AI Agent:
- Analyze the repository before editing.
- Do not override the user's current explicit request.
- Avoid repeating known failed approaches.
```

Current project memory is ranked above global memory. If project memory conflicts with broader memory, VibeBox shows the conflict and instructs the agent to follow the current user request and repository reality.

## After-Task Capture

`aftertask` stores a blackbox event and then conservatively extracts pending candidates. It does not create active memory automatically.

Example:

```powershell
node bin/vibebox.mjs aftertask `
  --request "Improve dashboard table scrolling" `
  --summary "Wrapper scrolling worked; global overflow was avoided." `
  --files "src/components/Table.mjs" `
  --commands "npm.cmd test" `
  --outcome success `
  --feedback "Confirmed."
```

For longer result notes:

```bash
node bin/vibebox.mjs aftertask --from-file task-result.txt
```

## Reports

`report` summarizes current memory:

- User Preferences
- Project Decisions
- Architecture Rules
- Avoid Rules
- Failure Memory
- Success Patterns
- Tooling Preferences
- Workflow Rules
- Pending Candidates
- Potential Conflicts

`blackbox` summarizes recent task history:

- Task Timeline
- Failed Approaches
- Successful Approaches
- Rejected Directions
- Confirmed Decisions
- Recurring Failure Types
- Frequently Changed Files
- Prevention Rules

## Memory Types

VibeBox stores reviewed memory as:

- `user_preference`
- `project_decision`
- `architecture_rule`
- `avoid_rule`
- `failure_memory`
- `success_pattern`
- `tooling_preference`
- `coding_style`
- `design_preference`
- `workflow_rule`

Scopes are `global`, `domain`, `project`, `task`, and `temporary`.

## Review-First Policy

Extraction is conservative. New memory goes to pending first.

VibeBox does not treat a one-time comment as permanent truth. It also does not let old memory override the user's current explicit request. Low-confidence, conflicting, exception, and superseding candidates remain review items.

`review` shows a recommended action:

- `approve`
- `reject`
- `merge`
- `supersede`
- `keep pending`

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

## Obsidian-Compatible Wiki

The wiki lives in `.vibebox/wiki/`. Each file is Markdown with YAML frontmatter and Obsidian-style links such as `[[Dependency Management]]`.

VibeBox updates only the managed block:

```text
<!-- VIBEBOX:BEGIN -->
generated memory summary
<!-- VIBEBOX:END -->
```

Human notes outside that block are preserved.

## JSON Index

The index lives in `.vibebox/index/`:

```text
memory-index.json
keyword-index.json
relation-index.json
pending-index.json
```

`doctor` checks JSON parsing, pending/index consistency, memory/wiki links, relation references, and suspicious raw secrets.

## Local Privacy

VibeBox is local-first. It does not send memory anywhere by itself.

Sensitive-looking values such as API keys, tokens, passwords, bearer tokens, and connection strings are redacted before they can reach active memory, wiki pages, or context output. `doctor` warns if raw logs appear to contain unredacted secrets.

## Known Limitations

- Memory extraction is deterministic and heuristic-based, not an LLM.
- Classification is conservative, but not perfect.
- Interactive review editing is not implemented yet.
- The executable is currently used as `node bin/vibebox.mjs ...` unless installed or linked as `vibebox`.
- VibeBox records summaries and structured events; it is not a full chat transcript archive.

## Development

```bash
npm.cmd run check
npm.cmd test
```

On shells without PowerShell execution restrictions, `npm run check` and `npm test` are equivalent.
