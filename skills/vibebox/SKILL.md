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
- VibeBox Core validates, stores, dedupes, safely replaces, indexes, links, and renders those candidates.
- Core will not infer active memory from raw `userRequest`, headings, bullets, keywords, `aiActionSummary`, command output, or raw logs.
- Action summaries, changed files, errors, and commands are evidence until the agent turns them into structured candidates.
- `aftertask` must include `userRequest` plus structured candidates when active memory should be created.
- If no reusable memory exists, submit `no_reusable_memory_candidate` with `noCandidateReason`.
- If one candidate represents a complex request, include `whyOnlyOneCandidate`.
- Wiki display fields must follow configured `memoryLanguage`; Core does not translate missing display text.

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
7. Do not create workspace-local memory snapshots, copied stores, project-local `.vibebox` folders, pointer files, or hidden metadata as a workaround.
8. Read `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.
9. Apply relevant guidance in the actual plan and implementation.
10. If memory conflicts with the current user request, mention the conflict and follow the current request.
11. If memory conflicts with repository reality, report the conflict before acting.

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
4. Consider pattern categories such as validation, response preference, process, design philosophy, decision, workflow, prevention, tooling, AI failure, and AI success.
5. Include fields such as `memoryRole`, `type`, `modelClass`, `modelSubClass`, `scope`, `primaryCategory`, `relatedCategories`, `title`, `summary`, `rule`, `displayTitle`, `displaySummary`, `displayRule`, `displayLanguage`, `evidence`, `confidence`, `sourceType`, `relationCandidates`, and `replaces` when applicable.
6. Write display fields in configured `memoryLanguage`; for `ko-KR`, write Korean display text.
7. Use `--candidates-file` or `--structured-candidates-file` for long JSON, especially on Windows shells.
8. Run:

```bash
vibebox.cmd aftertask --request "<request>" --summary "..." --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

9. If aftertask write access is blocked, request approved global VibeBox store write access or report that capture, project registration, active memory, and wiki updates were not completed.
10. If VibeBox warns that candidates are missing or `whyOnlyOneCandidate` is missing, rewrite the capture input and rerun when reusable memory should be stored.

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

The Obsidian-compatible Wiki is a display layer for user review. Filenames, headings, summaries, aliases, and link labels follow configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. Short aliases such as `ko`, `en`, `ja`, `cn`, or `tw` are not accepted. Common examples include `ko-KR`, `en-US`, `ja-JP`, `zh-CN`, `zh-TW`, and `ar`; these are examples, not the full language limit.

Language conversion and semantic rebuild require an adapter-provided runtime marker such as `VIBEBOX_AGENT_RUNTIME` and agent-provided localized/semantic data. Core does not translate, summarize, or generate missing user-facing display text.

## Codex Cache Note

Codex App can load an installed plugin cache instead of the repository checkout. A GitHub push alone does not refresh the installed cache. After local plugin source updates, run `git pull` or reinstall/update the plugin, then verify the cache under `%USERPROFILE%\.codex\plugins\cache\personal\vibebox\0.1.1\`. VibeBox does not delete or rewrite Codex App plugin cache files automatically.

## Sensitive Data

Do not store secrets in active memory, Wiki pages, or Context Packs. Avoid persisting API keys, tokens, passwords, bearer credentials, private connection strings, or secrets printed in command output.
