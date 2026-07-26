---
name: vibebox
description: Use this skill when an AI coding task should consult VibeBox memory before work as an auto-intervention memory layer for meaningful repository work; retrieve active guidance when available, apply it as context, and capture meaningful outcomes with userRequest plus AI-agent structured memory candidates unless the user opts out.
---

# VibeBox

VibeBox is agent-neutral local-first memory middleware for AI coding agents.

VibeBox Core is a local CLI and memory engine. This skill is the agent execution contract. It does not replace repository inspection or the user's current request.

Past memory is context, not authority. The current explicit user request wins over older memory.
Pending memory must not be treated as active memory.

## Contract

- The AI agent is the semantic authority.
- The agent interprets user requests, corrections, failures, outcomes, categories, relations, replacements, and localized display text.
- The agent submits structured memory candidates after meaningful work.
- The agent must provide structured candidates when reusable active memory should be created.
- The agent must choose `scope` semantically. Prefer `scope: "global"` for durable user personal preferences, repeated procedural instructions, tool preferences, validation preferences, and response/reporting preferences unless the memory is explicitly tied to one repository, product, dataset, artifact, or local environment.
- VibeBox Core validates, stores, dedupes, safely replaces, indexes, links, and renders those candidates.
- Core will not infer active memory from raw `userRequest`, headings, bullets, keywords, `aiActionSummary`, command output, or raw logs.
- Action summaries, changed files, errors, and commands are evidence until the agent turns them into structured candidates.
- `aftertask` must include `userRequest` plus structured candidates when active memory should be created.
- If no reusable memory exists, submit `no_reusable_memory_candidate` with `noCandidateReason`.
- If one candidate represents a complex request, include `whyOnlyOneCandidate`.
- Wiki display fields must follow configured `memoryLanguage`; Core does not translate missing display text.
- User-centered memory is first-priority semantic work for the agent. Personal preferences, recurring feedback, answer/reporting style, correction style, question style, collaboration habits, and repeated user patterns must be considered before technical workflow, validation, or prevention categories. The current explicit request still wins, but durable user-centered signals should not be buried only under project or process categories.

## Strict Recording Gate

Before creating or submitting any `aftertask` candidate file, run:

```bash
vibebox.cmd schema --format json
vibebox schema --format json
```

When an installed plugin hook provides an absolute bundled CLI path, use that path for `schema` and `aftertask`; a separate global `vibebox` command is not required.

Treat the schema output as the contract for the current runtime. Do not write candidate JSON from memory, prose, screenshots, prior examples, or guessed field names.

- Use only enum values returned by `schema.enums` for `memoryRole`, `type`, `modelClass`, `scope`, `primaryCategory`, `relatedCategories`, `confidence`, and `sourceType`.
- Do not invent role or outcome labels such as `project_outcome`, `project_result`, `memory`, `outcome`, `success_memory`, or `project_memory`.
- Start from `candidateSkeleton` or `noReusableMemoryCandidate`, then replace placeholder text with the actual semantic memory.
- A reusable candidate must include every `requiredFields` entry and localized `displayTitle`, `displaySummary`, `displayRule`, and `displayLanguage`.
- If exactly one candidate is submitted for a non-trivial user request, include `whyOnlyOneCandidate` in the candidate or envelope.
- If no durable reusable memory exists, submit only `no_reusable_memory_candidate` with `noCandidateReason`; do not force a fake `task_context`.
- If Core rejects a candidate for missing fields or invalid enum values, stop guessing, rerun schema, rebuild the candidate from the skeleton, and retry once.

Load references only when needed:

- [COMMANDS.md](references/COMMANDS.md)
- [WORKFLOW.md](references/WORKFLOW.md)
- [MEMORY_POLICY.md](references/MEMORY_POLICY.md)

## When To Use

Use VibeBox before meaningful repository work when prior memory could affect:

- project structure, docs, tests, release flow, or packaging
- user preferences or reporting style
- validation requirements
- failure avoidance
- previous rejected approaches
- reusable successful approaches

Do not use it for simple answers unrelated to a repository, or when the user explicitly opts out.

## Pre-Task Workflow

1. Check whether VibeBox is available and the current directory is a usable project workspace.
2. Remember that VibeBox uses one global store as the single source of truth, normally `<USER_HOME>/.vibebox`, `%USERPROFILE%\.vibebox`, or `VIBEBOX_HOME`.
3. Run read-only retrieval before planning or editing:

```bash
vibebox.cmd pretask --task "<task description>"
vibebox pretask --task "<task description>"
node bin/vibebox.mjs pretask --task "<task description>"
```

4. Prefer `vibebox.cmd` on Windows/Codex. Do not wrap normal retrieval in `powershell.exe -Command` unless direct invocation is unavailable.
5. If a sandbox blocks global store access, request approved read-only global VibeBox store access for `pretask` or `context`.
6. If aftertask write access is blocked, request approved global VibeBox store write access.
7. If the same sandbox repeatedly asks for default `~/.vibebox` access, use or recommend `vibebox setup-codex` or `vibebox setup-claude`, then restart that host and verify with `vibebox doctor --codex`, `vibebox doctor --claude`, or `vibebox doctor --agent all`.
8. Do not create workspace-local memory snapshots, copied stores, project-local `.vibebox` folders, pointer files, or hidden metadata as a workaround.
9. Read `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.
10. Apply relevant guidance in the actual plan and implementation.
11. If memory conflicts with the current user request, mention the conflict and follow the current request.
12. If memory conflicts with repository reality, report the conflict before acting.

`pretask` and `context` are read-only retrieval commands and do not create project registry entries.

## During Work

- Inspect the repository before editing.
- Treat active memory as constraints, warnings, and reusable approaches.
- Prefer project-specific memory over global memory for the current repository.
- Treat failure memory as prevention guidance.
- Treat successful approaches as reusable methods when they fit the current task.
- Preserve existing behavior unless the user asks to change it.
- Run validation that matches the user's request and repository norms.
- Treat command, permission, environment, path, browser, API, plugin, and tool failures as possible AI failure memory evidence.
- Do not treat low-confidence memory as final fact.

## After-Task Workflow

After meaningful coding, design, documentation, packaging, or review work:

1. Capture the original user request or a faithful semantic summary with `--request`.
2. Summarize changed files, commands, results, errors, and user feedback when known.
3. Create structured candidates after reviewing every relevant lane:
   - `user_success_criteria`
   - `ai_failure_memory`
   - `ai_successful_approach`
   - `task_context`
   - `discarded_detail`
4. First audit for user-centered candidates:
   - personal preferences and durable success criteria: `type: "user_preference"` with `primaryCategory: "user_preferences"`
   - answer/reporting/collaboration style: `type: "response_preference"` or `communication_pattern` with `primaryCategory: "user_patterns"`
   - recurring corrections, repeated feedback, question style, and modification patterns: `correction_pattern`, `question_pattern`, or `communication_pattern` with `primaryCategory: "user_patterns"`
   - repeated procedural instructions from the user, such as "analyze before modifying", "report before changing", "commit and push after validation", or recurring final-response requirements, are user patterns because they describe how the user wants the agent to work. Use `primaryCategory: "user_patterns"` and add `workflow_rules`, `process_patterns`, or `validation_patterns` as `relatedCategories` when useful.
   - workflow, validation, or process behavior discovered by the agent or required only by a specific project is not automatically a user pattern. Keep those memories under technical categories unless the repeated durable signal is the user's personal working preference.
   - if the same memory is both user-centered and technical, keep the user-centered primary category when the user behavior is the durable signal, and add the technical categories as `relatedCategories`.
5. Then consider other pattern categories such as validation, process, design philosophy, decision, workflow, prevention, tooling, AI failure, and AI success.
6. Choose candidate scope deliberately:
   - use `scope: "global"` when a user personal preference, repeated user procedure, tool preference, validation preference, or response/reporting preference can guide future work outside the current repository.
   - use `scope: "project"` only when the rule depends on this repository's product, data model, artifact format, local cache path, test suite, UI flow, business rule, or explicit project name.
   - keep `sourceProjectId`/`sourceProjectRoot` as provenance for global memories learned during a project; do not set `projectId` just because the memory was observed in a project.
   - if uncertain between global and project for a user-centered preference, prefer global with project-specific evidence unless the user or repository context clearly narrows it.
7. Do not mark `no_reusable_memory_candidate` until the user-centered and scope audits above have been performed. Repeated user wording such as "always", "prefer", "do not", "next time", "again", corrections after dissatisfaction, and recurring final-answer requirements should normally produce a user-centered candidate unless it is clearly one-off.
8. Before writing candidate JSON, run `vibebox.cmd schema --format json` or `vibebox schema --format json` and use the returned Core enum values, category model, defaults, and skeleton. Do not invent `memoryRole`, `type`, `modelClass`, `scope`, `sourceType`, `primaryCategory`, or `relatedCategories` values from prose.
9. Include fields such as `memoryRole`, `type`, `modelClass`, `modelSubClass`, `scope`, `primaryCategory`, `relatedCategories`, `title`, `summary`, `rule`, `displayTitle`, `displaySummary`, `displayRule`, `displayLanguage`, `evidence`, `confidence`, `sourceType`, `relationCandidates`, and `replaces` when applicable.
10. Write display fields in configured `memoryLanguage`; for a Korean configured tag, write Korean display text.
11. Use `--candidates-file` or `--structured-candidates-file` for long JSON, especially on Windows shells.
12. Run:

```bash
vibebox.cmd aftertask --request "<request>" --summary "..." --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

13. If aftertask write access is blocked, request approved global VibeBox store write access or report that capture, project registration, active memory, and wiki updates were not completed.
14. If VibeBox rejects a candidate for a missing required field or invalid enum, rerun `vibebox schema --format json`, rebuild from `candidateSkeleton` or `noReusableMemoryCandidate`, and resubmit once. Do not repeatedly guess values.
15. If VibeBox warns that candidates are missing or `whyOnlyOneCandidate` is missing, rewrite the capture input and rerun when reusable memory should be stored.

`aftertask` is a global-store write/capture operation.

## Auto-Curated Memory

Normal flow:

```text
event captured
-> agent structured candidates supplied
-> Core validates / dedupes / replaces safely / indexes / renders
-> active graph, Wiki, and context updated
```

Active memory is the only memory that should guide normal pretask/context output. Pending, rejected, discarded, quarantined, and replaced memory must not be treated as current guidance.

Use `review`, `approve`, `approve --safe`, and `reject` only for debugging, audits, or manual override.

Do not call aftertask with only an AI action summary. Summary-only `aftertask` and raw-text `extract --text` are raw evidence/debug paths only. They do not create active memory because Core does not semantically interpret user requests, headings, bullets, keywords, raw action summaries, or command output.

## Store And Wiki

VibeBox uses one global store as the single source of truth. Project memory lives under `projects/{projectId}/`; user-wide rules live under `global/`; Wiki, index, logs, pending/debug records, and registry data live under the global store.

The Obsidian-compatible Wiki is a display layer for user review. Filenames, headings, summaries, aliases, and link labels follow configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. For non-default initial languages and conversion targets, the AI Agent must provide a complete localized display template for the exact configured tag; Core renders that template instead of using hardcoded locale packs, alias deny-lists, or supported-language examples.

Language conversion and semantic rebuild require an adapter-provided runtime marker such as `VIBEBOX_AGENT_RUNTIME` and agent-provided localized/semantic data. Core does not translate, summarize, or generate missing user-facing display text.

## Codex Cache Note

Codex App can load an installed plugin cache instead of the repository checkout. A GitHub push alone does not refresh the installed cache. After local plugin source updates, run `git pull` or reinstall/update the plugin, then verify the cache under `%USERPROFILE%\.codex\plugins\cache\boksajang\vibebox\0.1.10\`. The installed package includes `bin/vibebox.mjs` and `src/`; VibeBox does not delete or rewrite Codex App plugin cache files automatically.

## Sensitive Data

Do not store secrets in active memory, Wiki pages, or Context Packs. Avoid persisting API keys, tokens, passwords, bearer credentials, private connection strings, or secrets printed in command output.
