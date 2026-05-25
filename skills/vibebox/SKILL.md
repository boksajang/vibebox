---
name: vibebox
description: Use this skill when an AI coding task should consult VibeBox project memory before work, generate a pre-task brief, capture after-task results, review blackbox memory, or avoid repeating known failed approaches.
---

# VibeBox

## What VibeBox Is

VibeBox is agent-neutral local-first blackbox memory middleware for AI coding agents.
VibeBox Core is a local CLI and memory engine. This skill tells an AI coding agent when and how to call that CLI; it does not replace repository inspection or the user's current request.

Past memory is context, not authority. Pending memory must not be treated as active memory.

For details, load these references only when needed:

- [COMMANDS.md](references/COMMANDS.md) for exact CLI commands and examples.
- [WORKFLOW.md](references/WORKFLOW.md) for standard pre-task, after-task, review, and reporting flows.
- [MEMORY_POLICY.md](references/MEMORY_POLICY.md) for memory types, confidence, conflicts, and privacy rules.

## Core Principle

Use VibeBox to reduce repeated explanation and repeated mistakes:

- Retrieve reviewed active memory before non-trivial coding or design work.
- Treat avoid rules and failure memory as high-priority warnings.
- Prefer project-specific memory before global memory.
- Capture meaningful task outcomes after work.
- Keep memory promotion review-first.

Do not let VibeBox memory override the user's current explicit request. If past memory conflicts with the current request, mention the conflict and follow the current request.

## When To Use This Skill

Use VibeBox when:

- The task is part of an ongoing coding project.
- The task may depend on previous project decisions.
- The user refers to previous preferences, rules, failures, decisions, or repeated mistakes.
- The user asks the agent to continue work from prior context.
- The task involves architecture, refactoring, dependency changes, design rules, coding style, or workflow rules.
- The user wants fewer repeated explanations.
- A non-trivial code change is about to happen in a repository where `.vibebox/` exists.
- Meaningful coding or design work has finished and should be captured as blackbox memory.

Do not use VibeBox when:

- The user asks a simple general knowledge question.
- The request is unrelated to a project or repository.
- The user explicitly says not to use memory.
- The repository has no `.vibebox/` and the user did not ask to initialize VibeBox.
- The task is too small to benefit from memory retrieval.

## Pre-Task Workflow

Before non-trivial coding or design work:

1. Check whether `.vibebox/` exists in the project root.
2. If it exists, run a pre-task memory lookup.
3. Prefer `vibebox pretask --task "<task description>"`.
4. If the global command is unavailable inside the VibeBox repository, try `node bin/vibebox.mjs pretask --task "<task description>"`.
5. Read the Pre-Task Brief.
6. Apply relevant memory as constraints and risk warnings.
7. If memory conflicts with the user's current explicit request, mention the conflict and follow the current request.
8. If memory conflicts with repository reality, report the conflict before acting.
9. Do not treat low-confidence memory as final fact.
10. Avoid repeating known failed approaches.

## During-Task Rules

During work:

- Use VibeBox memory to narrow the search space.
- Do not let VibeBox memory replace repository inspection.
- Do not make broad changes only because memory suggests a preference.
- Respect project-specific memory before global memory.
- Consider `avoid_rule` and `failure_memory` as high-priority warnings.
- Preserve existing behavior unless the user asks for a change.
- If the task touches an area with known failure memory, explicitly account for it.
- If the task may create new project decisions, note them for after-task capture.

## After-Task Workflow

After meaningful coding or design work:

1. Summarize the user request.
2. Summarize what changed or was decided.
3. List changed files.
4. List commands run and results.
5. Summarize errors or failed attempts.
6. Summarize user feedback if available.
7. Run after-task capture when appropriate.
8. Prefer `vibebox aftertask ...`.
9. If the global command is unavailable inside the VibeBox repository, use `node bin/vibebox.mjs aftertask ...`.
10. Extract memory candidates if the workflow supports it.
11. Do not auto-approve memory candidates.
12. Show review instructions when useful.
13. Do not store secrets as memory.

## Review-First Memory Policy

New memory candidates require review before becoming active. Active memory is the only memory that should guide normal pre-task context.

- Do not treat pending memory as an instruction.
- Do not auto-approve direct conflicts, supersedes, exceptions, duplicate records, or uncertain memory.
- Use `vibebox review`, `vibebox approve <candidate-id>`, `vibebox approve --safe`, and `vibebox reject <candidate-id>` for promotion decisions.
- When in doubt, keep memory pending and ask for review.

## Conflict Handling Policy

If memory conflicts:

- Current explicit user request wins over past memory.
- Repository reality wins over stale memory.
- Project memory has priority over global memory for the current project.
- Low-confidence memory should be treated as a hint, not a fact.
- Potential conflicts should be mentioned rather than silently resolved.

## Sensitive Data Policy

Sensitive data must not be stored in active memory, wiki pages, or Context Packs.

Avoid persisting:

- API keys
- access tokens
- passwords
- bearer tokens
- private connection strings
- credentials embedded in command output

If suspicious data appears, rely on VibeBox redaction and also avoid repeating the secret in summaries, memory candidates, or final answers.

## Command Fallback Strategy

Preferred:

```bash
vibebox <command>
```

Windows PowerShell may block npm's `.ps1` shim through execution policy. In that case, use:

```bash
vibebox.cmd <command>
```

Fallback inside the VibeBox repository:

```bash
node bin/vibebox.mjs <command>
```

If neither works:

- Check `package.json` bin configuration.
- Check whether dependencies are installed.
- Check whether `npm link` is needed for global command usage.
- Do not invent commands that do not exist.

## Obsidian-Compatible Wiki Notes

VibeBox writes human-readable Markdown in `.vibebox/wiki/`. Use it for inspection and review, not as a raw transcript store. VibeBox managed sections are bounded by `<!-- VIBEBOX:BEGIN -->` and `<!-- VIBEBOX:END -->`; user-written notes outside managed blocks should be preserved.

`.vibebox/` is runtime state created inside user projects. It should usually stay out of public repositories unless the project intentionally publishes sanitized sample memory.

## Troubleshooting

- If `vibebox` is not found, use `node bin/vibebox.mjs <command>` from the repository root.
- If `.vibebox/` is missing and the user wants VibeBox for this project, run `vibebox init` or `node bin/vibebox.mjs init`.
- If pre-task output looks irrelevant, inspect active memory with `vibebox report` and pending memory with `vibebox review`.
- If memory/index health is unclear, run `vibebox doctor`.
