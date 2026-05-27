# VibeBox Workflow Reference

VibeBox is agent-neutral. Any AI coding agent that can read files and run shell commands can use the same workflow.

## Default Agent Workflow

1. Receive the user task.
2. Judge whether it is meaningful repository work.
3. Check whether VibeBox is available, the global store exists or can be initialized, and the current working directory is a usable project workspace rather than user home, global store, cache, or tool-internal path.
4. If memory could affect the task, run `pretask` before planning or editing.
5. Use the Pre-Task Brief to reduce wrong assumptions, apply current user patterns, and avoid repeated failures.
6. Perform the task within the current user request.
7. After meaningful work, capture the result with `aftertask` unless the user opted out.
8. Let VibeBox extract userRequest/userFeedback-first candidates and let the Auto Curator decide active, replace, discard, or quarantine.
9. Treat active memory as the latest optimized pattern graph, not as a permanent history list.

This is an auto-intervention policy, not a hardcoded trigger list. The agent should consider repository context, change risk, prior memory value, and user preference before deciding whether VibeBox should intervene.

## Standard CLI Workflow

1. Initialize the global user store once with `vibebox init`.
2. Run `vibebox pretask --task "<task>"` before memory-relevant repository work.
3. Read the Pre-Task Brief and inspect the repository.
4. Perform the requested coding, design, or review work.
5. Run `vibebox aftertask ...` after meaningful work unless the user opted out.
6. Allow the Auto Curator to update active memory, replace outdated memory, discard noise, or quarantine risky candidates.
7. Use `vibebox review`, `vibebox approve <candidate-id>`, `vibebox approve --safe`, or `vibebox reject <candidate-id>` only for debugging, audits, or manual override.
8. Inspect project health with `vibebox report`, `vibebox blackbox`, and `vibebox doctor`.

## Pre-Task Brief Workflow

Use this before planning or editing when repository memory could affect the task and VibeBox is available for the current working directory:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

Fallback:

```bash
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

On Windows PowerShell, use `vibebox.cmd pretask --task "..."` if the npm `.ps1` shim is blocked.

The brief should guide attention, not replace codebase analysis. Apply active memory as constraints, risk warnings, project context, validation style, process guidance, and failure-prevention rules.

## After-Task Blackbox Workflow

Capture meaningful work after it happens:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --technical-outcome success --user-acceptance accepted
```

For longer summaries:

```bash
vibebox aftertask --from-file task-result.txt
```

Aftertask writes a blackbox event, extracts memory candidates, and lets the Auto Curator decide whether to activate, replace, discard, or quarantine each candidate. Skip capture when the user explicitly opts out.

## Manual Review And Override Workflow

Normal workflows are auto-curated. Use review commands for debugging, audits, or manual override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

Use safe batch approval only when appropriate:

```bash
vibebox approve --safe
```

Safe approval skips candidates with direct conflicts, supersedes, exceptions, duplicate status, low confidence, or review-needed status.

Activating a replacement, correction, or same-subject refinement removes the older active memory from normal retrieval, Context Packs, Pre-Task Briefs, namespace files, active relations, and active wiki sections. Activating a scoped exception keeps the broader memory active only when the exception has a clear condition. Rejected, discarded, quarantined, and legacy pending memory stays out of normal retrieval and active graph outputs.

Technical success and user acceptance are separate. Passing commands or completed edits do not justify a `success_pattern` when the user rejected the outcome.

## Context Pack Usage

Use `context` when a compact memory pack is enough:

```bash
vibebox context --task "Update dashboard dependency handling"
```

Use `pretask` when an agent is about to act, because it includes more direct instructions and risks.
Pretask should consider both failure memory and success patterns when relevant: failure memory is prevention guidance, while success memory is reusable approach guidance.

## Report And Blackbox Usage

Use `report` for current memory state:

```bash
vibebox report
```

Use `blackbox` for recent task history:

```bash
vibebox blackbox --limit 10
```

Neither command should be treated as a raw transcript dump.

Reports and blackbox output summarize the active graph and meaningful task outcomes. Raw logs remain diagnostic and should not be pasted wholesale into prompts.

## Agent-Neutral Usage Pattern

Adapters should call the same VibeBox CLI and read the same shared skill. They should not fork memory behavior or create agent-specific memory stores.

Preferred command:

```bash
vibebox <command>
```

Fallback inside this repository:

```bash
node bin/vibebox.mjs <command>
```

Windows PowerShell fallback:

```bash
vibebox.cmd <command>
```

## External Project Workflow

After `npm link`, run VibeBox from another project:

```bash
vibebox init
vibebox pretask --task "Check project memory before editing"
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --technical-outcome success --user-acceptance accepted
vibebox extract --text "Do not modify package.json unless explicitly requested."
vibebox context --task "Change dependency handling"
vibebox report
vibebox blackbox --limit 5
vibebox doctor
vibebox backup --output ./vibebox-backup
vibebox restore --from ./vibebox-backup --confirm-replace
```

For manual debugging or override, add `vibebox review`, `vibebox approve <candidate-id>`, or `vibebox reject <candidate-id>`.

These commands use the global user store at `~/.vibebox` by default, or `VIBEBOX_HOME` when configured. They do not create project-local `.vibebox` folders, pointer files, or hidden metadata in that project.

## Current User Request Priority Rule

The current explicit user request has priority over past memory. If past memory conflicts with the current request, mention the conflict and follow the current request.

## Project Memory Vs Global Memory

For the current repository, project memory should guide work before global memory. If project and global memory conflict, treat it as a potential conflict and avoid silently resolving it.

Project identity is derived from the current AI working directory. Git remote `origin` and `package.json` name are preferred when present; otherwise VibeBox uses the current folder name. Static HTML/PHP folders, JSON-only folders, document folders, and plain folders are valid project workspaces unless they are excluded internal paths. Project memory lives under `projects/{projectId}/` in the global store; global preferences and rules live under `global/`.

## Adaptive Language Rule

Human-facing active memory and wiki managed content follow the configured memory language. The wiki uses stable internal `docKey` identity with localized filenames, headings, aliases, and links. Raw logs remain diagnostic source records. JSON field names, enum values, relation types, and command names stay English, and adapters must not call external translation APIs.

Language conversion and semantic rebuild are explicit agent-runtime operations:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko en
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

Without an agent runtime marker, those commands intentionally stop before modifying files.
