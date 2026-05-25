# VibeBox

**A local blackbox for AI coding sessions.**

VibeBox is a local-first memory middleware for AI coding agents. It gives an agent a focused pre-task brief from reviewed project memory, then records the task result as a local blackbox event for future review.

## What Is VibeBox?

VibeBox sits in front of tools like Codex, Claude Code, Gemini CLI, Cursor-style agents, or any workflow that can run a local command.

Before work starts, VibeBox retrieves relevant memory: decisions, preferences, avoid rules, failures, and successful patterns. After work finishes, it records what happened and creates pending memory candidates. Nothing becomes active memory until you review and approve it.

## Why It Exists

AI coding agents often forget:

- which project decisions were already made
- which approaches failed before
- what the user explicitly rejected
- which files or tools should be avoided
- what worked well enough to reuse

VibeBox makes that memory local, inspectable, and reusable.

## Quick Start

```bash
node bin/vibebox.mjs init
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

After the agent finishes:

```bash
node bin/vibebox.mjs aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --outcome success
node bin/vibebox.mjs review
node bin/vibebox.mjs approve <candidate-id>
```

## Common Workflow

1. Run `init` once in a repository.
2. Run `pretask` before the AI agent starts.
3. Give the Pre-Task Brief to the agent.
4. Run `aftertask` when the task is finished.
5. Review pending memory with `review`.
6. Promote useful memory with `approve` or skip it with `reject`.
7. Use `report`, `blackbox`, and `doctor` to inspect project memory health.

## Core Commands

```bash
node bin/vibebox.mjs init
node bin/vibebox.mjs pretask --task "..."
node bin/vibebox.mjs aftertask --request "..." --summary "..." --outcome success
node bin/vibebox.mjs context --task "..."
node bin/vibebox.mjs capture --request "..." --summary "..."
node bin/vibebox.mjs extract --text "..."
node bin/vibebox.mjs review
node bin/vibebox.mjs approve <candidate-id>
node bin/vibebox.mjs approve --safe
node bin/vibebox.mjs reject <candidate-id>
node bin/vibebox.mjs report
node bin/vibebox.mjs blackbox --limit 10
node bin/vibebox.mjs doctor
```

## Obsidian-Compatible Wiki

VibeBox writes human-readable Markdown under `.vibebox/wiki/`. The wiki uses normal Markdown, YAML frontmatter, and Obsidian-style `[[links]]`. VibeBox only updates managed blocks, so user notes outside those blocks are preserved.

## Local-First Privacy

VibeBox stores data locally in `.vibebox/`. It does not send memory anywhere by itself. Sensitive-looking values such as API keys, tokens, passwords, bearer tokens, and connection strings are redacted before they reach active memory, wiki pages, or context output.

## Documentation

- [Concept](docs/CONCEPT.md): AI coding blackbox and local memory model
- [Usage](docs/USAGE.md): command details and examples
- [Memory Model](docs/MEMORY_MODEL.md): memory types, scopes, confidence, and conflicts
- [Obsidian Wiki](docs/OBSIDIAN.md): wiki structure, links, and managed blocks

## License / Author

MIT License.

Created by **Boksajang**.
