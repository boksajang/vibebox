# VibeBox Workflow Reference

VibeBox is agent-neutral. Any AI coding agent that can read files and run shell commands can use the same workflow.

## Default Agent Workflow

1. Receive the user task.
2. Judge whether it is meaningful repository work.
3. Check whether VibeBox is available, the global store exists or can be initialized, and the current working directory is a usable project workspace rather than user home, global store, cache, or tool-internal path.
4. If memory could affect the task, run read-only `pretask` before planning or editing.
5. Read `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.
6. Use the Pre-Task Brief to reduce wrong assumptions, apply current user patterns, avoid repeated failures, and reuse relevant successful approaches.
7. Perform the task within the current user request.
8. After meaningful work, capture the result with `aftertask --request "<original user request or faithful summary>" --candidates "<agent-candidate-json>"` unless the user opted out.
9. Let VibeBox validate the agent's structured candidates, dedupe, apply replacement safety, index, and render active memory.
10. Treat active memory as the latest optimized pattern graph, not as a permanent history list.

This is an auto-intervention policy, not a hardcoded trigger list. The agent should consider repository context, change risk, prior memory value, and user preference before deciding whether VibeBox should intervene.

## Standard CLI Workflow

1. Initialize the global user store once with `vibebox init`.
2. Run read-only `pretask` before memory-relevant repository work, using direct `vibebox.cmd` on Windows/Codex.
3. Read the Pre-Task Brief and inspect the repository.
4. Perform the requested coding, design, or review work.
5. Run `vibebox aftertask --request "<original user request or faithful summary>" --candidates "<agent-candidate-json>" ...` after meaningful work unless the user opted out.
6. Allow Core to validate and apply the agent's structured candidates: active memory, replacement, discard, quarantine, indexes, relations, and wiki rendering.
7. Use `vibebox review`, `vibebox approve <candidate-id>`, `vibebox approve --safe`, or `vibebox reject <candidate-id>` only for debugging, audits, or manual override.
8. Inspect project health with `vibebox report`, `vibebox blackbox`, and `vibebox doctor`.

VibeBox uses the global user store as the single source of truth. Sandboxed hosts can block access to `~/.vibebox` or `$VIBEBOX_HOME` because that store is outside the current workspace. Agents should request approved global-store access when needed, not create workspace-local memory snapshots, copied stores, or project-local `.vibebox` fallbacks.

## Pre-Task Brief Workflow

Use this before planning or editing when repository memory could affect the task and VibeBox is available for the current working directory:

Windows/Codex direct invocation:

```bash
vibebox.cmd pretask --task "Fix dashboard table scrolling"
```

Cross-platform installed command:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

Repository fallback:

```bash
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

`pretask` is read-only memory retrieval for repository files: it prints active guidance and should not modify repository files, but it still reads the global VibeBox store. Do not wrap it in `powershell.exe -Command` unless no direct invocation is possible. If a host approval layer blocks a wrapper-style command, retry direct `vibebox.cmd pretask --task "..."`, then `vibebox pretask --task "..."`, then the Node fallback. If a sandbox blocks the global store, request read-only global VibeBox store access. If all attempts fail, report that VibeBox guidance was unavailable and continue only when the current task can proceed safely.

The brief should guide attention, not replace codebase analysis. Apply active memory as constraints, risk warnings, project context, validation style, process guidance, and failure-prevention rules.

The brief has been consumed only when it changes the agent's plan or execution. A complete plan should identify:

- success criteria to satisfy
- failure approaches to avoid
- successful approaches to reuse when applicable

## After-Task Blackbox Workflow

Capture meaningful work after it happens:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --candidates "<agent-candidate-json>" --technical-outcome success --user-acceptance accepted
```

For longer records, keep the original request explicit:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --from-file task-result.txt
```

The file must include `Structured memory candidates:` when reusable memory should be stored, and should include `User request:`, `AI action summary:`, `Changed files:`, `Commands:`, and `Errors:` sections when present. Do not use `--summary` or `--from-file` alone for active memory. Without structured candidates, VibeBox records the event and warns; it does not create active user success criteria, active successful approaches, or active AI failure memory by itself.

Aftertask is a global store write/capture operation: it writes a blackbox event and ingests AI-agent structured candidates. The agent is responsible for decomposing structured user requests into reusable success criteria, project rules, user/domain patterns, validation/preservation expectations, scope limits, AI failure-prevention rules, and task context before capture. Core validates schema and BCP 47 fields, preserves raw evidence, dedupes, applies replacement safety, builds relation/category/project indexes, and renders the wiki. If sandbox permissions block aftertask, request global VibeBox store write access for aftertask capture or report that capture was unavailable. Skip capture when the user explicitly opts out.

Before running `aftertask`, scan the user request and task outcome across these candidate lanes:

- `user_success_criteria` for success conditions, style, scope limits, preservation rules, validation expectations, and reporting requirements.
- `ai_failure_memory` for user dissatisfaction, missed instructions, technical/tool/environment failures, and explicit avoid rules.
- `ai_successful_approach` for validated reusable approaches, workarounds, command sequences, or recovery methods.
- `task_context` for task-only files, local state, and temporary scope details that should not become durable guidance.
- `discarded_detail` or `no_reusable_memory_candidate` for details that were considered but should not become active memory, with a short reason.

Also scan the category axis for each meaning unit: user preferences, user patterns, design philosophy, validation patterns, process patterns, decision patterns, workflow rules, global avoid rules, prevention rules, tooling/technology preferences, AI failure patterns, AI success patterns, success patterns, and failure memory. Do not collapse separate validation, reporting, style, and failure-avoidance meanings into one summary-shaped candidate. If only one candidate is truly enough, include `whyOnlyOneCandidate`. If no reusable memory exists, include `no_reusable_memory_candidate` with `noCandidateReason`.

The agent must write Wiki display fields in the configured `memoryLanguage`. For example, in a `ko-KR` store, `displayTitle`, `displaySummary`, and `displayRule` should be Korean even if canonical `summary` remains English. Core does not translate missing display fields.

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

A durable memory can link to multiple categories. VibeBox writes one canonical note under the memory's primary category and links that same note from related category pages and the source project page.

Technical success and user acceptance are separate. Passing commands or completed edits do not justify a `success_pattern` when the user rejected the outcome. User rejection means the AI missed the user's success criteria. The user's correction becomes the latest success criteria, while the rejected AI result becomes AI failure memory. Passing validation plus a reusable approach and no rejection signal can become inferred AI successful approach automatically, but inferred success must not be described as confirmed by the user.

## Context Pack Usage

Use `context` when a compact memory pack is enough:

```bash
vibebox.cmd context --task "Update dashboard dependency handling"
```

`context` is read-only memory retrieval for repository files. It prints a compact active-memory pack and should not modify repository files, but it still reads the global VibeBox store. On non-Windows systems, `vibebox context --task "..."` is the normal installed command.

Use `pretask` when an agent is about to act, because it includes more direct instructions and risks.
Pretask should consider both failure memory and success patterns when relevant: failure memory is prevention guidance, while success memory is reusable approach guidance.

`context` and `pretask` should both expose the same core lanes when relevant:

- User Success Criteria
- AI Failure Avoidance
- AI Successful Approaches

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

Windows/Codex direct command order:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

Preferred command outside Windows:

```bash
vibebox <command>
```

Do not use `powershell.exe -Command` as a normal workflow example. It is only a last-resort wrapper when direct invocation is impossible, and agents should report when they had to proceed without VibeBox guidance.

## External Project Workflow

After `npm link`, run VibeBox from another project:

```bash
vibebox init
vibebox pretask --task "Check project memory before editing"
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --candidates "<agent-candidate-json>" --technical-outcome success --user-acceptance accepted
vibebox extract --candidates "<agent-candidate-json>"
vibebox context --task "Change dependency handling"
vibebox report
vibebox blackbox --limit 5
vibebox doctor
vibebox backup --output ./vibebox-backup
vibebox restore --from ./vibebox-backup --confirm-replace
```

For manual debugging or override, add `vibebox review`, `vibebox approve <candidate-id>`, or `vibebox reject <candidate-id>`.

These commands use the global user store at `~/.vibebox` by default, or `VIBEBOX_HOME` when configured. They do not create project-local `.vibebox` folders, workspace-local memory snapshots, copied memory stores, pointer files, or hidden metadata in that project.

Summary-only `aftertask` and raw-text `extract --text` are raw evidence/debug paths only. They do not create active memory because Core does not semantically interpret user requests, headings, bullets, keywords, raw action summaries, or command output. If an agent receives a missing-candidates warning, it must prepare structured candidates and capture again.

## Current User Request Priority Rule

The current explicit user request has priority over past memory. If past memory conflicts with the current request, mention the conflict and follow the current request.

## Project Memory Vs Global Memory

For the current repository, project memory should guide work before global memory. If project and global memory conflict, treat it as a potential conflict and avoid silently resolving it.

Project identity is derived from the current AI working directory. Git remote `origin` and `package.json` name are preferred when present; otherwise VibeBox uses the current folder name. Static HTML/PHP folders, JSON-only folders, document folders, and plain folders are valid project workspaces unless they are excluded internal paths. Project memory lives under `projects/{projectId}/` in the global store; global preferences and rules live under `global/`.

## Adaptive Language Rule

Internal memory stays canonical for agents: JSON field names, enum values, relation types, command names, file paths, errors, and raw logs remain stable. The Obsidian wiki is the user display layer: filenames, category folders, headings, aliases, links, Recent Active Memory, category pages, project pages, and category-based memory notes follow the configured memory language. Visible note names are meaning-based; `mem_...` ids stay in frontmatter. Adapters must not call external translation APIs.

Language conversion and semantic rebuild are explicit agent-runtime operations:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko-KR en-US
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

Without an agent runtime marker, those commands intentionally stop before modifying files.
