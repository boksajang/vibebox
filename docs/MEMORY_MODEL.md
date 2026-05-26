# VibeBox Memory Model

VibeBox separates active memory from pending memory.

- Pending memory is extracted but not trusted yet.
- Active memory is reviewed and approved.
- Context and pretask output use active memory first.
- Pending conflict candidates may appear only as potential conflicts.
- Replaced or discarded memory is not part of normal retrieval or the active wiki graph.

## Memory Types

Active memory can use these types:

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

Pattern types are used only when they add retrieval value. For example, `validation_pattern` can guide test commands before completion claims, and `agent_failure_pattern` can become a repeated-risk prevention rule.

## Scopes

- `global`: applies broadly across projects
- `domain`: applies to a domain such as dashboards, apps, frontend, backend, or database work
- `project`: applies to the current project
- `task`: applies to a specific task
- `temporary`: applies only during a short-lived experiment or allowance

Current project memory ranks above global memory. If project and global memory conflict, VibeBox reports the conflict instead of silently hiding it.

`global` memory can omit `projectId`. `project`, `task`, and `temporary` memory must include a `projectId`. `domain` memory can be broad, or project-specific when it was learned from one project and should not override other projects.

## Confidence

VibeBox uses:

- `low`
- `medium`
- `high`

Low-confidence memory should not be treated as final fact. It is usually kept pending until the user confirms it.

## Status

Memory can be:

- `active`
- `pending`
- `rejected`
- `discarded`

Only active memory is used as normal retrieval context.

Older `superseded` or `archived` records from previous stores are treated as inactive. Current active replacement removes replaced memory from active indexes and namespace files instead of presenting it as current guidance.

## Conflict Status

New candidates are compared with active memory and marked as:

- `no_conflict`
- `duplicate`
- `refinement`
- `exception`
- `direct_conflict`
- `supersedes`
- `needs_user_review`

`approve --safe` skips anything that needs explicit review.

## Review Recommendations

`vibebox review` shows a recommended action:

- `approve`
- `reject`
- `merge`
- `supersede`
- `keep pending`

The recommendation is advisory. The user still controls approval.

## Sensitive Data

Secrets should not become active memory. VibeBox redacts common API keys, tokens, passwords, bearer tokens, and connection strings before writing active memory, wiki content, or context output. `doctor` warns about suspicious raw log values.

## Classification Notes

Classification is deterministic and heuristic-based. It considers permanence, scope, certainty, intent, evidence, and relation to existing memory. It is intentionally conservative and does not use an LLM.

## Conflict Handling Notes

- `duplicate`: do not auto-promote; review or reject as noise.
- `refinement`: approving a more specific memory for the same subject removes the competing broader active record when they should not stand side by side.
- `exception`: approve only when the exception scope is clear; keep the broader memory active and attach an `activeCondition` to the exception.
- `direct_conflict`: keep pending until a human decides.
- `supersedes`: approving the new memory removes the older memory from active retrieval, active relation graph, namespace files, Context Packs, Pre-Task Briefs, and active wiki sections.
- `needs_user_review`: keep pending until the missing context is clarified.

## Pattern Fields

Memory records keep stable English field names. Pattern-oriented records may include:

- `patternType`
- `situation`
- `trigger`
- `observedBehavior`
- `preferredBehavior`
- `preventionRule`
- `reuseWhen`
- `relatedProjects`
- `relatedPatterns`
- `relatedFailures`
- `relatedSuccesses`
- `relatedDecisions`
- `relatedPreferences`
- `replaces`
- `replacedBy`
- `activeCondition`

Failure memory can also include `failedApproach`, `failureReason`, `userCorrection`, `recurrenceRisk`, `relatedFiles`, and a `preventionRule`. Success patterns can include `successfulApproach`, `whyItWorked`, and `reuseWhen`.

## Relation Index

`index/relation-index.json` stores active graph edges with stable English relation types such as `project_has_failure`, `failure_prevented_by_rule`, `success_resolves_failure`, `user_prefers_validation`, `agent_failed_by_pattern`, `memory_replaces_memory`, `memory_refines_memory`, and `memory_exception_to_memory`.

Each relation has `id`, `type`, `from`, `to`, `projectId`, `strength`, `evidence`, `createdAt`, and `active`. Relations that point to discarded replacement targets are marked inactive and are not treated as active guidance.

## Runtime State Policy

Memory records, raw logs, pending candidates, indexes, registry entries, and wiki pages live under the user-level global store, `~/.vibebox` by default. `VIBEBOX_HOME` can override that location.

Project memory is stored under `projects/{projectId}/`. User-wide preferences, tooling preferences, avoid rules, workflow rules, coding style, and architecture patterns are stored under `global/`. The Obsidian-compatible wiki under `wiki/` connects all projects into one graph. The current project folder remains clean.

Existing project-local `.vibebox/` folders are legacy stores. VibeBox warns about them in `doctor` and does not run destructive automatic migration.
