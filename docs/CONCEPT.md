# VibeBox Concept

VibeBox is a universal local-first blackbox memory middleware for AI coding agents.

It is not a chat transcript archive and it is not a remote memory service. VibeBox stores compact, reviewable development memory inside the current project so an AI coding agent can avoid repeating the same mistakes across sessions.

## The Problem

AI coding agents can be effective inside a single task, but they often lose durable project context:

- why a technical choice was made
- which approach the user rejected
- which command or file change caused trouble
- which successful pattern should be reused
- which user preference applies to this project

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
-> active memory for future tasks
```

## What Is Implemented

The current VibeBox implementation is a Node.js CLI with:

- local `.vibebox/` runtime storage
- Obsidian-compatible Markdown wiki generation
- JSON indexes for retrieval
- Context Pack and Pre-Task Brief output
- after-task blackbox event capture
- pending-first memory review and approval
- common agent skill documentation
- Codex, Claude-compatible, and common adapter guides

The adapter documents are packaging guides. They do not replace the Core CLI and they do not claim marketplace or registry publication.

## Review-First Memory

VibeBox never promotes extracted memory automatically. New candidates are written to pending memory first. The user decides what becomes active memory.

This prevents one-time comments, experiments, or ambiguous statements from becoming permanent project rules.

## Current Request Wins

VibeBox memory is guidance, not a higher authority than the user. If active memory conflicts with the user's current explicit request, the agent should follow the current request and mention the conflict.

## Agent Neutrality

VibeBox is designed for local command workflows. It is not tied to Codex, Claude Code, Gemini CLI, Cursor, or any specific agent protocol.

## Runtime State

`.vibebox/` is generated inside user projects. It is local runtime state, not source code. Public repositories should usually ignore it unless a project intentionally chooses to publish sanitized sample memory.
