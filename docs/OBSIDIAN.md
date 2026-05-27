# Obsidian-Compatible Wiki

VibeBox creates a human-readable active graph in the global store:

```text
~/.vibebox/wiki/
```

If `VIBEBOX_HOME` is set, open:

```text
$VIBEBOX_HOME/wiki/
```

The wiki is for inspection. Retrieval uses JSON indexes under `index/`; raw blackbox events stay under `logs/`.

## What The Wiki Shows

The wiki shows current active guidance, not a transcript archive. Managed pages summarize:

- user success criteria
- user preferences and process patterns
- validation and reporting habits
- project decisions and guardrails
- AI failure avoidance
- prevention rules
- AI successful approaches and recovery patterns
- design philosophy and domain patterns

User dissatisfaction is never shown as user failure. It is represented as AI failure memory, correction guidance, or a refined success criteria when useful.

## Localized Filenames

VibeBox keeps internal document identity stable with `docKey`, while visible Obsidian filenames follow the configured `memoryLanguage`.

Default English/Korean page examples:

```text
Home.md
User Preferences.md / 사용자 성향.md
User Patterns.md / 사용자 패턴.md
Design Philosophy.md / 설계 철학.md
Validation Patterns.md / 검증 패턴.md
Process Patterns.md / 처리 방식.md
Decision Patterns.md / 판단 방식.md
Technology Preferences.md / 기술 선호.md
Tooling Preferences.md / 도구 선호.md
Workflow Rules.md / 워크플로 규칙.md
Agent Failure Patterns.md / AI 실패 패턴.md
Agent Success Patterns.md / AI 성공 패턴.md
Prevention Rules.md / 예방 규칙.md
Global Avoid Rules.md / 전역 금지 규칙.md
Failure Memory.md / 실패 메모리.md
Success Patterns.md / 성공 패턴.md
Project Index.md / 프로젝트 인덱스.md
projects/{projectId}.md
```

The mapping lives in `registry/wiki-docs.json`:

- `docKey`: stable internal identity
- `fileName`: localized visible filename
- `title`: localized visible title
- `aliases`: canonical and localized names

System locale changes do not rename files. Language conversion happens only when the user explicitly runs `convert-lang` with an agent runtime marker.

## Project Pages

`wiki/projects/{projectId}.md` is generated only for registered project workspaces.

Valid workspaces include framework repos, static HTML/PHP folders, JSON-only app folders, documentation folders, and plain folders where an AI coding agent is working.

Excluded paths are not projects:

- user home
- VibeBox global store
- global store subfolders
- drive roots
- `.codex`
- `.agents`
- plugin cache folders
- `node_modules`
- system temp roots
- obvious tool/cache/internal folders

The global store is not a project. A page such as `wiki/projects/global-store.md` should not be created. `doctor` warns if an old registry entry or orphan project page exists.

## Markdown Format

Pages use YAML frontmatter:

```markdown
---
title: 사용자 성향
vibebox: true
obsidianCompatible: true
---
```

Pages use Obsidian-style links:

```markdown
[[사용자 성향]]
[[처리 방식]]
[[검증 패턴]]
[[AI 실패 패턴]]
[[AI 성공 패턴]]
[[예방 규칙]]
```

In a Korean store, managed links point to Korean filenames. In an English store, they point to English filenames. Links should not create empty English/Korean duplicates in the same store.

## Managed Blocks

VibeBox updates only managed blocks:

```text
<!-- VIBEBOX:BEGIN -->
generated memory summary
<!-- VIBEBOX:END -->
```

Human notes outside managed blocks are preserved.

## Active Graph Only

The wiki excludes inactive memory from normal managed sections:

- replaced memory
- discarded memory
- quarantined memory
- rejected memory
- legacy/manual pending candidates
- task-only context that has no reusable value

Raw events in `logs/events.jsonl` are diagnostic and are not rendered as current guidance.

## Link Integrity

`vibebox doctor` checks:

- localized wiki links target real files
- duplicate localized documents are not present
- orphan project pages are reported
- active index references point to active memory records
- managed links use the current localized filename
- suspicious raw secrets are reported

Doctor is read-only. It should not mutate the project registry or create project pages.

## Language Conversion

Language conversion is explicit and agent-required:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko en
```

`convert-lang` rewrites active memory user-facing text, localized filenames, aliases, headings, and managed wiki links. It leaves raw logs unchanged. JSON field names, enum values, relation types, and command names stay English.

VibeBox does not call external translation APIs.
