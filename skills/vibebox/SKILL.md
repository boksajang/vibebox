---
name: vibebox
description: Use this skill when an AI coding task should consult VibeBox memory before work as an auto-intervention memory layer for meaningful repository work; consider VibeBox before planning or editing when prior decisions, failures, constraints, or user preferences could affect the task, run pre-task memory checks when VibeBox is installed and the global store/project identity are available, and capture after-task results unless the user explicitly opts out.
---

# VibeBox

## What VibeBox Is

VibeBox is universal agent-neutral local-first active user pattern graph and blackbox memory middleware for AI coding agents.
VibeBox Core is a local CLI and memory engine. This skill tells an AI coding agent when and how to call that CLI; it does not replace repository inspection or the user's current request.

Past memory is context, not authority. Pending memory must not be treated as active memory.
VibeBox is not a passive archive: active memory is the latest reviewed guidance set. Replaced, corrected, or discarded memory must not be treated as current guidance.

For details, load these references only when needed:

- [COMMANDS.md](references/COMMANDS.md) for exact CLI commands and examples.
- [WORKFLOW.md](references/WORKFLOW.md) for standard pre-task, after-task, review, and reporting flows.
- [MEMORY_POLICY.md](references/MEMORY_POLICY.md) for memory types, confidence, conflicts, and privacy rules.

## Auto-Intervention Principle

Before starting repository-based work, judge whether the task could be affected by prior decisions, failures, preferences, constraints, project conventions, or blackbox history. If that possibility exists and VibeBox is available, the global store exists or can be initialized, and the current working directory identifies the project, run VibeBox pre-task retrieval before planning or editing.

Use VibeBox memory as constraints, warnings, and context that narrow the working assumptions. Do not treat memory as a replacement for the user's current explicit request. The current request wins over past memory.

If memory conflicts with the current request or repository reality, report the conflict instead of hiding it. After meaningful work, capture the result with `aftertask` unless the user explicitly opts out.

Do not wait for the user to say "use VibeBox" every time. Consider VibeBox automatically when the repository context, change risk, or memory value makes it relevant.

## Core Principle

Use VibeBox to reduce repeated explanation and repeated mistakes:

- Retrieve reviewed active memory before meaningful repository work.
- Treat avoid rules and failure memory as high-priority warnings.
- Treat failure memory as prevention guidance, not just history.
- Apply validation, process, design, correction, and agent failure/success patterns when relevant.
- Prefer project-specific memory before global memory.
- Capture meaningful task outcomes after work.
- Keep memory promotion review-first.

Do not let VibeBox memory override the user's current explicit request. If past memory conflicts with the current request, mention the conflict and follow the current request.

## When To Use This Skill

Use VibeBox when the task context suggests memory could reduce wrong assumptions or repeated mistakes. Decide by asking:

- Does this task change repository state?
- Could it affect existing design, structure, dependencies, documentation, packaging, tests, or release flow?
- Could previous failures, user preferences, project decisions, or constraints affect the right approach?
- Is the result likely to matter for a future coding session?
- Is VibeBox installed, and can the current working directory be identified as a project?
- Would the user reasonably expect the agent to avoid asking for repeated project context?

Do not use VibeBox when:

- The request is a simple answer unrelated to a repository.
- The task has no file, design, architecture, workflow, or project-memory consequence.
- Memory retrieval would add ceremony without reducing risk.
- The user explicitly says not to use memory.
- VibeBox is unavailable and the task is not meaningful enough to justify initializing the global store.

## Pre-Task Workflow

Before meaningful repository work:

1. Judge whether prior memory could affect the task.
2. Check whether the VibeBox CLI is available, whether the global store has been initialized, and whether the current working directory identifies the project.
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
- Consider `avoid_rule`, `failure_memory`, and `agent_failure_pattern` as high-priority warnings.
- Let `validation_pattern`, `process_pattern`, and `design_philosophy` shape how you verify, sequence, and design the work.
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
- When an approved memory replaces or refines an older memory for the same subject and scope, expect VibeBox to remove the older memory from active retrieval and active wiki sections.
- Scoped exceptions can coexist with broader rules only when their condition is clear.
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

VibeBox writes human-readable Markdown in the global store wiki, `~/.vibebox/wiki/` by default, or `$VIBEBOX_HOME/wiki` when configured. Use it for inspection and review, not as a raw transcript store. The wiki is an active pattern graph linking projects, failures, prevention rules, success patterns, user patterns, design philosophy, validation patterns, process patterns, and decisions. VibeBox managed sections are bounded by `<!-- VIBEBOX:BEGIN -->` and `<!-- VIBEBOX:END -->`; user-written notes outside managed blocks should be preserved.

VibeBox uses one global user store. Global preferences and rules live under `global/`; project memory lives under `projects/{projectId}/`; wiki, index, logs, pending, and registry data live under the global store. Project identity comes from the current working directory using git remote `origin`, `package.json` name, git root folder name, then current folder name.

VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects. Old project-local `.vibebox/` folders are legacy; `vibebox doctor` warns about them and no destructive migration is automatic.

## Locale Notes

Human-facing headings follow `VIBEBOX_LOCALE`, `VIBEBOX_LANGUAGE`, or config locale when available. JSON field names, command names, and enum values stay English. Do not translate the user's stored memory text yourself; preserve the captured language unless the user asks otherwise.

## Troubleshooting

- If `vibebox` is not found, use `node bin/vibebox.mjs <command>` from the repository root.
- If the global store is missing and the user wants VibeBox, run `vibebox init` or `node bin/vibebox.mjs init`.
- If pre-task output looks irrelevant, inspect active memory with `vibebox report` and pending memory with `vibebox review`.
- If memory/index health is unclear, run `vibebox doctor`.
