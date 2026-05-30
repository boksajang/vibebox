# VibeBox Memory Model

VibeBox separates active memory from inactive diagnostic and manual-debug states.

- A blackbox event is captured.
- The AI agent interprets user requests, user feedback, failures, recoveries, categories, replacements, relations, and localized display text.
- The agent submits structured memory candidates as User Model, Domain Model, Project Model, Task Context, AI Failure Memory, AI Successful Approach, or Discarded Detail.
- Core validates schema and BCP 47 fields, preserves raw evidence, dedupes, applies replacement safety, indexes, and renders the wiki.
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
- `task_context`
- `discarded_detail`

Pattern types are used only when they add retrieval value. For example, `validation_pattern` can guide test commands before completion claims, and `agent_failure_pattern` can become a repeated-risk prevention rule.

## Model Classes

Every candidate and active memory can include:

- `modelClass`: `user_model`, `domain_model`, `project_model`, `task_context`, or `discarded_detail`
- `modelSubClass`: a narrower user/domain/project/task model such as `validation_preference_model`, `domain_avoidance`, `project_preservation_rule`, or `current_allowed_files`
- `docKey`: stable internal wiki identity used for localized Obsidian filenames and links
- `memoryRole`: `user_success_criteria`, `ai_failure_memory`, `ai_successful_approach`, `task_context`, or `discarded_detail`
- `successCriterion`: normalized user-facing criteria when the record represents what the user wants
- `primaryCategory`: the single category folder where the canonical Obsidian memory note is written
- `relatedCategories`: additional category pages that must link to the same canonical note

User Model includes preference, visual preference, response preference, process preference, validation preference, reporting preference, design philosophy, reference handling, scope control, and rejection criteria.

Domain Model includes domain preference, domain avoidance, domain validation, domain process, domain success criteria, and domain failure prevention.

Project Model includes project identity, project decisions, constraints, preservation rules, asset rules, structure rules, localization rules, and validation rules.

Task Context and Discarded Detail do not become normal active guidance. Current allowed files, current copy, task-only reference material, one-off labels, raw instruction text, low-value action summaries, and test fixture details should be discarded or kept out of active retrieval.

User instructions and corrections can become active success criteria before any result exists. User dissatisfaction does not mean the user failed; it means the AI result missed the user's criteria and should become AI failure memory, correction guidance, or a more precise active success criteria.

Structured user requests are decomposed by the AI agent, not by Core. Headings, bullets, reference/baseline statements, consistency requirements, validation or preservation requirements, reporting requirements, scope limits, avoid rules, and target lists may inform the agent's structured candidates, but Core does not infer meaning from those shapes. If `userRequest` exists without structured candidates, Core emits a missing semantic-candidate warning and creates no active user memory.

Candidate breadth should be rich enough to preserve distinct reusable meaning. Agents should explicitly consider user success criteria, validation patterns, response preferences, process patterns, design philosophy, decision patterns, prevention/avoid rules, AI failure memory, AI successful approaches, task context, and discarded details. If a complex `userRequest` is represented by only one candidate, the candidate set should include `whyOnlyOneCandidate`. If no reusable memory exists, submit a `no_reusable_memory_candidate` diagnostic with `noCandidateReason`; Core records the diagnostic and creates no active memory.

`aiActionSummary` is raw evidence only unless the AI agent submits a structured `ai_successful_approach` or other candidate. Command, permission, environment, path, API, browser, and tool failure evidence is preserved in raw events, but active `ai_failure_memory` requires an agent-provided candidate.

Candidate source types include `agent_semantic_extraction`, `technical_failure_detection`, `manual_override`, and `legacy_import`. User-request-based active memory normally uses `agent_semantic_extraction`.

AI Failure Memory includes `preference_mismatch`, `instruction_misread`, `overgeneralization_failure`, `example_overfit_failure`, `technical_failure`, `environment_failure`, `permission_failure`, and `tool_failure`. AI Successful Approach records reusable implementation, validation, command, recovery, or workaround methods that helped satisfy the user's criteria.

Pretask and Context Pack retrieval group active memory by role before presenting it to an agent:

- `user_success_criteria`: what success means for the user in the current task, domain, or project.
- `ai_failure_memory`: what the AI should avoid repeating.
- `ai_successful_approach`: methods that can be reused to satisfy the criteria or recover from known failures.

The agent should apply all three lanes together. Success criteria without failure avoidance can repeat old mistakes; failure memory without successful approaches can overconstrain the work.

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

The Auto Curator applies these explicit statuses with schema, dedupe, replacement-safety, relation, index, and integrity checks before routing a candidate to active memory, replacement, discard, or quarantine. `approve --safe` is a manual/debug helper and skips anything that needs explicit review.

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

Semantic classification belongs to the AI agent. The agent decides permanence, scope, certainty, intent, source priority, technical outcome meaning, user acceptance meaning, model class, categories, relations, and localized display text before submitting structured candidates. Core performs deterministic management checks only: schema validation, required field validation, BCP 47 validation, dedupe, replacement safety, relation/index generation, wiki rendering, and integrity checks. Agent runtimes provide semantic normalization for operations such as language conversion and semantic rebuild; Core does not translate, summarize, reclassify, or call external translation APIs.

## Conflict Handling Notes

- `duplicate`: discard as noise unless manual inspection finds missing value.
- `refinement`: activate the agent-marked refinement and remove the explicitly related older memory when they should not stand side by side.
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

Failure memory can also include `failedApproach`, `failureReason`, `failureCategory`, `affectedContext`, `recurrenceRisk`, `relatedFiles`, and a `preventionRule`. Successful approach memory can include `successfulApproach`, `recoveryApproach`, `whyItWorked`, `reuseWhen`, `successEvidence`, and `acceptanceBasis`.

Technical success and user acceptance are different signals. User acceptance describes the user's reaction to the work result; it is not memory approval. Passing tests, clean command output, or completed edits can support inferred success, but a user-rejected result must not become `success_pattern`.

Outcome fields:

- `technicalOutcome`
- `userAcceptance`
- `finalOutcome`
- `userFeedbackSignal`
- `successEvidence`
- `acceptanceBasis`
- `rejectionReason`
- `correctionDirection`
- `preventionRule`

`successEvidence=confirmed` means the user accepted, confirmed, or asked to keep the result. `successEvidence=inferred` means validation passed, no rejection signal exists, and the approach is reusable even without explicit user feedback. Inferred success can become active automatically, but it must not claim user confirmation. `technicalOutcome=success` with `userAcceptance=rejected` becomes `technical_success_user_rejected`, not a success pattern.

User success criteria do not require `technicalOutcome=success` or memory approval. A user request can establish criteria before work begins. AI successful approaches require evidence that a method worked or plausibly worked; AI failure memory can be created from user rejection, command failures, permission failures, environment failures, or tool failures.

## Relation Index

`index/relation-index.json` stores active graph edges with stable English relation types such as `project_has_failure`, `project_observed_memory`, `category_has_memory`, `memory_in_category`, `failure_prevented_by_rule`, `success_resolves_failure`, `user_prefers_validation`, `agent_failed_by_pattern`, `memory_replaces_memory`, `memory_refines_memory`, and `memory_exception_to_memory`.

Each relation has `id`, `type`, `from`, `to`, `projectId`, `strength`, `evidence`, `createdAt`, and `active`. Relations that point to discarded replacement targets are marked inactive and are not treated as active guidance.

## Runtime State Policy

Memory records, raw logs, manual-debug pending candidates, indexes, registry entries, backups created by the user, and wiki pages live under the user-level global store, `~/.vibebox` by default. `VIBEBOX_HOME` can override that location. Sandboxed hosts may require approval to read or write that store; VibeBox does not create workspace-local snapshots, copied stores, or project-local `.vibebox` fallbacks when approval is denied.

Project memory is stored under `projects/{projectId}/`. `pretask` and `context` are read-only retrieval commands and do not create project registry entries. `init`, `aftertask`, and `capture` register the current project when global store write access is available. User-wide preferences, tooling preferences, avoid rules, workflow rules, coding style, and architecture patterns are stored under `global/`. The Obsidian-compatible wiki under `wiki/` connects all projects into one graph. The current project folder remains clean.

Existing project-local `.vibebox/` folders are legacy stores. VibeBox warns about them in `doctor` and does not run destructive automatic migration.

## Language And Wiki Identity

VibeBox separates canonical memory from the Obsidian display layer. Internal memory records keep stable field names, enum values, relation types, command names, file paths, error text, and technical literals. Input language and `VIBEBOX_LOCALE` do not rewrite an existing store. Raw logs can preserve original source text.

The wiki separates `docKey` from localized filename/title/aliases. Obsidian filenames, category folders, headings, section labels, Recent Active Memory, managed summaries, aliases, and links follow `memoryLanguage`. Individual memory notes are placed under their category folders with human-readable titles; `mem_...` ids stay in frontmatter. Agent-provided `displayTitle`, `displaySummary`, and `displayRule` are the primary user-facing text. If display text is missing, Core does not translate canonical summaries; it can render a display-text-missing diagnostic. Changing system locale does not automatically rename files. `convert-lang` must be explicitly run and requires an agent runtime marker; it converts the wiki display layer, not raw logs or internal JSON field names/enums. `rebuild` recreates indexes, relation-index, namespace files, wiki files, category-based memory notes, and stale localized file cleanup from active memory.

## Backup And Restore

`backup` is a normal CLI command and copies the global store. `restore` is also normal CLI but is destructive replace, not merge; it requires explicit confirmation if a store exists.
