# VibeBox Concept

VibeBox is an AI coding session local blackbox.

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

## Review-First Memory

VibeBox never promotes extracted memory automatically. New candidates are written to pending memory first. The user decides what becomes active memory.

This prevents one-time comments, experiments, or ambiguous statements from becoming permanent project rules.

## Current Request Wins

VibeBox memory is guidance, not a higher authority than the user. If active memory conflicts with the user's current explicit request, the agent should follow the current request and mention the conflict.

## Agent Neutrality

VibeBox is designed for local command workflows. It is not tied to Codex, Claude Code, Gemini CLI, Cursor, or any specific agent protocol.
