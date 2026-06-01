# VibeBox Memory Model

VibeBox separates semantic interpretation from deterministic memory management.

The AI agent creates structured memory candidates. Core validates and manages them. This keeps VibeBox agent-neutral and prevents raw prompts, summaries, or logs from silently becoming active guidance.

## Semantic Authority

The AI agent decides:

- user intent and success criteria
- user corrections and rejection signals
- AI failure signals
- technical failure meaning
- successful approaches
- task-only details
- permanence, scope, and confidence
- model class and subclass
- primary and related categories
- relation and replacement meaning
- localized wiki display text

VibeBox Core decides:

- schema validation
- supported BCP 47 language validation
- redaction and raw evidence preservation
- dedupe and replacement safety
- active, discarded, quarantined, and legacy/manual pending routing
- relation and retrieval indexes
- Obsidian Wiki rendering
- doctor checks and file integrity

Core does not infer active memory from raw `userRequest`, `aiActionSummary`, headings, bullets, keywords, examples, command output, or raw logs.

## Candidate Roles

Structured candidates use one of these roles:

- `user_success_criteria`
- `ai_failure_memory`
- `ai_successful_approach`
- `task_context`
- `discarded_detail`

The normal pretask/context output prioritizes the first three roles as guidance lanes.

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

Pattern types should be used when they add retrieval value. Task context and discarded detail are recorded or discarded as diagnostics; they do not become durable active guidance.

## Model Classes

Candidates can use:

- `user_model`
- `domain_model`
- `project_model`
- `task_context`
- `discarded_detail`

Project facts stay project-scoped unless the agent identifies a reusable user or domain pattern. Project-specific details should not become global memory by accident.

## Scopes

- `global`: broad user preference or rule.
- `domain`: applies to a domain such as dashboards, frontend, backend, packaging, or documentation.
- `project`: applies to the current repository.
- `task`: applies only to the current task.
- `temporary`: short-lived allowance or experiment.

Project memory should be considered before global memory in the current repository. If project and global guidance conflict, the agent should report the conflict and follow the current user request.

## Confidence

VibeBox uses:

- `low`
- `medium`
- `high`

Low-confidence memory is a hint, not authority. Risky or unclear candidates should be discarded, quarantined, or left in legacy/manual debug state.

## Status

Memory can be:

- `active`
- `pending`
- `rejected`
- `discarded`
- `quarantined`

Only active memory guides normal pretask/context output. Pending is legacy/manual debug state, not normal workflow guidance.

## Conflict And Replacement

Candidate conflict statuses include:

- `no_conflict`
- `duplicate`
- `refinement`
- `exception`
- `direct_conflict`
- `supersedes`
- `needs_user_review`

When replacement or same-subject refinement is safe, Core removes the older competing memory from active retrieval, Context Packs, Pre-Task Briefs, namespace files, active relations, and active wiki sections.

Scoped exceptions can remain next to broader memory only when the active condition is clear.

## Required Candidate Breadth

For meaningful work, the agent should consider every applicable lane:

- user success criteria
- validation pattern
- response or reporting preference
- process pattern
- design philosophy
- decision pattern
- project or domain rule
- failure-prevention rule
- AI failure memory
- AI successful approach
- task context
- discarded detail

If the request contains separate reusable meanings, split them into separate candidates. If one candidate is truly enough, include `whyOnlyOneCandidate`. If no reusable memory exists, submit a `no_reusable_memory_candidate` diagnostic with `noCandidateReason`.

## Action Summaries Are Evidence

`aiActionSummary`, changed files, command results, and errors are evidence. They do not create active memory by themselves.

Clear command, permission, environment, path, API, browser, and tool failures can become active AI failure memory only when the agent submits a structured `ai_failure_memory` candidate.

Validated reusable methods can become AI successful approaches when the agent provides evidence. Inferred success must not be described as user-confirmed.

## Language Policy

Configured `memoryLanguage` controls Obsidian Wiki display text.

`memoryLanguage` must be a valid canonical BCP 47 language tag. Short aliases such as `ko`, `en`, `ja`, `cn`, or `tw` are not accepted.

Common examples:

- `ko-KR`
- `en-US`
- `ja-JP`
- `zh-CN`
- `zh-TW`
- `ar`

These are examples, not the full language limit.

The AI Agent writes `displayTitle`, `displaySummary`, `displayRule`, and `displayLanguage` in the configured language. VibeBox Core validates the BCP 47 tag and renders files from the agent-provided display fields. Core does not translate, summarize, or generate missing user-facing display text.

## Relation Index

`index/relation-index.json` stores active graph edges with stable relation types such as:

- `project_has_failure`
- `project_observed_memory`
- `category_has_memory`
- `memory_in_category`
- `failure_prevented_by_rule`
- `success_resolves_failure`
- `user_prefers_validation`
- `agent_failed_by_pattern`
- `memory_replaces_memory`
- `memory_refines_memory`
- `memory_exception_to_memory`

Relations to replaced or discarded memory are marked inactive and should not guide normal work.

## Runtime State

Memory records, indexes, registry entries, logs, pending/debug candidates, backups created by the user, and Wiki pages live under the single global store:

```text
<USER_HOME>/.vibebox
```

Override with `VIBEBOX_HOME` or `--store <path>`.

VibeBox does not create workspace-local snapshots, copied stores, or project-local `.vibebox` fallbacks when global store access is denied. Old project-local stores are legacy; `doctor` warns about them and does not migrate them destructively.

## Sensitive Data

Secrets should not become active memory, Wiki text, or Context Pack output. Redact or omit API keys, tokens, passwords, bearer credentials, private connection strings, and secrets printed in command output.
