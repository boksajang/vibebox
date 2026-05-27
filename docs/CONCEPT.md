# VibeBox Concept

VibeBox is a local-first active user model, active graph, and blackbox memory middleware for AI coding agents.

It is not a chat transcript archive, a passive history store, an action-summary recorder, or a remote memory service. VibeBox interprets user requests, user feedback, project context, command outcomes, and prior active memory into normalized reusable guidance. It stores compact development memory in one user-level global store, then keeps only the latest active guidance in retrieval, Context Packs, Pre-Task Briefs, the active relation graph, and the Obsidian-compatible wiki.

## The Problem

AI coding agents can be effective inside a single task, but they often lose durable project context:

- why a technical choice was made
- which approach the user rejected
- which command or file change caused trouble
- which successful pattern should be reused
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
-> userRequest/userFeedback-first meaning extraction
-> Auto Curator decides active / replace / discard / quarantine
-> active graph, wiki, and context updated for future tasks
```

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
- Auto Curator promotion, replacement, discard, and quarantine decisions
- User Model, Domain Model, Project Model, Task Context, and Discarded Detail classification
- userRequest/userFeedback-first extraction with `aiActionSummary` as auxiliary evidence
- manual `review`, `approve`, and `reject` commands for debug and override
- user pattern memory for validation style, process habits, design philosophy, response preference, correction patterns, and agent failure/success patterns
- localized Obsidian doc registry with stable internal `docKey` and configured-language filenames
- backup, restore, convert-lang, and rebuild commands
- common agent skill documentation
- Codex, Claude-compatible, and common adapter guides

The adapter documents are packaging guides. The Codex adapter can be exposed through the repository's Codex marketplace manifest, but no adapter replaces the Core CLI or changes the agent-neutral memory model.

## Auto-Curated Memory

VibeBox's normal workflow is automatic curation, not per-task user review. After an event is captured, VibeBox extracts candidates and the Auto Curator decides whether each candidate should become active, replace older active memory, be discarded, or be quarantined for manual inspection.

`review`, `approve`, and `reject` remain available for debugging, audits, and manual override. Pending memory is legacy/manual debug state; it is not normal workflow guidance.

## Active Memory, Not History

VibeBox's active graph is the current optimized guidance set. If memory replaces, corrects, or refines an older memory for the same subject and scope, the older memory is removed from active retrieval, active wiki sections, active relation indexes, namespace files, Context Packs, and Pre-Task Briefs. Scoped exceptions can remain active next to a broader rule only when their condition is clear.

Discarded, quarantined, rejected, and legacy pending memory is excluded from normal retrieval, Context Packs, Pre-Task Briefs, the active wiki, and the active relation graph. Raw events in `logs/events.jsonl` are diagnostic blackbox records. They are not normal retrieval input and they are not rendered as current guidance.

Technical success and user acceptance are separate signals. A command can pass while the user rejects the result; rejected user outcomes must not become `success_pattern`.

## User Model Layers

Active memory is classified by reusable scope:

- User Model: preferences, visual taste, response style, process habits, validation habits, reporting expectations, design philosophy, reference handling, scope control, and rejection criteria.
- Domain Model: domain-specific preferences, avoidances, validation, process, success criteria, and failure prevention.
- Project Model: project identity, decisions, constraints, preservation rules, asset rules, structure rules, localization rules, and validation rules.
- Task Context: current task scope, allowed files, current copy, reference material, validation checklist, and implementation constraints.
- Discarded Detail: raw instruction text, one-off implementation detail, duplicate summaries, low-value action summaries, task-only paths or labels, and test-only fixture details.

Project details do not become global memory by default. Only the user tendencies revealed by a project can be promoted beyond that project.

## Current Request Wins

VibeBox memory is guidance, not a higher authority than the user. If active memory conflicts with the user's current explicit request, the agent should follow the current request and mention the conflict.

## Agent Neutrality

VibeBox Core is designed for local command workflows. It is not tied to Codex, Claude Code, Gemini CLI, Cursor, or any specific agent protocol. Those integrations are adapters around the same core CLI and memory model.

## Adaptive Language

Human-facing active memory and Obsidian managed content follow the configured memory language. The wiki uses stable internal `docKey` identity with localized visible filenames, headings, aliases, and links so English and Korean pages are not duplicated in one store. Raw logs can preserve source text. JSON field names, enum values, relation types, and command names stay English. VibeBox does not call external translation APIs; semantic conversion requires an AI agent runtime marker.

## Maintenance Commands

`backup` and `restore` work in normal CLI mode. Restore is destructive replace, not merge, and requires explicit confirmation when a store exists.

`convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`. Without that marker they stop before modifying files.

## Global Runtime State

VibeBox uses one global store at `~/.vibebox` by default, overrideable with `VIBEBOX_HOME`. It never creates project-local `.vibebox/`, pointer files, or hidden metadata in a work repository. The current project is identified from the working directory through git remote `origin`, `package.json` name, git root folder name, then current folder name, and stored in `registry/projects.json`.

Old project-local `.vibebox/` folders are legacy state. `doctor` warns about them, but VibeBox does not destructively migrate them automatically.
