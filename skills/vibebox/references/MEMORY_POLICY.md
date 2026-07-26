# VibeBox Memory Policy

VibeBox memory is local active context for AI coding work. It is not a replacement for the current user request or repository reality.

## Semantic Authority

The AI agent is the semantic authority. It decides intent, success criteria, corrections, AI failure signals, technical failure meaning, successful approaches, task-only details, model class, scope, categories, relations, replacement meaning, confidence, and localized display text.

VibeBox Core validates and manages structured candidates. It does not infer meaning from raw `userRequest`, headings, bullets, keywords, `aiActionSummary`, command output, or raw logs.

If `userRequest` is captured without structured candidates, Core records the raw event and warns. It creates no active user memory. If only `aiActionSummary` is provided, Core preserves evidence but creates no active memory.

## Memory Roles

- `user_success_criteria`: what success means for the user.
- `ai_failure_memory`: AI mistakes, rejected directions, and technical/tool/environment failures to avoid.
- `ai_successful_approach`: reusable approaches that worked or plausibly worked.
- `task_context`: current task details with no durable guidance value.
- `discarded_detail`: one-off, duplicate, noisy, or low-value details.

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

## Scopes

- `global`: broad user preference or rule.
- `domain`: domain-specific guidance.
- `project`: current repository guidance.
- `task`: current task only.
- `temporary`: short-lived allowance or experiment.

The agent must not treat the current repository as the default scope just because the memory was observed while working in that repository. Prefer `scope: "global"` for durable user personal preferences, repeated procedural instructions, tool preferences, validation preferences, and response/reporting preferences unless the memory is explicitly tied to one repository, product, dataset, artifact, local path, local cache state, or test suite.

Use `scope: "project"` when a rule depends on repository-specific product behavior, data/schema/API contracts, artifact format, UI flow, business rule, local setup, cache path, or explicit project name. A global memory can still keep `sourceProjectId` and `sourceProjectRoot` as provenance; do not set `projectId` only because the memory was learned during a project.

If the signal is user-centered and the only project-specific detail is the example where it was observed, prefer global and put the project detail in evidence or source provenance. If user wording or repository reality clearly narrows it, keep it project-scoped.

Project memory should guide the current repository before global memory. The current explicit user request still wins.

## Active Vs Inactive

Only active memory guides normal pretask/context output.

Inactive states:

- pending legacy/manual debug candidates
- rejected memory
- discarded memory
- quarantined memory
- replaced memory
- older superseded or archived records from previous stores

## Auto-Curated Policy

Normal flow:

```text
event captured
-> agent structured candidates supplied
-> Core validates / dedupes / replaces safely / indexes / renders
-> active graph, Wiki, and context updated
```

Manual review commands are for debugging, audits, and override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

## Candidate Breadth

The agent should review meaningful work across:

- user personal preferences and durable success criteria
- recurring user feedback, answer/reporting style, correction style, question style, and collaboration habits
- success criteria
- validation patterns
- response and reporting preferences
- process patterns
- design philosophy
- decision patterns
- workflow rules
- prevention and avoid rules
- tooling and technology preferences
- AI failure memory
- AI successful approaches
- task context
- discarded details

Separate meanings should become separate candidates. If a complex request yields only one candidate, include `whyOnlyOneCandidate`. If nothing reusable exists, submit `no_reusable_memory_candidate` with `noCandidateReason`.

## User-Centered Priority

User-centered memory has first priority in semantic extraction. Before routing a candidate to workflow, validation, process, prevention, project, or technical categories, the agent must decide whether the durable signal is really about the user.

Use these canonical categories:

- `primaryCategory: "user_preferences"` for personal preferences, durable success criteria, and stable likes/dislikes.
- `primaryCategory: "user_patterns"` for recurring feedback, answer/reporting style, communication style, correction patterns, question patterns, collaboration habits, repeated modification patterns, and repeated procedural instructions from the user about how the agent should work.

Repeated procedural instructions from the user, such as "analyze before modifying", "report before changing", "commit and push after validation", or recurring final-answer requirements, are user patterns because they describe how the user wants the agent to work. Use `primaryCategory: "user_patterns"` and add technical categories such as `validation_patterns`, `workflow_rules`, `process_patterns`, or `prevention_rules` as `relatedCategories`.

Workflow, validation, or process behavior discovered by the agent or required only by a specific project is not automatically a user pattern. Keep those memories under technical categories unless the repeated durable signal is the user's personal working preference.

When a user-centered signal also affects implementation, validation, or workflow, keep the user-centered category as primary if the repeated user behavior is the durable lesson. Add technical categories as `relatedCategories` instead of burying the memory outside the user-centered Wiki.

Do not submit `no_reusable_memory_candidate` until this user-centered audit has been performed. Repeated wording such as "always", "prefer", "do not", "next time", "again", direct corrections, dissatisfaction, and recurring final-answer requirements should normally create a user-centered candidate unless the signal is clearly one-off.

For user-centered candidates, run the scope audit before writing JSON: personal preferences, repeated procedures, and tool/validation/response preferences should normally be `scope: "global"` unless a concrete repository boundary is part of the durable rule.

## User Feedback

User instructions are success criteria. User corrections are more precise success criteria. User dissatisfaction is an AI failure signal, not user failure.

Passing tests or finishing edits can support inferred AI successful approach memory when the approach is reusable and there is no rejection signal. Inferred success must not be described as user-confirmed.

If the user rejects an outcome, route it to AI failure memory, correction guidance, or refined success criteria, not `success_pattern`.

## Failure Memory

AI failure memory can include:

- preference mismatch
- instruction misread
- overgeneralization
- example overfit
- command failure
- permission failure
- environment failure
- path failure
- browser/API/plugin/tool failure

Technical failure evidence becomes active AI failure memory only when represented by a structured candidate. Recovery methods that work should be captured as AI successful approaches.

## Conflict And Replacement

Conflict statuses:

- `no_conflict`
- `duplicate`
- `refinement`
- `exception`
- `direct_conflict`
- `supersedes`
- `needs_user_review`

Replacement or same-subject refinement removes older competing memory from active retrieval, active relations, namespace files, Context Packs, Pre-Task Briefs, and active Wiki sections when replacement safety passes.

Scoped exceptions can coexist with broader rules only when the condition is clear.

## Language Policy

Configured `memoryLanguage` controls Obsidian Wiki display text and must represent the user's actual conversation language.

`memoryLanguage` must be a valid canonical BCP 47 language tag. Core validates the tag generically and does not keep hardcoded alias deny-lists or supported-language examples.

For non-default initial languages and conversion targets, the AI Agent must provide a complete display template for the exact configured tag. Core stores it in `config.displayTemplates` and renders from that agent-provided template.

The AI Agent writes `displayTitle`, `displaySummary`, and `displayRule` in the configured language and sets `displayLanguage` to the exact configured tag. Core rejects missing display fields or a mismatched tag before activation and Wiki rendering. It does not translate, summarize, generate, or silently replace missing user-facing text with English.

`convert-lang` and semantic `rebuild` require an AI Agent runtime marker and agent-provided localized/semantic data.

## Runtime State

VibeBox uses one global user store:

```text
<USER_HOME>/.vibebox
```

or `VIBEBOX_HOME` when configured.

Global preferences and rules live under `global/`; project memory lives under `projects/{projectId}/`; Wiki, index, logs, pending/debug records, backup/restore material, and registry data live under the global store.

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in work projects. Old project-local stores are legacy; `doctor` warns about them and migration remains explicit and non-destructive.

## Sensitive Data

Do not store secrets in active memory, Wiki pages, or Context Packs:

- API keys
- tokens
- passwords
- bearer credentials
- private connection strings
- secrets printed in command output

If suspicious data appears, use `[REDACTED]` or omit it.
