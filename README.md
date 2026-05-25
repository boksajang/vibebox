# VibeBox

**Universal local-first blackbox memory middleware for AI coding agents.**

VibeBox gives an AI coding agent a focused pre-task brief from reviewed memory, then records the task result as a local blackbox event for future review. It keeps one user-level global store and separates each project inside that store by `projectId`, so work repositories stay clean.

## What Is VibeBox?

VibeBox sits in front of Codex, Claude Code, Gemini CLI, Cursor-style agents, or any workflow that can run a local command. The Core is a local CLI; agent-specific files are thin packaging adapters.

Before work starts, VibeBox retrieves relevant memory: current-project decisions first, then useful global preferences, avoid rules, failures, and successful patterns. After work finishes, it records what happened and creates pending memory candidates. Nothing becomes active memory until you review and approve it.

## Why It Exists

AI coding agents often forget:

- which project decisions were already made
- which approaches failed before
- what the user explicitly rejected
- which files or tools should be avoided
- what worked well enough to reuse

VibeBox makes that memory local, inspectable, and reusable.

## Quick Start

From a clone with Node.js 20 or newer:

```bash
npm install
```

Use it from another project:

```bash
npm link
cd path/to/your-project
vibebox init
vibebox pretask --task "Fix dashboard table scrolling"
```

Direct fallback from the VibeBox repository also works:

```bash
node bin/vibebox.mjs init
node bin/vibebox.mjs pretask --task "Fix dashboard table scrolling"
```

On Windows PowerShell, if the npm `.ps1` shim is blocked by execution policy, use `vibebox.cmd <command>` or the direct `node bin/vibebox.mjs <command>` form.

After the agent finishes:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --outcome success
vibebox review
vibebox approve <candidate-id>
```

## Basic Workflow

1. Run `init` once from a repository to initialize the global store and register the current project.
2. Run `pretask` before the AI agent starts.
3. Give the Pre-Task Brief to the agent.
4. Run `aftertask` when the task is finished.
5. Review pending memory with `review`.
6. Promote useful memory with `approve` or skip it with `reject`.
7. Use `report`, `blackbox`, and `doctor` to inspect project memory health.

## Codex Plugin Marketplace

The repository includes a Codex marketplace manifest at `.agents/plugins/marketplace.json` and a plugin wrapper at `.codex-plugin/plugin.json`.

Final users should add the marketplace source with Codex instead of hand-editing Codex marketplace files:

```bash
codex plugin marketplace add boksajang/vibebox
```

Git URL form is also supported by Codex:

```bash
codex plugin marketplace add https://github.com/boksajang/vibebox.git
```

On Windows PowerShell, if `codex` is blocked by execution policy, use `codex.cmd plugin marketplace add ...`.

This registers the VibeBox marketplace source. Enable the `vibebox` plugin from Codex's plugin UI or plugin configuration, then start a new Codex session so the shared VibeBox skill can be loaded. The plugin wrapper gives Codex the skill instructions; the VibeBox Core CLI still needs to be reachable through `vibebox`, `vibebox.cmd`, or `node bin/vibebox.mjs`.

### Local Development / Troubleshooting

For local adapter testing from a checkout:

```bash
codex.cmd plugin marketplace add path\to\vibebox
```

Manual `marketplace.json` editing is not the normal install path. If you manually create or edit a Codex marketplace file in PowerShell and Codex reports a JSON parse error at line 1 column 1, rewrite the file as UTF-8 without BOM.

## Agent Skill Packaging

VibeBox includes a shared agent skill source and thin adapter guides:

- [Shared skill](skills/vibebox/SKILL.md): common instructions for any AI coding agent
- [Command reference](skills/vibebox/references/COMMANDS.md): exact CLI commands and fallback usage
- [Common adapter](adapters/common/README.md): baseline usage for shell-capable agents
- [Codex adapter](adapters/codex/README.md): local Codex plugin wrapper guide
- [Claude adapter](adapters/claude/README.md): Claude-compatible skill packaging guide

These adapters do not replace the CLI. VibeBox Core remains agent-neutral.

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

## Global Store

VibeBox writes one global store under `~/.vibebox` by default. Override it with `VIBEBOX_HOME` or `--store <path>` when testing or using a portable setup.

The store contains global memory in `global/`, project memory in `projects/{projectId}/`, human-readable Markdown in `wiki/`, retrieval indexes in `index/`, raw events in `logs/events.jsonl`, pending candidates in `pending/memory-candidates.jsonl`, and known project identities in `registry/projects.json`.

Projects are identified from the current working directory using git remote `origin`, `package.json` name, git root folder name, then current folder name.

VibeBox does not create `.vibebox/`, pointer files, or hidden metadata in the current working project.

## Obsidian-Compatible Wiki

VibeBox writes human-readable Markdown under `~/.vibebox/wiki/`. If `VIBEBOX_HOME` is set, open `$VIBEBOX_HOME/wiki` instead. The wiki uses normal Markdown, YAML frontmatter, and Obsidian-style `[[links]]`. Open that folder in Obsidian to inspect the whole cross-project memory graph. VibeBox only updates managed blocks, so user notes outside those blocks are preserved.

## Local-First Privacy

VibeBox stores data locally in the user-level global store. It does not send memory anywhere by itself. Sensitive-looking values such as API keys, tokens, passwords, bearer tokens, and connection strings are redacted before they reach active memory, wiki pages, or context output.

Existing project-local `.vibebox/` folders are legacy stores. `vibebox doctor` warns when one is present, but VibeBox does not destructively migrate it automatically.

## Documentation

- [Concept](docs/CONCEPT.md): AI coding blackbox and local memory model
- [Usage](docs/USAGE.md): command details and examples
- [Memory Model](docs/MEMORY_MODEL.md): memory types, scopes, confidence, and conflicts
- [Obsidian Wiki](docs/OBSIDIAN.md): wiki structure, links, and managed blocks
- [Common Agent Workflow](skills/vibebox/references/WORKFLOW.md): agent-neutral pre-task and after-task flow
- [Memory Policy](skills/vibebox/references/MEMORY_POLICY.md): review-first policy, conflicts, and sensitive data

## License

MIT License.

## Author

Created by **Boksajang**.
