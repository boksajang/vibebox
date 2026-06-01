# VibeBox Workflow Reference

This reference describes the standard agent workflow. It applies to Codex, Claude-compatible agents, and any CLI agent that can run VibeBox.

## Default Agent Workflow

1. Receive the user task.
2. Decide whether prior memory could affect meaningful repository work.
3. Check VibeBox availability and global store access.
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

Recommended wording: `VibeBox uses one global store as the single source of truth. This sandboxed session may need approval to read or write the global VibeBox store. pretask/context require read access. aftertask requires write access for memory capture. No workspace-local memory snapshot will be created.`

## Pre-Task Retrieval

Windows/Codex:

```bash
vibebox.cmd pretask --task "Fix dashboard table scrolling"
```

Installed command:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

Repository fallback:

```bash
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

Do not use `powershell.exe -Command` as a normal workflow example. If a wrapper-style attempt is blocked, retry direct `vibebox.cmd`, then `vibebox`, then the Node fallback.

The brief has been consumed only when it changes the agent's plan, implementation, validation, or reporting.

## After-Task Capture

Use aftertask after meaningful work with the original user request or faithful summary:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-level scrolling and ran tests." --files "src/table.mjs" --commands "npm.cmd test" --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

Windows/Codex:

```bash
vibebox.cmd aftertask --request "Fix dashboard table scrolling" --summary "Updated table scrolling." --candidates-file structured-candidates.json
```

For long records:

```bash
vibebox aftertask --from-file task-result.txt
```

When active memory should be created, `task-result.txt` must include `User request:` and `Structured memory candidates:`. A file wrapper without structured candidates is raw evidence only. Without candidates, VibeBox records the event and warns instead of creating active memory.

Before capture, scan the request and outcome for:

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

Do not collapse separate validation, reporting, preservation, and failure-avoidance meanings into one summary-shaped candidate. If only one candidate is truly enough, include `whyOnlyOneCandidate`. If no reusable memory exists, include `no_reusable_memory_candidate` with `noCandidateReason`.

The agent must write Wiki display fields in configured `memoryLanguage`. Core validates BCP 47 tags and renders files; it does not translate missing display text.

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
vibebox.cmd context --task "Update dashboard dependency handling"
```

`context` is read-only and should not modify repository files, but it still needs global-store read access.

## Reports And Diagnostics

```bash
vibebox report
vibebox blackbox --limit 10
vibebox doctor
```

Reports and blackbox output summarize active graph and diagnostic task history without dumping raw logs. Doctor checks global store health, registry, JSON parsing, indexes, localized Wiki links, suspicious raw secrets, and legacy project-local stores.

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
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko-KR en-US
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

Without an agent runtime marker, these commands stop before changing files.
