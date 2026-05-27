# Obsidian-Compatible Wiki

VibeBox creates a Markdown wiki in the global store at `~/.vibebox/wiki/` by default. If `VIBEBOX_HOME` is set, use `$VIBEBOX_HOME/wiki`.

The wiki is meant for humans. JSON indexes under `~/.vibebox/index/` are meant for retrieval.

Open `~/.vibebox/wiki/` in Obsidian to inspect the active cross-project pattern graph. VibeBox does not create wiki files inside work repositories.

## Default Pages And Localized Filenames

```text
Home.md
User Preferences.md / 사용자 성향.md
User Patterns.md / 사용자 패턴.md
Design Philosophy.md / 설계 철학.md
Validation Patterns.md / 검증 패턴.md
Process Patterns.md / 처리 방식.md
Decision Patterns.md / 판단 방식.md
Technology Preferences.md / 기술 선호.md
Agent Failure Patterns.md / AI 실패 패턴.md
Agent Success Patterns.md / AI 성공 패턴.md
Prevention Rules.md / 예방 규칙.md
Global Avoid Rules.md / 전역 금지 규칙.md
Failure Memory.md / 실패 메모리.md
Success Patterns.md / 성공 패턴.md
Tooling Preferences.md / 도구 선호.md
Workflow Rules.md / 워크플로 규칙.md
Project Index.md / 프로젝트 인덱스.md
projects/{projectId}.md
```

`wiki/projects/{projectId}.md` is generated only for registered project workspaces. Plain folders, static sites, PHP folders, JSON-only app folders, and document folders can have project pages when an AI coding agent works there. The global store and user home are not projects, so pages such as `wiki/projects/global-store.md` should not be created; `doctor` warns if an old registry entry or orphan page is found.

The current visible filename is chosen from the configured memory language and stored in `registry/wiki-docs.json`. Internal identity uses stable `docKey` values, so links can be rewritten when the user explicitly runs `convert-lang`.

VibeBox may also create concept pages such as `Dependency Management.md` or `Dashboard Development.md` when active memory links naturally to those topics.

The active graph pages show current guidance only. Replaced, rejected, discarded, quarantined, legacy pending, or older superseded memory is not rendered as current guidance. The wiki represents user success criteria, AI failure avoidance, and AI successful approaches as active graph content; it is not a raw transcript and it does not show user dissatisfaction as user failure.

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

In a Korean store the managed links point to Korean filenames, for example `[[검증 패턴]]`, not to a missing English page. The files remain normal Markdown and do not require Obsidian to be readable.

## Managed Blocks

VibeBox updates only managed blocks:

```text
<!-- VIBEBOX:BEGIN -->
generated memory summary
<!-- VIBEBOX:END -->
```

Human notes outside managed blocks are preserved.

## Raw Logs Stay Out of the Wiki

The wiki stores summaries, rules, decisions, failure causes, prevention guidance, success patterns, user patterns, design philosophy, validation patterns, process patterns, and links from the active graph. Raw event logs stay in `~/.vibebox/logs/events.jsonl` with `projectId` metadata and are diagnostic only; they are not rendered as active guidance.

## Index Consistency

`vibebox doctor` checks whether active memories are connected to current localized wiki pages, whether active index references point to existing memory records, whether managed links target real files, and whether duplicate localized documents exist.

## Language Conversion

System locale changes do not automatically rename the wiki. Language conversion is explicit:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko en
```

`convert-lang` rewrites active memory user-facing text when the agent runtime is available, updates localized filenames, aliases, headings, and managed wiki links, and leaves raw logs unchanged. JSON field names and enum values stay English. VibeBox does not call external translation APIs.
