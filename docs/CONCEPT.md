# VibeBox Concept

VibeBox is AI-agent memory middleware. It gives coding agents a local active memory graph without asking the project repository to become a memory database.

The core principle is separation of responsibility:

- The AI agent interprets user requests, corrections, failures, project context, and outcomes.
- The AI agent submits structured memory candidates.
- VibeBox Core validates, stores, dedupes, safely replaces, indexes, links, and renders those candidates.
- The Obsidian Wiki displays active memory for users to inspect.

Core does not translate, summarize, infer categories, infer memory roles, or decide meaning from raw `userRequest`, headings, bullets, keywords, examples, action summaries, command output, or raw logs.

## The Problem

AI coding agents are good inside a single task, but durable context often disappears between sessions:

- project decisions and preservation rules
- commands the user expects before completion
- rejected approaches
- user reporting preferences
- tool, permission, command, or environment failures
- reusable recovery approaches
- domain-specific preferences

The user then has to repeat the same lessons. VibeBox exists to keep those reusable lessons available as active guidance.

## The Loop

```text
user task
-> pretask/context retrieval
-> active guidance consumed by the agent
-> repository work and validation
-> aftertask capture with userRequest and structured candidates
-> Core validation, dedupe, replacement, indexing, linking, wiki rendering
-> future pretask/context output improves
```

The loop is incomplete if the agent only prints the brief. The agent must apply relevant guidance to planning, implementation, validation, and reporting.

## Guidance Lanes

Pretask and Context Pack output group active memory into practical lanes:

- `User Success Criteria`: what success means for the user.
- `AI Failure Avoidance`: known mistakes, rejected directions, and technical failure patterns.
- `AI Successful Approaches`: reusable approaches, command sequences, and recovery methods.

All three lanes matter. Failure memory prevents repetition; success patterns show reusable ways forward; success criteria define what the user actually asked for.

## Active Memory

VibeBox is not a pile of history. Active memory is the current optimized guidance set.

Inactive states stay out of normal retrieval:

- replaced memory
- discarded memory
- quarantined memory
- rejected memory
- legacy/manual pending candidates
- task-only context with no reusable value

Raw events remain diagnostic evidence. They are not the normal prompt context and they do not become active guidance unless the agent submits structured candidates.

## Structured Candidates

After meaningful work, an agent should submit candidates for any reusable meaning:

- success criteria
- validation patterns
- reporting preferences
- process rules
- project or domain decisions
- preservation rules
- avoid rules
- AI failure memory
- successful approaches
- task-only context
- discarded details

If a complex request produces one candidate, include `whyOnlyOneCandidate`. If nothing reusable exists, submit `no_reusable_memory_candidate` with `noCandidateReason`. Do not rely on Core to infer missing memory later.

## Store Model

VibeBox uses one global user store as the single source of truth:

```text
<USER_HOME>/.vibebox
```

`VIBEBOX_HOME` or `--store <path>` can point to a different store.

The global store contains:

- `global/` for user-wide preferences and rules
- `projects/{projectId}/` for project memory
- `index/` for retrieval indexes
- `registry/` for project and wiki document identity
- `wiki/` for Obsidian-compatible display
- `logs/` for diagnostic raw events
- `pending/` for legacy/manual debug candidates

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in work repositories.

## Language Model

Internal memory stays canonical for agents: JSON field names, relation types, command names, enum values, paths, and raw logs remain stable.

The Wiki is the user-facing display layer. Filenames, titles, headings, summaries, aliases, and link labels follow configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. Core validates the tag generically and renders agent-provided display templates; it does not keep hardcoded locale packs, alias deny-lists, or supported-language examples.

The AI agent must provide localized `displayTitle`, `displaySummary`, `displayRule`, and `displayLanguage`. Core validates the language tag and renders files; it does not translate missing display text.

## Agent Neutrality

VibeBox Core is a local CLI and memory engine. Codex, Claude-compatible agents, Cursor, and generic CLI agents can use the same CLI, skill contract, and memory model. Adapters package or invoke the workflow; they do not fork memory behavior.
