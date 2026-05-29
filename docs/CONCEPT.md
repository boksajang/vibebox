# VibeBox Concept

VibeBox is a local-first active user model, active graph, and blackbox memory middleware for AI coding agents.

It is not a chat transcript archive, a passive history store, an action-summary recorder, a semantic extraction engine, or a remote memory service. The AI agent interprets user requests, user corrections, user feedback, project context, command outcomes, and prior active memory into structured reusable memory candidates. VibeBox Core validates, stores, dedupes, safely replaces, indexes, links, and renders those candidates. User instructions are success criteria. User corrections are more precise success criteria. User dissatisfaction is an AI failure signal, not user failure. VibeBox stores compact development memory in one user-level global store, then keeps only the latest active guidance in retrieval, Context Packs, Pre-Task Briefs, the active relation graph, and the Obsidian-compatible wiki.

## The Problem

AI coding agents can be effective inside a single task, but they often lose durable project context:

- why a technical choice was made
- which approach the user rejected
- which command or file change caused trouble
- which successful pattern should be reused
- which user success criteria define a good result
- which AI failure, tool failure, permission failure, or recovery pattern should not be repeated
- which user preference applies to this project
- how the user asks, reviews, validates, corrects, and hands work off

The user then has to repeat the same explanations.

## The VibeBox Loop

```text
User task
-> vibebox pretask
-> Pre-Task Brief
-> AI coding agent works
-> vibebox aftertask
-> Blackbox Event
-> AI-agent structured memory candidates
-> Core validation, dedupe, replacement safety, indexing, and rendering
-> active graph, wiki, and context updated for future tasks
```

The loop is not complete until the agent consumes the memory. A correct agent workflow must read the Pre-Task Brief, turn relevant memory into a concrete plan, avoid known AI failures, reuse applicable successful approaches, perform the work, and then capture the new event with `aftertask`.

## Guidance Lanes

Pretask and Context Pack output are organized around three practical lanes:

- User Success Criteria: current and remembered criteria for what a good result means to the user.
- AI Failure Avoidance: AI mistakes and technical/environment/tool failures that should not be repeated.
- AI Successful Approaches: reusable implementation, validation, command, recovery, or workaround methods.

These lanes are deliberately separate. User success criteria describe what the user wants. AI failure memory describes what the agent should avoid. AI successful approaches describe methods that helped satisfy the criteria.

## What Is Implemented

The current VibeBox implementation is a Node.js CLI with:

- global local-first runtime storage under `~/.vibebox`
- per-project namespaces under `projects/{projectId}/`
- global user preference and avoid-rule namespaces
- Obsidian-compatible Markdown wiki generation
- JSON indexes for retrieval
- Context Pack and Pre-Task Brief output
- active replacement of outdated memory
- situation-aware retrieval for implementation, debugging, architecture, documentation, verification, packaging, and handoff work
- after-task blackbox event capture
- structured memory candidate ingestion from the AI agent
- schema validation, BCP 47 validation, dedupe, replacement safety, indexing, and wiki rendering
- User Model, Domain Model, Project Model, Task Context, and Discarded Detail classification
- missing-candidate warnings when a `userRequest` is captured without agent semantic candidates
- raw blackbox evidence preservation without promoting action summaries or technical failures to active memory by itself
- manual `review`, `approve`, and `reject` commands for debug and override
- user pattern memory for validation style, process habits, design philosophy, response preference, correction patterns, and agent failure/success patterns
- localized Obsidian doc registry with stable internal `docKey` and configured-language filenames
- category graph expansion with one canonical memory note linked from all related category pages and the source project page
- backup, restore, convert-lang, and rebuild commands
- common agent skill documentation
- Codex, Claude-compatible, and common adapter guides

The adapter documents are packaging guides. The Codex adapter can be exposed through the repository's Codex marketplace manifest, but no adapter replaces the Core CLI or changes the agent-neutral memory model.

## Auto-Curated Memory

VibeBox's normal workflow is automatic curation, not per-task user review. After an event is captured, the AI agent supplies structured memory candidates for any reusable meaning. Core validates those candidates and decides whether they can become active, replace older active memory, be discarded, or be quarantined for manual inspection. If `userRequest` is present without structured candidates, Core records the raw event and warns instead of inventing active memory.

`review`, `approve`, and `reject` remain available for debugging, audits, and manual override. Pending memory is legacy/manual debug state; it is not normal workflow guidance.

Memory approval is not user acceptance. Memory approval is a manual/debug operation. User acceptance is the user's reaction to a work result, and it is used to classify the result as confirmed success, inferred success, rejected result, correction, or AI failure memory.

## Active Memory, Not History

VibeBox's active graph is the current optimized guidance set. If memory replaces, corrects, or refines an older memory for the same subject and scope, the older memory is removed from active retrieval, active wiki sections, active relation indexes, namespace files, Context Packs, and Pre-Task Briefs. Scoped exceptions can remain active next to a broader rule only when their condition is clear.

Discarded, quarantined, rejected, and legacy pending memory is excluded from normal retrieval, Context Packs, Pre-Task Briefs, the active wiki, and the active relation graph. Raw events in `logs/events.jsonl` are diagnostic blackbox records. They are not normal retrieval input and they are not rendered as current guidance.

Technical success and user acceptance are separate signals. User acceptance is not memory approval. A command can pass while the user rejects the result; that rejection means the AI missed the user's success criteria. Rejected outcomes must become AI failure memory, correction guidance, or updated success criteria, not user failure and not `success_pattern`. A validated reusable approach with no rejection signal may become inferred AI successful approach, but it must not be written as if the user confirmed it.

User instructions can create success criteria before a result exists. User corrections can refine or replace older criteria in the same scope. Command, permission, environment, browser, API, plugin, and tool failures can become AI failure memory even when there is no new user preference to extract.

For structured requests, VibeBox treats headings, bullet lists, reference baselines, consistency requirements, scope limits, preservation requirements, and validation conditions as meaning units. The user's requested success conditions are extracted before AI action summaries, so a successful implementation summary cannot crowd out the criteria it was supposed to satisfy.

## User Model Layers

Active memory is classified by reusable scope:

- User Model: preferences, visual taste, response style, process habits, validation habits, reporting expectations, design philosophy, reference handling, scope control, and rejection criteria.
- Domain Model: domain-specific preferences, avoidances, validation, process, success criteria, and failure prevention.
- Project Model: project identity, decisions, constraints, preservation rules, asset rules, structure rules, localization rules, and validation rules.
- Task Context: current task scope, allowed files, current copy, reference material, validation checklist, and implementation constraints.
- AI Failure Memory: preference mismatches, instruction misreads, overgeneralization, example overfit, technical failures, environment failures, permission failures, tool failures, and recovery warnings.
- AI Successful Approach: reusable implementation, validation, command, permission, path, or tool-recovery methods that helped satisfy the user's success criteria.
- Discarded Detail: raw instruction text, one-off implementation detail, duplicate summaries, low-value action summaries, task-only paths or labels, and test-only fixture details.

Project details do not become global memory by default. Only the user tendencies revealed by a project can be promoted beyond that project.

## Current Request Wins

VibeBox memory is guidance, not a higher authority than the user. If active memory conflicts with the user's current explicit request, the agent should follow the current request and mention the conflict.

## Agent Neutrality

VibeBox Core is designed for local command workflows. It is not tied to Codex, Claude Code, Gemini CLI, Cursor, or any specific agent protocol. Those integrations are adapters around the same core CLI and memory model.

## Adaptive Language

Internal memory stays canonical enough for agents to process reliably: JSON field names, enum values, relation types, command names, file paths, and raw technical literals stay stable. Obsidian is the user display layer: filenames, category folders, headings, aliases, links, Recent Active Memory, category pages, project pages, and category-based memory notes follow the configured memory language so English and Korean pages are not duplicated in one store. Visible note names are meaning-based; `mem_...` ids stay in frontmatter. Raw logs can preserve source text. VibeBox does not call external translation APIs; display-layer conversion requires an AI agent runtime marker.

## Maintenance Commands

`backup` and `restore` work in normal CLI mode. Restore is destructive replace, not merge, and requires explicit confirmation when a store exists.

`convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`. Without that marker they stop before modifying files.

## Global Runtime State

VibeBox uses one global store at `~/.vibebox` by default, overrideable with `VIBEBOX_HOME`. It never creates project-local `.vibebox/`, pointer files, or hidden metadata in a work repository. The current AI working directory is registered as a project workspace by default, whether it is a framework repository, static HTML/PHP folder, JSON-only app folder, documentation folder, or plain folder. Git remotes and package metadata are identity hints, not admission requirements. User home, the global store itself, drive roots, plugin caches, `.codex`, `.agents`, `node_modules`, and system temp roots stay outside `registry/projects.json`.

Old project-local `.vibebox/` folders are legacy state. `doctor` warns about them, but VibeBox does not destructively migrate them automatically.
