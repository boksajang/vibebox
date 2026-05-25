# Obsidian-Compatible Wiki

VibeBox creates a Markdown wiki in `.vibebox/wiki/`.

The wiki is meant for humans. JSON indexes under `.vibebox/index/` are meant for retrieval.

## Default Pages

```text
Home.md
User Preferences.md
Project Decisions.md
Architecture Rules.md
Avoid Rules.md
Failure Memory.md
Success Patterns.md
Tooling Preferences.md
Workflow Rules.md
```

VibeBox may also create concept pages such as `Dependency Management.md` or `Dashboard Development.md` when approved memory links naturally to those topics.

## Markdown Format

Pages use YAML frontmatter:

```markdown
---
title: Avoid Rules
vibebox: true
obsidianCompatible: true
---
```

Pages use Obsidian-style links:

```markdown
[[Dependency Management]]
[[Dashboard Development]]
[[Failure Memory]]
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

The wiki stores summaries, rules, decisions, failure causes, prevention guidance, success patterns, and links. Raw event logs stay in `.vibebox/logs/events.jsonl`.

## Index Consistency

`vibebox doctor` checks whether approved memories are connected to wiki pages and whether index references point to existing memory records.
