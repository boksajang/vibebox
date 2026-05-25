# VibeBox Workflow Reference

VibeBox is agent-neutral. Any AI coding agent that can read files and run shell commands can use the same workflow.

## Standard Workflow

1. Initialize a project once with `vibebox init`.
2. Run `vibebox pretask --task "<task>"` before non-trivial work.
3. Read the Pre-Task Brief and inspect the repository.
4. Perform the requested coding, design, or review work.
5. Run `vibebox aftertask ...` after meaningful work.
6. Review candidates with `vibebox review`.
7. Promote useful memory with `vibebox approve <candidate-id>` or skip safe items with `vibebox approve --safe`.
8. Reject unwanted candidates with `vibebox reject <candidate-id>`.
9. Inspect project health with `vibebox report`, `vibebox blackbox`, and `vibebox doctor`.

## Pre-Task Brief Workflow

Use this before coding when `.vibebox/` exists:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

Fallback:

```bash
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

On Windows PowerShell, use `vibebox.cmd pretask --task "..."` if the npm `.ps1` shim is blocked.

The brief should guide attention, not replace codebase analysis. Apply active memory as constraints, risk warnings, and project context.

## After-Task Blackbox Workflow

Capture meaningful work after it happens:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --outcome success
```

For longer summaries:

```bash
vibebox aftertask --from-file task-result.txt
```

Aftertask writes a blackbox event and creates pending memory candidates. It does not auto-approve memory.

## Review-First Approval Workflow

Use review before promotion:

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

## Context Pack Usage

Use `context` when a compact memory pack is enough:

```bash
vibebox context --task "Update dashboard dependency handling"
```

Use `pretask` when an agent is about to act, because it includes more direct instructions and risks.

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
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --outcome success
vibebox extract --text "Do not modify package.json unless explicitly requested."
vibebox review
vibebox approve <candidate-id>
vibebox context --task "Change dependency handling"
vibebox report
vibebox blackbox --limit 5
vibebox doctor
```

The generated `.vibebox/` folder belongs to that external project and should usually remain out of public source control.

## Current User Request Priority Rule

The current explicit user request has priority over past memory. If past memory conflicts with the current request, mention the conflict and follow the current request.

## Project Memory Vs Global Memory

For the current repository, project memory should guide work before global memory. If project and global memory conflict, treat it as a potential conflict and avoid silently resolving it.
