# Obsidian-Compatible Wiki

VibeBox creates a human-readable active graph in the global store:

```text
~/.vibebox/wiki/
```

If `VIBEBOX_HOME` is set, open:

```text
$VIBEBOX_HOME/wiki/
```

The wiki is an inspection layer. Retrieval uses JSON indexes under `index/`; raw blackbox events stay under `logs/`.

## Canonical Memory vs Wiki Display

VibeBox keeps internal memory and Obsidian display separate:

- Canonical memory: `memoryRole`, `type`, `modelClass`, relation types, enum values, command names, file paths, errors, raw logs, and technical literals stay stable and mostly English/canonical.
- Wiki display: Markdown filenames, category folders, headings, section names, Recent Active Memory, memory summaries, aliases, and links follow the configured `memoryLanguage`.

For example, an internal failure summary can contain `Command failed: npm test exited with code 1`, while a Korean wiki renders it as `명령 실행 실패: npm test가 code 1로 종료됨.` Command literals such as `npm test`, `npm.cmd test`, package names, paths, and error codes may remain as-is inside localized sentences.

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

User dissatisfaction is never shown as user failure. It is represented as AI failure memory, correction guidance, or refined success criteria when useful.

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
Process Patterns/Create a concise plan before implementation.md
처리 방식/구현 전 간결한 계획 수립.md
Agent Failure Patterns/npm test shim failure.md
AI 실패 패턴/npm test shim 실패.md
```

The mapping lives in `registry/wiki-docs.json`:

- `docKey`: stable internal identity
- `fileName`: localized visible filename
- `title`: localized visible title
- `aliases`: canonical and localized names

System locale changes do not rename files. Language conversion happens only when the user explicitly runs `convert-lang` with an agent runtime marker.

## Category-Based Memory Notes

Category pages are not the whole graph. Important active memories get graph-visible notes under their localized category folder. VibeBox does not put all notes into a single `wiki/memories/` folder.

Examples:

```text
처리 방식/구현 전 간결한 계획 수립.md
사용자 성향/최종 보고에 변경 파일과 검증 결과 포함.md
AI 실패 패턴/npm test shim 실패.md
AI 성공 패턴/npm.cmd test로 검증 성공.md
예방 규칙/실패한 validation command 반복 금지.md
```

Visible filenames and headings are meaning-based. `mem_...` ids are stored only in frontmatter metadata:

```markdown
---
title: "구현 전 간결한 계획 수립"
id: "mem_c582e98bb3b4176a"
memoryRole: "user_success_criteria"
type: "process_pattern"
scope: "global"
sourceProjectId: "boksajang"
vibebox: true
obsidianCompatible: true
memoryNote: true
---
```

Node-level notes are generated for durable guidance such as:

- `user_success_criteria`
- `ai_failure_memory`
- `ai_successful_approach`
- prevention rules
- project decisions
- validation/reporting/process patterns
- repeated tool, command, permission, or environment failures
- recovery approaches

Task-only details, raw instruction text, temporary file paths, parser labels, discarded memory, quarantined memory, rejected memory, and low-value action summaries are not expanded into normal graph nodes.

Each memory note links back to its category and, when available, the project where the memory was observed. `sourceProjectId` means "observed in this project"; `scope` means where the memory applies. A global memory can still link to the project where it was learned.

A memory can belong to more than one category. VibeBox writes one canonical note under `primaryCategory`, records all `relatedCategories` in frontmatter, and has every related category page link to that same note. It does not duplicate the same memory note into multiple category folders.

## Project Pages

`wiki/projects/{projectId}.md` is generated only for registered project workspaces.

Project pages include memory observed through `sourceProjectId`, even when the memory scope is global or domain-level. Managed project sections separate observed user success criteria, user tendencies/patterns, AI failures, AI successful approaches, validation/preservation rules, project-specific decisions, and other related memory.

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
[[처리 방식/구현 전 간결한 계획 수립|구현 전 간결한 계획 수립]]
[[AI 성공 패턴/npm.cmd test로 검증 성공|npm.cmd test로 검증 성공]]
```

In a Korean store, managed links point to Korean filenames. In an English store, they point to English filenames. Links should not create empty English/Korean duplicates in the same store.

## Managed Blocks

VibeBox updates managed blocks:

```text
<!-- VIBEBOX:BEGIN -->
generated memory summary
<!-- VIBEBOX:END -->
```

Generated-only pages can have their managed shell refreshed during language conversion or rebuild so headings and navigation links match the current language. Human notes outside managed blocks should be preserved.

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
- managed links use the current localized filename and category folder
- legacy `wiki/memories/*mem_*.md` note paths are reported
- visible filenames or headings that expose `mem_...` ids are reported
- project pages link memory notes observed via `sourceProjectId`
- suspicious raw secrets are reported

Doctor is read-only. It should not mutate the project registry or create project pages.

## Language Conversion

Language conversion is explicit and agent-required:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko-KR en-US
```

`convert-lang` changes the Obsidian display layer: Markdown filenames, category folders, headings, aliases, managed links, Recent Active Memory, category pages, project pages, memory notes, and `registry/wiki-docs.json`. It leaves raw logs and internal canonical JSON fields/enums untouched.

VibeBox does not call external translation APIs.

## Rebuild

Semantic rebuild is explicit and agent-required:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

`rebuild` regenerates the active index, relation index, namespace files, doc registry, localized wiki files, category-based memory notes, and stale generated file cleanup from active memory. After rebuild, wiki links should resolve to real localized files and Recent Active Memory should render in the configured language.
