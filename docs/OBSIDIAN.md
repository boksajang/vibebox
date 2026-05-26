# Obsidian-Compatible Wiki

VibeBox creates a Markdown wiki in the global store at `~/.vibebox/wiki/` by default. If `VIBEBOX_HOME` is set, use `$VIBEBOX_HOME/wiki`.

The wiki is meant for humans. JSON indexes under `~/.vibebox/index/` are meant for retrieval.

Open `~/.vibebox/wiki/` in Obsidian to inspect the active cross-project pattern graph. VibeBox does not create wiki files inside work repositories.

## Default Pages

```text
Home.md
User Preferences.md
User Patterns.md
Design Philosophy.md
Validation Patterns.md
Process Patterns.md
Decision Patterns.md
Technology Preferences.md
Agent Failure Patterns.md
Agent Success Patterns.md
Prevention Rules.md
Global Avoid Rules.md
Failure Memory.md
Success Patterns.md
Tooling Preferences.md
Workflow Rules.md
Project Index.md
projects/{projectId}.md
```

VibeBox may also create concept pages such as `Dependency Management.md` or `Dashboard Development.md` when approved memory links naturally to those topics.

The active graph pages show current guidance only. Replaced, rejected, discarded, or older superseded memory is not rendered as current guidance.

## Markdown Format

Pages use YAML frontmatter:

```markdown
---
title: Global Avoid Rules
vibebox: true
obsidianCompatible: true
---
```

Pages use Obsidian-style links:

```markdown
[[Dependency Management]]
[[Dashboard Development]]
[[Failure Memory]]
[[Prevention Rules]]
[[User Patterns]]
[[Validation Patterns]]
[[Design Philosophy]]
```

The files remain normal Markdown and do not require Obsidian to be readable.

## Managed Blocks

VibeBox updates only managed blocks:

```text
<!-- VIBEBOX:BEGIN -->
generated memory summary
<!-- VIBEBOX:END -->
```

Human notes outside managed blocks are preserved.

## Raw Logs Stay Out of the Wiki

The wiki stores summaries, rules, decisions, failure causes, prevention guidance, success patterns, user patterns, design philosophy, validation patterns, process patterns, and links. Raw event logs stay in `~/.vibebox/logs/events.jsonl` with `projectId` metadata and are not rendered as active guidance.

## Index Consistency

`vibebox doctor` checks whether approved memories are connected to wiki pages and whether active index references point to existing memory records.

## Locale

Wiki filenames remain stable for tooling and Obsidian links. Human-facing page headings and managed section titles follow the configured locale. Built-in locales are `en-US` and `ko-KR`; memory text itself is preserved in the language it was captured in.
