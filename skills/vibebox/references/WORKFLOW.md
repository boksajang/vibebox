# VibeBox Workflow Reference

This reference describes the standard agent workflow. It applies to Codex, Claude-compatible agents, and any CLI agent that can run VibeBox.

## Default Agent Workflow

1. Receive the user task.
2. Decide whether prior memory could affect meaningful repository work.
3. Resolve the bundled CLI from the loaded `skills/vibebox/SKILL.md` source and check global store access.
4. Run read-only `pretask` before planning or editing when memory could matter.
5. Read `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.
6. Apply relevant guidance while inspecting and editing the repository.
7. Validate the result according to the user's request and repository norms.
8. Run `aftertask` with `--request` and structured candidates unless the user opted out.
9. Let Core validate, dedupe, safely replace, index, link, and render active memory.

The current user request wins over past memory.

## Access Preflight

VibeBox uses one global store as the single source of truth:

```text
<USER_HOME>/.vibebox
%USERPROFILE%\.vibebox
```

or `VIBEBOX_HOME` when configured.

Sandboxed hosts may block this store because it is outside the workspace.

- `pretask` and `context` are read-only retrieval commands but still require global-store read access.
- `pretask` and `context` do not create project registry entries.
- `aftertask` is a global-store write/capture operation.
- `init`, `aftertask`, and `capture` can register the current project when write access is available.
- If read access is denied, request approved read-only global VibeBox store access or report VibeBox guidance unavailable.
- If write access is denied, request approved global VibeBox store write access or report capture unavailable and state that project registration, active memory, and wiki updates were not completed.
- Do not create workspace-local memory snapshots, copied stores, project-local `.vibebox` folders, pointer files, or hidden metadata as a fallback.

For supported sandboxed hosts, use the host setup commands to reduce repeated approval prompts for the default global store:

```bash
vibebox setup-codex
vibebox setup-claude
vibebox doctor --agent all
```

`setup-codex` updates `~/.codex/config.toml`; `setup-claude` updates `~/.claude/settings.json`. Both back up existing config files, merge without duplicate VibeBox entries, and require restarting the host afterward.

Recommended wording: `VibeBox uses one global store as the single source of truth. This sandboxed session may need approval to read or write the global VibeBox store. pretask/context require read access. aftertask requires write access for memory capture. No workspace-local memory snapshot will be created.`

## Pre-Task Retrieval

Installed plugin:

```bash
node "<vibebox-plugin-root>/bin/vibebox.mjs" pretask --task "Fix dashboard table scrolling"
```

`<vibebox-plugin-root>` is two directories above the loaded `skills/vibebox/SKILL.md`. Do not probe global commands, the current project, or repository clones in an installed plugin session.

The brief has been consumed only when it changes the agent's plan, implementation, validation, or reporting.

## After-Task Capture

Use aftertask after meaningful work with the original user request or faithful summary:

```bash
node "<vibebox-plugin-root>/bin/vibebox.mjs" aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-level scrolling and ran tests." --files "src/table.mjs" --commands "npm.cmd test" --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

For long records:

```bash
vibebox aftertask --from-file task-result.txt
```

When active memory should be created, `task-result.txt` must include `User request:` and `Structured memory candidates:`. A file wrapper without structured candidates is raw evidence only. Without candidates, VibeBox records the event and warns instead of creating active memory.

Before capture, scan the request and outcome for:

- user personal preferences, durable success criteria, and stable likes/dislikes
- recurring feedback, answer/reporting style, correction style, question style, collaboration habits, repeated modification patterns, and repeated procedural instructions from the user
- `user_success_criteria`
- `ai_failure_memory`
- `ai_successful_approach`
- `task_context`
- `discarded_detail`
- validation patterns
- response and reporting preferences
- process, design, and decision patterns
- workflow and prevention rules
- tooling and technology preferences

Before writing candidate JSON, run:

```bash
node "<vibebox-plugin-root>/bin/vibebox.mjs" schema --format json
```

Use the schema output as the single source of truth for `memoryRole`, `type`, `modelClass`, `scope`, `sourceType`, `primaryCategory`, `relatedCategories`, defaults, and the candidate skeleton. Do not copy enum lists into agent prompts or invent values from prose.

Do not create or submit an `aftertask` candidate file until the schema has been read in the current task. Invalid role/outcome guesses such as `project_outcome`, `project_result`, `success_memory`, or `project_memory` are contract failures. Start from `candidateSkeleton` for active memory, or from `noReusableMemoryCandidate` when nothing durable should be stored.

User-centered signals are first-priority candidates. Use `primaryCategory: "user_preferences"` for personal preferences and durable success criteria. Use `primaryCategory: "user_patterns"` for recurring feedback, answer/reporting style, communication style, correction patterns, question patterns, collaboration habits, repeated modification patterns, and repeated procedural instructions from the user. If the same memory is also technical, put technical categories in `relatedCategories` instead of losing the user-centered primary category.

Do not confuse agent-discovered workflow with user pattern memory. A workflow, validation, or process behavior belongs in a technical category unless the repeated durable signal is the user's preferred way for the agent to work.

Choose `scope` after the user-centered audit:

- Prefer `scope: "global"` for user personal preferences, repeated user procedures, tool preferences, validation preferences, and response/reporting preferences when they can guide work outside the current repository.
- Use `scope: "project"` when the durable rule depends on the current repository's product, data/schema/API contract, artifact format, UI flow, business rule, local path/cache state, test suite, or explicit project name.
- Keep `sourceProjectId` and `sourceProjectRoot` as provenance for global memories learned in a project. Do not set `projectId` just because the lesson was observed in one repository.
- If uncertain between global and project for a user-centered preference, prefer global unless the user wording or repository reality clearly narrows it.

Do not collapse separate validation, reporting, preservation, and failure-avoidance meanings into one summary-shaped candidate. If only one candidate is truly enough, include `whyOnlyOneCandidate`. If no reusable memory exists, include `no_reusable_memory_candidate` with `noCandidateReason`; do not force a fake `task_context`.

If VibeBox rejects a candidate for a missing required field or invalid enum, rerun `vibebox schema --format json`, rebuild the object from `candidateSkeleton` or `noReusableMemoryCandidate`, and resubmit once. Repeated guessing is a contract failure.

The agent must write `displayTitle`, `displaySummary`, and `displayRule` in the exact configured `memoryLanguage` and set `displayLanguage` to that same tag. Core rejects missing or mismatched fields before activation and Wiki rendering.

## Manual Debug And Override

Normal workflows are auto-curated. Use these only for debugging, audits, or manual override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

Safe approval skips candidates with direct conflicts, supersedes, exceptions, duplicates, low confidence, or review-needed status.

## Context Pack

Use `context` when compact retrieval is enough:

```bash
node "<vibebox-plugin-root>/bin/vibebox.mjs" context --task "Update dashboard dependency handling"
```

`context` is read-only and should not modify repository files, but it still needs global-store read access.

## Reports And Diagnostics

```bash
vibebox report
vibebox blackbox --limit 10
vibebox doctor
vibebox doctor --agent all
```

Reports and blackbox output summarize active graph and diagnostic task history without dumping raw logs. Doctor checks global store health, registry, JSON parsing, indexes, localized Wiki links, suspicious raw secrets, and legacy project-local stores. Agent setup doctor options check Codex and Claude Code permissions for the default `~/.vibebox` store.

## Legacy / Manual Debugging Only

Summary-only `aftertask` and raw-text `extract --text` are raw evidence/debug paths only. They do not create active memory because Core does not semantically interpret user requests, headings, bullets, keywords, raw action summaries, or command output. If an agent receives a missing-candidates warning, it must prepare structured candidates and capture again.

## External Project Workflow

After `npm link`, run VibeBox from another project:

```bash
vibebox init
vibebox pretask --task "Check project memory before editing"
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
vibebox context --task "Change dependency handling"
vibebox report
vibebox blackbox --limit 5
vibebox doctor
```

These commands use the global store. They do not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in that project.

## Language Operations

Internal memory remains canonical for agents. The Wiki display layer follows configured `memoryLanguage`.

Language conversion and semantic rebuild require an adapter runtime marker:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang <from-bcp47> <to-bcp47> --display-template-file <agent-template.json>
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

Without an agent runtime marker, these commands stop before changing files.
