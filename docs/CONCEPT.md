# VibeBox Concept

VibeBox is a local-first active user pattern graph and blackbox memory middleware for AI coding agents.

It is not a chat transcript archive, a passive history store, or a remote memory service. VibeBox stores compact, reviewable development memory in one user-level global store, then keeps only the latest active guidance in retrieval, Context Packs, Pre-Task Briefs, and the Obsidian-compatible wiki.

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
-> pending memory candidates
-> review / approve / reject
-> latest active pattern graph for future tasks
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
- pending-first memory review and approval
- user pattern memory for validation style, process habits, design philosophy, response preference, correction patterns, and agent failure/success patterns
- locale-aware human-facing headings for `en-US` and `ko-KR`
- common agent skill documentation
- Codex, Claude-compatible, and common adapter guides

The adapter documents are packaging guides. The Codex adapter can be exposed through the repository's Codex marketplace manifest, but no adapter replaces the Core CLI or changes the agent-neutral memory model.

## Review-First Memory

VibeBox never promotes extracted memory automatically. New candidates are written to pending memory first. The user decides what becomes active memory.

This prevents one-time comments, experiments, or ambiguous statements from becoming permanent project rules.

## Active Memory, Not History

VibeBox's active graph is the current optimized guidance set. If an approved memory replaces, corrects, or refines an older memory for the same subject and scope, the older memory is removed from active retrieval, active wiki sections, active relation indexes, and namespace files. Scoped exceptions can remain active next to a broader rule only when their condition is clear.

Raw events in `logs/events.jsonl` are diagnostic blackbox records. They are not normal retrieval input and they are not rendered as current guidance.

## Current Request Wins

VibeBox memory is guidance, not a higher authority than the user. If active memory conflicts with the user's current explicit request, the agent should follow the current request and mention the conflict.

## Agent Neutrality

VibeBox is designed for local command workflows. It is not tied to Codex, Claude Code, Gemini CLI, Cursor, or any specific agent protocol.

## Global Runtime State

VibeBox uses one global store at `~/.vibebox` by default, overrideable with `VIBEBOX_HOME`. It never creates project-local `.vibebox/`, pointer files, or hidden metadata in a work repository. The current project is identified from the working directory through git remote `origin`, `package.json` name, git root folder name, then current folder name, and stored in `registry/projects.json`.

Old project-local `.vibebox/` folders are legacy state. `doctor` warns about them, but VibeBox does not destructively migrate them automatically.
