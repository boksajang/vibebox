---
name: vibebox
description: Use this skill when an AI coding task should consult VibeBox memory before work as an auto-intervention memory layer for meaningful repository work; consider VibeBox before planning or editing when prior decisions, failures, constraints, or user preferences could affect the task, run pre-task memory checks when VibeBox is installed and the global store/project identity are available, and capture after-task results unless the user explicitly opts out.
---

# VibeBox

## What VibeBox Is

VibeBox is universal agent-neutral local-first auto-curated active user pattern graph and blackbox memory middleware for AI coding agents.
VibeBox Core is a local CLI and memory engine. This skill tells an AI coding agent when and how to call that CLI; it does not replace repository inspection or the user's current request.

Past memory is context, not authority. Pending memory must not be treated as active memory.
VibeBox is not a passive archive or a review-first memory manager: active memory is the latest optimized guidance set chosen by the Auto Curator or a manual override. Replaced, corrected, discarded, quarantined, rejected, or legacy pending memory must not be treated as current guidance.
VibeBox is not an AI action summary recorder and Core is not the semantic authority. The AI agent must interpret the user's request, feedback, correction, failure signals, successful approaches, model class, scope, categories, relations, replacements, and localized display text. Use AI summaries, changed files, command output, and errors only as evidence for the structured candidates you provide. Treat structured user requests as meaning graphs yourself: extract reusable success criteria, preservation rules, validation expectations, scope limits, user/domain/project patterns, and AI failure-prevention signals before capture.
Meaningful work is not fully captured by reading `pretask` or by sending a summary. After meaningful work, the AI agent must provide the original `userRequest` plus structured memory candidates, or explicitly submit a `no_reusable_memory_candidate` item with `noCandidateReason`. VibeBox Core will not infer active memory from `userRequest`, headings, bullets, keywords, action summaries, command output, or fixture terms.

For details, load these references only when needed:

- [COMMANDS.md](references/COMMANDS.md) for exact CLI commands and examples.
- [WORKFLOW.md](references/WORKFLOW.md) for standard pre-task, after-task, auto-curation, manual override, and reporting flows.
- [MEMORY_POLICY.md](references/MEMORY_POLICY.md) for memory types, confidence, conflicts, and privacy rules.

## Auto-Intervention Principle

Before starting AI coding work in a workspace folder, judge whether the task could be affected by prior decisions, failures, preferences, constraints, project conventions, or blackbox history. If that possibility exists and VibeBox is available, the global store exists or can be initialized, and the current working directory is not an excluded internal path, run VibeBox pre-task retrieval before planning or editing.

Use VibeBox memory as constraints, warnings, and context that narrow the working assumptions. Do not treat memory as a replacement for the user's current explicit request. The current request wins over past memory.

If memory conflicts with the current request or repository reality, report the conflict instead of hiding it. After meaningful work, capture the result with `aftertask` unless the user explicitly opts out.

Do not wait for the user to say "use VibeBox" every time. Consider VibeBox automatically when the repository context, change risk, or memory value makes it relevant.

## Core Principle

Use VibeBox to reduce repeated explanation and repeated mistakes:

- Retrieve active memory before meaningful repository work.
- Treat the user's current instruction as the current success criteria.
- Treat user corrections as more precise success criteria.
- Treat avoid rules and failure memory as high-priority warnings.
- Treat failure memory as prevention guidance, not just history.
- Apply validation, process, design, correction, and agent failure/success patterns when relevant.
- Apply both relevant failure memory and relevant success patterns; failure memory is prevention guidance and success memory is reusable approach guidance.
- Prefer project-specific memory before global memory.
- Capture meaningful task outcomes after work.
- Provide structured memory candidates during capture so VibeBox can validate, store, dedupe, replace, index, and render them into the active graph.

Do not let VibeBox memory override the user's current explicit request. If past memory conflicts with the current request, mention the conflict and follow the current request.

## When To Use This Skill

Use VibeBox when the task context suggests memory could reduce wrong assumptions or repeated mistakes. Decide by asking:

- Does this task change repository state?
- Could it affect existing design, structure, dependencies, documentation, packaging, tests, or release flow?
- Could previous failures, user preferences, project decisions, or constraints affect the right approach?
- Is the result likely to matter for a future coding session?
- Is VibeBox installed, and is the current working directory a usable project workspace rather than an excluded internal path?
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
2. Check whether the VibeBox CLI is available, whether the global store has been initialized, and whether the current working directory is a usable workspace rather than user home, global store, cache, or tool-internal path.
3. Treat `pretask` and `context` as read-only memory retrieval commands for the repository: they print active guidance and should not edit repository files, but they still need read access to the global VibeBox store.
4. On Windows/Codex, prefer direct invocation with `vibebox.cmd pretask --task "<task description>"`; do not wrap VibeBox commands in `powershell.exe -Command` unless no direct invocation is possible.
5. Outside Windows, prefer `vibebox pretask --task "<task description>"`.
6. If a host approval layer blocks a wrapper-style command, retry with direct `vibebox.cmd pretask --task "<task description>"`, then `vibebox pretask --task "<task description>"`, then `node bin/vibebox.mjs pretask --task "<task description>"` from the VibeBox repository.
7. If a sandbox blocks `~/.vibebox` or `$VIBEBOX_HOME`, request approved read-only global VibeBox store access; do not create workspace-local memory snapshots or project-local `.vibebox` fallbacks.
8. If all VibeBox retrieval attempts fail, clearly say that VibeBox guidance was unavailable and continue only if the current task can proceed safely.
9. Read the Pre-Task Brief.
10. Identify the relevant `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` sections.
11. Apply relevant memory as constraints, risk warnings, and reusable approaches in the actual plan and implementation.
12. If memory conflicts with the user's current explicit request, mention the conflict and follow the current request.
13. If memory conflicts with repository reality, report the conflict before acting.
14. Do not treat low-confidence memory as final fact.
15. Avoid repeating known failed approaches.

## During-Task Rules

During work:

- Use VibeBox memory to narrow the search space.
- Do not let VibeBox memory replace repository inspection.
- Do not make broad changes only because memory suggests a preference.
- Respect project-specific memory before global memory.
- Consider `avoid_rule`, `failure_memory`, and `agent_failure_pattern` as high-priority warnings.
- Treat user dissatisfaction as an AI failure signal, not user failure.
- Treat permission, path, command, browser, API, image generation, and plugin/tool failures as AI failure signals worth capturing.
- Preserve technical failure evidence, but create active `ai_failure_memory` only by submitting an explicit structured candidate.
- Let `validation_pattern`, `process_pattern`, and `design_philosophy` shape how you verify, sequence, and design the work.
- Preserve existing behavior unless the user asks for a change.
- If the task touches an area with known failure memory, explicitly account for it.
- If the task may create new project decisions, note them for after-task capture.
- When reporting completion, mention the VibeBox guidance that materially affected the plan, validation, or avoided approaches when that evidence is useful to the user.

## After-Task Workflow

After meaningful coding or design work:

1. Pass the original user request, or a faithful semantic summary of it, with `--request`.
2. Summarize what changed or was decided.
3. List changed files.
4. List commands run and results.
5. Summarize errors or failed attempts.
6. Summarize user feedback if available.
7. Create structured memory candidates after reviewing every applicable role: `user_success_criteria`, `ai_failure_memory`, `ai_successful_approach`, `task_context`, and `discarded_detail`.
8. Decompose the request into meaning units before capture: success criteria, user preference, project rule, domain rule, validation requirement, reporting preference, failure-avoidance rule, successful approach, task-only context, and discarded detail.
9. Scan each meaning unit across the category axis: user preferences, user patterns, design philosophy, validation patterns, process patterns, decision patterns, workflow rules, prevention rules, global avoid rules, tooling/technology preferences, AI failure patterns, AI success patterns, success patterns, and failure memory.
10. Include candidate fields such as `memoryRole`, `type`, `modelClass`, `modelSubClass`, `scope`, `primaryCategory`, `relatedCategories`, `title`, `summary`, `rule`, `displayTitle`, `displaySummary`, `displayRule`, `displayLanguage`, `evidence`, `confidence`, `sourceType`, `relationCandidates`, and `replaces`.
11. Write `displayTitle`, `displaySummary`, and `displayRule` in the configured `memoryLanguage`; for a `ko-KR` store, those display fields must be Korean. Canonical `summary` may stay English, but Wiki display text is the agent's responsibility.
12. If only one candidate is produced for a user request with multiple constraints, include `whyOnlyOneCandidate`. If no reusable memory exists, include a `no_reusable_memory_candidate` item with `noCandidateReason`. Do not quietly skip capture or send only a summary.
13. Run after-task capture when appropriate; `aftertask` is a global store write/capture operation, unlike repository read-only `pretask` and `context`.
14. If sandbox permissions block aftertask, request approved global VibeBox store write access for aftertask capture or report that capture was unavailable. Do not create a copied memory store as a fallback.
15. On Windows/Codex, prefer direct `vibebox.cmd aftertask --request "..." --candidates "<json>" ...`; outside Windows, prefer `vibebox aftertask ...`.
16. If direct installed commands fail inside the VibeBox repository, use `node bin/vibebox.mjs aftertask --request "..." --candidates "<json>" ...`.
17. Let VibeBox validate, dedupe, apply replacement safety, index, and render the candidates. If VibeBox warns that structured candidates are missing or that `whyOnlyOneCandidate` is missing for a one-candidate capture, rewrite and rerun the capture with richer candidates or the explicit contract field; do not assume Core will interpret the request later.
18. Treat user acceptance and technical success as separate signals.
19. Show review instructions only when debugging or manual override is useful.
20. Do not store secrets as memory.

## Auto-Curated Memory Policy

The normal flow is:

```text
event captured
-> agent structured candidates supplied
-> Core validates / dedupes / replaces safely / indexes / renders
-> active graph, wiki, and context updated
```

Active memory is the only memory that should guide normal pre-task context.

- Do not treat pending memory as an instruction; pending is legacy/manual debug state.
- Do not treat rejected, discarded, quarantined, or replaced memory as current guidance.
- When memory replaces or refines older memory for the same subject and scope, expect VibeBox to remove the older memory from active retrieval, Context Packs, Pre-Task Briefs, active relations, and active wiki sections.
- Scoped exceptions can coexist with broader rules only when their condition is clear.
- Use `vibebox review`, `vibebox approve <candidate-id>`, `vibebox approve --safe`, and `vibebox reject <candidate-id>` only for debugging, audits, and manual override.
- If the user rejects an outcome, do not let it become `success_pattern` even when commands passed.
- If the user corrects the direction, treat the correction as the latest success criteria and let VibeBox replace/refine older criteria in the same scope.
- If a command, tool, permission, or environment failure occurred, preserve the evidence and submit an explicit failure candidate when it is reusable AI failure memory; if a workaround succeeded, submit a recovery/successful-approach candidate.
- If validation passes and the approach is reusable with no rejection signal, you may submit an inferred AI successful approach, but do not describe it as confirmed by the user.
- Do not run aftertask with only `--summary` or only `--from-file`; without structured candidates, active memory is not created. For long records, include `User request:` and `Structured memory candidates:` sections in the file. Action summaries, changed files, commands, and errors are evidence only until the AI agent turns them into structured candidates.

## Consumption Evidence Policy

VibeBox guidance is meant to be consumed, not merely displayed. When VibeBox materially affects a task:

- Reflect the relevant user success criteria in the work plan.
- Avoid the specific failure approach named by the brief.
- Reuse the applicable successful approach when it fits the current request.
- Capture the result afterward with `aftertask --request ... --candidates ...` or a `Structured memory candidates:` file section.

If the brief is empty or irrelevant, proceed normally and capture only meaningful outcomes.

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

Windows/Codex direct command order:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

General installed-command preference outside Windows:

```bash
vibebox <command>
```

Do not wrap VibeBox commands in `powershell.exe -Command` unless no direct invocation is possible. Host approval layers can treat shell wrappers as higher risk than direct CLI invocation, especially for read-only `pretask` and `context`.

`pretask`, `context`, read-only `report`, and read-only `doctor` are memory retrieval or inspection commands. They should not edit repository files, but they read the global VibeBox store and may need approved global-store read access in sandboxed hosts. `aftertask`, `init`, `backup`, `restore`, `convert-lang`, and semantic `rebuild` are write or maintenance operations and should be described that way when requesting approval.

If neither works:

- Check `package.json` bin configuration.
- Check whether dependencies are installed.
- Check whether `npm link` is needed for global command usage.
- If a wrapper command was blocked, retry with direct `vibebox.cmd` before giving up.
- Do not invent commands that do not exist.

## Obsidian-Compatible Wiki Notes

VibeBox writes human-readable Markdown in the global store wiki, `~/.vibebox/wiki/` by default, or `$VIBEBOX_HOME/wiki` when configured. Use it for inspection and review, not as a raw transcript store. The wiki is an active pattern graph linking projects, failures, prevention rules, success patterns, user patterns, design philosophy, validation patterns, process patterns, and decisions. VibeBox managed sections are bounded by `<!-- VIBEBOX:BEGIN -->` and `<!-- VIBEBOX:END -->`; user-written notes outside managed blocks should be preserved.

VibeBox uses one global user store as the single source of truth. Global preferences and rules live under `global/`; project memory lives under `projects/{projectId}/`; wiki, index, logs, pending, and registry data live under the global store. Project identity comes from the current AI working directory: git remote `origin` and `package.json` name are preferred when present, otherwise the current folder name is used. Static sites, PHP folders, JSON-only folders, document folders, and plain folders are valid project workspaces unless they are user home, global store, cache, or tool-internal paths.

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, pointer files, copied memory stores, or hidden metadata in work projects. Old project-local `.vibebox/` folders are legacy; `vibebox doctor` warns about them and no destructive migration is automatic.

## Locale Notes

Internal memory stays canonical for agents: JSON field names, command names, relation types, enum values, file paths, errors, and raw logs remain stable. Obsidian is the user display layer: filenames, category folders, headings, aliases, links, Recent Active Memory, category pages, project pages, and category-based memory notes follow the configured memory language. Visible memory note filenames should be human-readable; `mem_...` ids belong in frontmatter. One memory can be linked from multiple category pages: the canonical note belongs under its primary category, while related category pages and the source project page link to that same note. Do not call external translation APIs.

Only run `vibebox convert-lang` or semantic `vibebox rebuild` when an adapter has provided an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`; otherwise these commands intentionally fail before changing files.

## Troubleshooting

- If `vibebox` is not found on Windows/Codex, try direct `vibebox.cmd <command>` first, then `node bin/vibebox.mjs <command>` from the repository root.
- If the global store is missing and the user wants VibeBox, run `vibebox init` or `node bin/vibebox.mjs init`.
- If `pretask` or `context` was blocked because it was wrapped in `powershell.exe -Command`, retry direct `vibebox.cmd pretask --task "..."` or `vibebox.cmd context --task "..."`.
- If `pretask` or `context` was blocked because the sandbox denied `~/.vibebox` or `$VIBEBOX_HOME`, request read-only global VibeBox store access and report guidance unavailable if approval is denied.
- If `aftertask` was blocked by global store permissions, request global VibeBox store write access for aftertask capture and report capture unavailable if approval is denied.
- If pre-task output looks irrelevant, inspect active memory with `vibebox report`; use `vibebox review` only for legacy/manual debug state.
- If memory/index health is unclear, run `vibebox doctor`.
- Before risky maintenance, use `vibebox backup`; restore uses destructive replace and requires confirmation.
