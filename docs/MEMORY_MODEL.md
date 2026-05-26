# VibeBox Memory Model

VibeBox separates active memory from inactive diagnostic and manual-debug states.

- A blackbox event is captured.
- Memory candidates are extracted.
- The Auto Curator decides active, replace, discard, or quarantine.
- Context and pretask output use active memory first.
- Legacy/manual pending candidates may appear only in debug review flows.
- Replaced, discarded, quarantined, rejected, and pending memory is not part of normal retrieval, Context Packs, Pre-Task Briefs, the active wiki, or the active relation graph.

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

Low-confidence memory should not be treated as final fact. It is usually discarded, quarantined, or left in manual-debug pending state instead of becoming active guidance.

## Status

Memory can be:

- `active`
- `pending`
- `rejected`
- `discarded`
- `quarantined`

Only active memory is used as normal retrieval context.

`pending` is legacy/manual debug state, not the normal workflow. `rejected`, `discarded`, and `quarantined` memory is inactive. Older `superseded` or `archived` records from previous stores are treated as inactive. Current active replacement removes replaced memory from active indexes and namespace files instead of presenting it as current guidance.

## Conflict Status

New candidates are compared with active memory and marked as:

- `no_conflict`
- `duplicate`
- `refinement`
- `exception`
- `direct_conflict`
- `supersedes`
- `needs_user_review`

The Auto Curator uses these statuses to decide whether a candidate can become active, should replace an active record, should be discarded as noise, or should be quarantined for manual inspection. `approve --safe` is a manual/debug helper and skips anything that needs explicit review.

## Review Recommendations

`vibebox review` shows a recommended action for legacy/manual debug candidates:

- `approve`
- `reject`
- `merge`
- `supersede`
- `keep pending`

The recommendation is advisory. Normal users should not need this after every task; it exists for inspection and override.

## Sensitive Data

Secrets should not become active memory. VibeBox redacts common API keys, tokens, passwords, bearer tokens, and connection strings before writing active memory, wiki content, or context output. `doctor` warns about suspicious raw log values.

## Classification Notes

Classification is deterministic and heuristic-based. It considers permanence, scope, certainty, intent, evidence, and relation to existing memory. It is intentionally conservative and does not use an LLM.

## Conflict Handling Notes

- `duplicate`: discard as noise unless manual inspection finds missing value.
- `refinement`: activate the better expression and remove the competing older memory when they should not stand side by side.
- `exception`: activate only when the exception scope is clear; keep the broader memory active and attach an `activeCondition` to the exception.
- `direct_conflict`: quarantine until a human decides.
- `supersedes`: activate the new memory and remove the older memory from active retrieval, active relation graph, namespace files, Context Packs, Pre-Task Briefs, and active wiki sections.
- `needs_user_review`: quarantine or leave in manual-debug pending state until the missing context is clarified.

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

Technical success and user acceptance are different signals. Passing tests, clean command output, or completed edits can support technical outcome fields, but a user-rejected result must not become `success_pattern`.

## Relation Index

`index/relation-index.json` stores active graph edges with stable English relation types such as `project_has_failure`, `failure_prevented_by_rule`, `success_resolves_failure`, `user_prefers_validation`, `agent_failed_by_pattern`, `memory_replaces_memory`, `memory_refines_memory`, and `memory_exception_to_memory`.

Each relation has `id`, `type`, `from`, `to`, `projectId`, `strength`, `evidence`, `createdAt`, and `active`. Relations that point to discarded replacement targets are marked inactive and are not treated as active guidance.

## Runtime State Policy

Memory records, raw logs, manual-debug pending candidates, indexes, registry entries, and wiki pages live under the user-level global store, `~/.vibebox` by default. `VIBEBOX_HOME` can override that location.

Project memory is stored under `projects/{projectId}/`. User-wide preferences, tooling preferences, avoid rules, workflow rules, coding style, and architecture patterns are stored under `global/`. The Obsidian-compatible wiki under `wiki/` connects all projects into one graph. The current project folder remains clean.

Existing project-local `.vibebox/` folders are legacy stores. VibeBox warns about them in `doctor` and does not run destructive automatic migration.

## Adaptive Language

Stored memory text is preserved as captured. Human-facing output follows explicit CLI options, environment variables, config, and user input language policy, and is not limited to `ko-KR` or `en-US`. JSON field names, enum values, and command names stay English. VibeBox does not use external translation APIs.
