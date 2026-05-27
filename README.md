# VibeBox

A local-first active user model and coding blackbox for AI coding agents.

AI coding agents often forget the decisions, failed attempts, review habits, design preferences, validation style, and success criteria that made earlier work succeed. VibeBox interprets user requests, user feedback, project context, and outcomes into a compact reusable user model. It does not store the user's words as a prompt log and it does not treat AI action summaries as the main memory signal. The Auto Curator decides what becomes active, replaced, discarded, or quarantined, then returns only the latest useful guidance before the next task.

## Why VibeBox Exists

VibeBox helps when AI coding agents:

- repeat failed approaches
- forget project decisions
- suggest tools or patterns the user already rejected
- ignore the user's preferred workflow or validation style
- lose context across long-running projects and new sessions
- miss recurring agent failure patterns that should become prevention rules

## How It Works

```text
User task
-> Agent checks VibeBox memory
-> VibeBox returns active guidance
-> Agent works with fewer wrong assumptions
-> VibeBox captures the result
-> Candidates are extracted
-> Auto Curator decides active / replace / discard / quarantine
-> Active graph, wiki, and context are updated
```

VibeBox does not blindly pile up memories. It keeps the latest optimized active guidance for each subject and scope. When new memory replaces, corrects, or refines older memory, the outdated version is removed from normal retrieval, Context Packs, Pre-Task Briefs, the active relation graph, and the active wiki. Discarded, quarantined, rejected, and legacy pending memory are excluded from normal guidance.

## What VibeBox Remembers

- project decisions
- user preferences and rejection criteria
- domain preferences and avoidances
- failed approaches
- failure prevention rules
- success patterns
- validation style
- process habits
- design philosophy
- response preferences
- agent failure and success patterns

Memory is separated into User Model, Domain Model, Project Model, Task Context, and Discarded Detail. Project facts stay project-local. Only reusable user tendencies, validation habits, reporting preferences, design philosophy, and failure-prevention rules can become broader active memory.

## What VibeBox Is Not

- Not a cloud service
- Not a passive chat log archive
- Not a project-local `.vibebox` metadata folder
- Not tied to one AI coding agent
- Not a replacement for your coding agent

## Quick Start

In normal agent workflows, VibeBox commands are called by the agent through the shared skill or an adapter. You can also run them manually for setup, testing, or debugging.

Install from a checkout with Node.js 20 or newer:

```bash
git clone https://github.com/boksajang/vibebox.git
cd vibebox
npm install
npm link
```

Manual check:

```bash
vibebox doctor
```

Windows PowerShell fallback:

```bash
vibebox.cmd doctor
```

Direct fallback from this repository:

```bash
node bin/vibebox.mjs doctor
```

Codex marketplace:

```bash
codex plugin marketplace add boksajang/vibebox
```

After adding the marketplace, enable VibeBox from Codex's plugin UI and start a new session.

## Typical Agent Workflow

Before meaningful repository work, the agent checks VibeBox memory. During work, the agent uses active guidance as constraints, warnings, and preferences. After meaningful work, the agent captures a blackbox event; VibeBox extracts candidates and the Auto Curator updates the active graph when the candidate is good enough. Users do not manage memory after every task.

The CLI commands are the engine interface. AI agents can call them automatically through skills or adapters, and users can run review commands manually for debugging or override.

## Global Store

Default store:

```text
~/.vibebox
```

Override:

```text
VIBEBOX_HOME
```

Projects are separated by `projectId` inside the global store. The current AI working directory is treated as a project workspace even when it is a plain static site, PHP folder, JSON-only app folder, or documentation folder. Git remotes and package metadata improve the identity, but they are not required. VibeBox does not create `.vibebox` inside your work repositories.

## Obsidian-Compatible Active Graph

Open this folder in Obsidian:

```text
~/.vibebox/wiki
```

The wiki connects projects, failures, prevention rules, success patterns, user patterns, validation style, process habits, design philosophy, and decisions. It shows active/current guidance, not a pile of outdated history.

## Core Commands

```bash
vibebox init
vibebox doctor
vibebox pretask --task "..."
vibebox aftertask --request "..." --summary "..." --technical-outcome success --user-acceptance accepted
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
vibebox report
vibebox blackbox
vibebox backup --output ./vibebox-backup
vibebox restore --from ./vibebox-backup --confirm-replace
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko en
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

See the usage guide for the full command reference and fallback forms.

`backup` and `restore` are normal CLI operations. `convert-lang` and semantic `rebuild` are agent-required because they can rewrite user-facing active memory and localized wiki identity. If no agent runtime marker is present, those commands exit before modifying files.

## Agent Support

- Codex: marketplace/plugin wrapper included
- Claude: compatible skill guide included
- Cursor and other agents: usable through the shared skill and CLI when they can read files and run shell commands
- VibeBox Core: agent-neutral local CLI and memory engine

## Documentation

- [Usage](docs/USAGE.md)
- [Concept](docs/CONCEPT.md)
- [Memory Model](docs/MEMORY_MODEL.md)
- [Obsidian Wiki](docs/OBSIDIAN.md)
- [Shared Agent Skill](skills/vibebox/SKILL.md)
- [Agent Workflow](skills/vibebox/references/WORKFLOW.md)
- [Memory Policy](skills/vibebox/references/MEMORY_POLICY.md)
- [Common Adapter](adapters/common/README.md)

## Privacy

VibeBox is local-first. It does not sync memory to a cloud service by itself. Sensitive-looking values are redacted before active memory, wiki, and context output. Raw logs are diagnostic records, not active guidance. Obsidian wiki filenames, headings, aliases, and managed links follow the configured memory language through a stable internal `docKey` registry, while JSON field names and command names stay English.

## License / Author

MIT License. Created by Boksajang.
