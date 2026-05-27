# VibeBox Memory Policy

VibeBox memory is auto-curated local context for AI coding work. It is not a replacement for the current user request or the repository's actual state.

## Memory Types

- `user_preference`
- `project_decision`
- `architecture_rule`
- `avoid_rule`
- `failure_memory`
- `success_pattern`
- `tooling_preference`
- `technology_preference`
- `coding_style`
- `design_preference`
- `workflow_rule`
- `question_pattern`
- `response_preference`
- `process_pattern`
- `validation_pattern`
- `design_philosophy`
- `decision_pattern`
- `communication_pattern`
- `correction_pattern`
- `agent_failure_pattern`
- `agent_success_pattern`
- `handoff_pattern`
- `task_context`
- `discarded_detail`

Each record can also carry `modelClass`, `modelSubClass`, and `docKey`. `modelClass` separates `user_model`, `domain_model`, `project_model`, `task_context`, and `discarded_detail` so project facts do not leak into global guidance.

## Memory Scopes

- `global`: broad user preference across projects.
- `domain`: applies to a domain such as dashboards, apps, UI, backend, or dependency management.
- `project`: applies to the current repository.
- `task`: applies to the current task only.
- `temporary`: time-limited or experimental context.

Project memory should be considered before global memory for the current repository.

## Confidence Levels

- `low`: weak, inferred, tentative, or incomplete context.
- `medium`: likely preference or rule with some supporting context.
- `high`: explicit, confirmed, repeated, or strict context.

Low-confidence memory must not be treated as final fact.

## Active Vs Pending Memory

- `active`: optimized current memory available for Context Packs and Pre-Task Briefs.
- `pending`: legacy/manual debug candidate state.
- `rejected`: manually declined and inactive.
- `discarded`: replaced or declined and inactive.
- `quarantined`: held out of normal use because it is risky, conflicting, or unclear.

Pending, rejected, discarded, quarantined, and replaced memory must not be treated as active memory.
Older `superseded` or `archived` records from previous stores are inactive and must not guide normal work.

## Conflict Statuses

- `no_conflict`
- `duplicate`
- `refinement`
- `exception`
- `direct_conflict`
- `supersedes`
- `needs_user_review`

Direct conflicts, supersedes, exceptions, duplicate records, and unclear candidates are handled by the Auto Curator. Risky or unclear candidates are discarded, quarantined, or left in legacy/manual debug pending state instead of becoming active guidance.

## Active Replacement Policy

VibeBox maintains the latest optimized active graph, not a pile of competing rules.

- Replacement or correction: activating the new memory removes the older same-subject memory from active retrieval, active wiki sections, namespace files, and active relations.
- Refinement: if the new memory is the latest better expression of the same subject and scope, keep the refined memory and remove the competing older memory.
- Exception: keep the broader memory only when the exception has a clear `activeCondition`.
- Ambiguous candidates are quarantined or left in legacy/manual debug pending state.
- Raw logs can preserve diagnostic events, but raw logs are not normal retrieval context.

## Pattern Memory Policy

User patterns may describe question style, response preference, process habits, validation requirements, design philosophy, decision style, communication style, correction patterns, agent failure patterns, agent success patterns, and handoff style. A single vague statement should be discarded, quarantined, or marked low confidence; explicit or repeated behavior can become active through auto-curation or manual override.

Failure memory must include prevention guidance when possible. Success patterns should describe when to reuse the successful approach.
Pretask/context retrieval should consider relevant failure and success nodes together, not only one side.

Technical success and user acceptance are separate. Passing tests, clean command output, or completed edits can support technical outcome fields, but a user-rejected result must not become `success_pattern`.

## Auto-Curated Policy

New memory candidates are never authority by default. The normal flow is:

```text
event captured
-> userRequest and userFeedback analyzed first
-> candidates extracted
-> Auto Curator decides active / replace / discard / quarantine
-> active graph, wiki, and context updated
```

Manual commands remain available for debugging, audits, and override:

Use:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

Fallback:

```bash
node bin/vibebox.mjs <command>
```

On Windows PowerShell, use `vibebox.cmd <command>` if the npm `.ps1` shim is blocked.

## Sensitive Data Policy

Sensitive data must not enter active memory, wiki pages, or Context Packs.

Treat these as sensitive:

- API keys
- tokens
- passwords
- bearer credentials
- private connection strings
- secrets printed in command output

If suspicious data appears in raw task material, avoid repeating it and prefer `[REDACTED]`.

## Context-Based Classification Policy

Memory classification should consider context, not just isolated words.

Use these judgment axes:

- Source priority: userRequest, userFeedback, prior active success/failure, project context, AI action summary, command result, changed files.
- Permanence: one-off instruction, temporary allowance, repeatable rule, or long-term preference.
- Scope: current task, current project, domain, or global.
- Certainty: weak opinion, preference, confirmed decision, or strict rule.
- Intent: instruction, correction, rejection, confirmation, exception, or replacement.
- Evidence: explicit user statement, result-based inference, repeated observation, or single event.
- Relation to existing memory: duplicate, refinement, exception, direct conflict, supersedes, or unclear.

## Why Keyword-Only Classification Is Not Enough

The same word can mean different things depending on intent and context. For example, a sentence may mention a database as a failed experiment, an approved decision, a temporary exception, or a broad preference. VibeBox should preserve that distinction.
Input length and fixed keyword examples are not authority. A short user correction can be important feedback when connected to the previous result, while a long instruction may mostly contain task-only details that should be discarded.

## Handling Uncertain Memory

When uncertain:

- Quarantine the candidate or leave it in legacy/manual debug pending state.
- Mark low confidence when appropriate.
- Use `needs_user_review` for unclear conflicts.
- Do not include it as an active constraint in normal pre-task output.

## Current Request Vs Past Memory

The user's current explicit request wins over past memory. If active memory warns against the current request, mention the warning and follow the user's current instruction unless it creates a safety or feasibility issue.

## Runtime State Exclusion Policy

VibeBox runtime state lives in one global user store at `~/.vibebox` by default, or under `VIBEBOX_HOME` when configured. Global preferences and rules live under `global/`; project memory lives under `projects/{projectId}/`; wiki, index, logs, manual-debug pending, backup/restore material, and registry data live under the global store.

The project id is derived from the current AI working directory. Git remote `origin` and `package.json` name are preferred identity hints when present; otherwise VibeBox uses the current folder name. Plain folders, static sites, PHP folders, JSON-only app folders, and document folders are valid project workspaces unless the path is user home, the global store, a drive root, `.codex`, `.agents`, plugin cache, `node_modules`, or another tool/cache/internal folder.

VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects. Old project-local stores are legacy; `doctor` warns about them, and migration remains explicit and non-destructive.

## Adaptive Language Policy

Human-facing active memory and wiki managed content follow the configured memory language. Raw logs can preserve captured source text. Wiki identity uses stable `docKey` values with localized visible filenames, links, headings, and aliases. JSON field names, enum values, relation types, and command names stay English. VibeBox does not use external translation APIs.

`convert-lang` and semantic `rebuild` require an AI agent runtime marker. `backup` and `restore` do not. Restore is destructive replace, not merge, and requires explicit confirmation.
