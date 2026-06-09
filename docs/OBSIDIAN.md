# Obsidian-Compatible Wiki

VibeBox renders active memory into an Obsidian-compatible Markdown wiki for human inspection.

The Wiki is a display layer. The single global store and JSON indexes remain the source of truth for retrieval.

Default wiki locations:

```text
<USER_HOME>/.vibebox/wiki
%USERPROFILE%\.vibebox\wiki
```

If `VIBEBOX_HOME` is set:

```text
<VIBEBOX_HOME>/wiki
```

## What The Wiki Shows

Managed pages show current active guidance:

- user success criteria
- user preferences and process patterns
- validation and reporting habits
- project decisions and guardrails
- AI failure avoidance
- prevention rules
- AI successful approaches and recovery patterns
- design philosophy and domain patterns

`Home.md` is the root index. It links to every category document, project index, and recent active memory note; it does not duplicate every memory body in one file.

The Wiki does not show raw transcripts as current guidance. Raw events live under `logs/` as diagnostics.

If a raw event has `userRequest` but no structured memory candidates, the Wiki does not gain synthetic user memory. If an event has only `aiActionSummary`, Core can preserve the raw event but cannot promote it to active memory.

## Agent-Provided Display Text

The AI agent is responsible for user-facing semantic display text:

- `displayTitle`
- `displaySummary`
- `displayRule`
- `displayLanguage`

For a store configured with a Korean language tag, these display fields should be Korean. Technical literals such as `npm.cmd test`, package names, paths, API names, and error codes may remain unchanged inside localized sentences.

Core validates canonical BCP 47 tags and renders the files. It does not translate, summarize, infer categories, or rewrite raw requests and action summaries into localized prose.

## Canonical Memory Vs Display

Canonical memory remains stable for agents:

- JSON field names
- enum values
- relation types
- command names
- file paths
- raw logs
- technical literals

Wiki display follows configured `memoryLanguage`:

- filenames
- category folders
- headings
- aliases
- summaries
- link labels
- Recent Active Memory
- project and category pages

`memoryLanguage` must be a valid canonical BCP 47 language tag. Core validates the tag generically and does not keep a hardcoded alias deny-list or a hardcoded supported-language list.

For non-default initial languages and conversion targets, the AI Agent must provide a complete display template for the exact configured tag. Core stores that template in `config.displayTemplates`; Core does not translate or synthesize localized template text.

## Document Identity

VibeBox separates stable identity from visible filenames.

The mapping lives in `registry/wiki-docs.json`:

- `docKey`: stable internal identity
- `fileName`: localized visible filename
- `title`: localized visible title
- `aliases`: canonical and localized names

Changing system locale does not rename files. Language conversion is explicit and requires an agent runtime marker.

## Category-Based Memory Notes

Important active memories get graph-visible notes under their localized category folder. VibeBox does not place every memory note into a single `wiki/memories/` folder.

Example English paths:

```text
Process Patterns/Create a concise implementation plan.md
Agent Failure Patterns/npm test shim failure.md
Agent Success Patterns/Validate with npm.cmd test.md
Prevention Rules/Avoid repeated validation command failure.md
```

Visible filenames and headings are meaning-based. `mem_...` ids stay in frontmatter metadata:

```markdown
---
title: "Validate with npm.cmd test"
id: "mem_example"
memoryRole: "ai_successful_approach"
type: "agent_success_pattern"
scope: "project"
vibebox: true
obsidianCompatible: true
memoryNote: true
---
```

A memory has one canonical note under its `primaryCategory`. Related category pages and the source project page link to that same canonical note instead of duplicating it.

VibeBox does not render separate topic or concept aggregate pages such as `Concept/`, `Dependency Management.md`, or `Redis.md`. Topic text remains metadata/display text unless it maps to a stable category document.

## Project Pages

`wiki/projects/{projectId}.md` is generated for registered project workspaces.

Project pages include active memory observed through `sourceProjectId`, even when the memory scope is global or domain-level. This lets users see what a project taught VibeBox without turning project-local facts into global rules.

Excluded paths include user home, the global store, drive roots, `.codex`, `.agents`, plugin caches, `node_modules`, system temp roots, and obvious tool/cache/internal folders.

## Managed Blocks

VibeBox updates managed sections:

```text
<!-- VIBEBOX:BEGIN -->
generated memory summary
<!-- VIBEBOX:END -->
```

Human notes outside managed blocks should be preserved.

## Active Graph Only

The Wiki excludes inactive memory from normal managed sections:

- replaced memory
- discarded memory
- quarantined memory
- rejected memory
- legacy/manual pending candidates
- task-only context with no reusable value

Raw events in `logs/events.jsonl` are diagnostic and are not rendered as current guidance.

## Link Integrity

`vibebox doctor` checks:

- localized Wiki links target real files
- duplicate localized documents are not present
- orphan project pages are reported
- active index references point to active memory
- managed links use the current localized filename and category folder
- legacy `wiki/memories/*mem_*.md` paths are reported
- visible filenames or headings do not expose `mem_...` ids
- project pages link observed memory through `sourceProjectId`
- suspicious raw secrets are reported

Doctor is read-only. It should not mutate the project registry or create project pages.

## Language Conversion And Rebuild

Language conversion:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang <from-bcp47> <to-bcp47> --display-template-file <agent-template.json>
```

Semantic rebuild:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

These commands require an AI Agent runtime marker and agent-provided semantic or localized data. Core applies file operations, link rewrites, registry updates, and integrity checks; it does not translate, summarize, or reclassify memory by reading raw logs.
