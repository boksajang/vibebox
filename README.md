# VibeBox

VibeBox is a local-first active user model and coding blackbox for AI coding agents.

It exists so users do not have to repeat the same preferences, project rules, validation habits, and "do not do that again" feedback in every session.

## In One Minute

VibeBox watches the AI coding workflow around a project:

1. Before work, the agent reads VibeBox guidance.
2. During work, the agent applies the guidance as constraints and warnings.
3. After work, the agent records the original user request, result, commands, files, failures, and feedback.
4. The AI agent supplies structured memory candidates that express the reusable meaning.
5. VibeBox validates, stores, dedupes, connects, indexes, and renders those candidates.
6. The next agent receives updated success criteria, failure avoidance, and successful approaches.

VibeBox is not a prompt log and it is not a semantic interpreter. The AI agent analyzes user intent, success criteria, corrections, failures, categories, relations, and localized wiki display text. VibeBox Core manages memory storage, schema validation, BCP 47 validation, dedupe, replacement safety, indexes, relation graph, raw evidence, wiki rendering, doctor, and file operations.

## Semantic Authority Contract

- Meaning belongs to the AI agent, not VibeBox Core.
- `aftertask` and file-based capture must include `Structured memory candidates:` with `memoryRole`, `type`, `modelClass`, `scope`, category, display, evidence, replacement, and relation fields when active memory should be created.
- If a `userRequest` is present but structured candidates are missing, Core records the raw event, emits a warning, and creates no active user memory.
- An AI action summary alone never creates active user success criteria or successful approach memory.
- Command, tool, permission, path, and environment failure evidence can be preserved as raw event evidence, but active `ai_failure_memory` requires an agent-provided structured candidate.
- Core does not use fixture-specific branches, keywords, headings, bullets, or raw request text to decide memory role, type, model class, category, title, or localized summary.
- Agents should split complex user requests into reusable meaning units instead of one summary-shaped candidate: success criteria, validation patterns, response preferences, project/domain rules, failure-prevention rules, successful approaches, task context, and discarded details.
- If a complex request produces only one candidate, include `whyOnlyOneCandidate`; if no reusable memory exists, include a `no_reusable_memory_candidate` item with `noCandidateReason`.
- Wiki display fields are agent-authored user-facing text. `displayTitle`, `displaySummary`, `displayRule`, and `displayLanguage` should follow configured `memoryLanguage`; Core does not translate missing display text.
- `convert-lang` and semantic `rebuild` require an AI agent runtime and agent-provided localized/semantic data; Core only applies filenames, links, registry updates, and integrity checks.

## Core Philosophy

- The user's instruction is success criteria.
- The user's correction is a more precise success criteria.
- User dissatisfaction is an AI failure signal, not user failure.
- Technical, environment, permission, path, command, browser, API, plugin, and tool failures are AI failure memory.
- A workaround that succeeds can become an AI successful approach.
- User approval of memory is not part of the normal workflow.
- `review`, `approve`, and `reject` are debug/manual override commands.
- The current user request always wins over older memory.

## What Agents Receive Before Work

`vibebox pretask` and `vibebox context` return three main guidance lanes when relevant:

- **User Success Criteria**: what the user wants, including process, validation, reporting, design direction, preservation rules, and project-specific success conditions.
- **AI Failure Avoidance**: mistakes the AI should not repeat, including rejected directions, instruction misreads, overgeneralization, command failures, permission failures, and tool failures.
- **AI Successful Approaches**: reusable methods that helped satisfy the user's criteria, including validation commands, implementation approaches, and recovery/workaround patterns.

The agent must apply this guidance in the actual plan and implementation. VibeBox is not useful if the agent merely prints the memory and ignores it.

## What VibeBox Remembers

VibeBox separates memory by role and scope:

- **User Model**: reusable user preferences, process habits, reporting expectations, validation style, design philosophy, and success criteria.
- **Domain Model**: preferences and avoidances for a domain such as brand landing pages, native apps, dashboards, backend work, packaging, or documentation.
- **Project Model**: project-specific identity, decisions, constraints, asset rules, localization rules, and preservation rules.
- **Task Context**: details useful only for the current task, such as allowed files or temporary checklists.
- **AI Failure Memory**: repeated-risk warnings for AI mistakes and technical/environment/tool failures.
- **AI Successful Approach**: reusable implementation, validation, command, recovery, or workaround methods.
- **Discarded Detail**: raw instruction text, one-off labels, duplicate summaries, and low-value action summaries.

Project facts stay project-local. Only reusable user criteria, domain preferences, AI failure prevention rules, and recovery approaches can become broader guidance.

## Normal Agent Workflow

Before meaningful repository work:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

After meaningful work:

```bash
vibebox aftertask \
  --request "Fix dashboard table scrolling" \
  --summary "Used wrapper-based scrolling and ran validation." \
  --files "src/table.mjs" \
  --commands "npm.cmd test" \
  --command-results "tests passed" \
  --candidates "<agent-structured-candidate-json>" \
  --technical-outcome success \
  --user-acceptance unknown
```

Always pass the original user request, or a faithful semantic summary, with `--request`, and pass AI-agent structured candidates after meaningful work. Review every meaningful task for user success criteria, validation pattern, response preference, process/design/decision pattern, prevention rule, AI failure memory, AI successful approach, task context, and discarded detail. If the agent concludes there is no reusable memory, record `no_reusable_memory_candidate` with `noCandidateReason`; if only one candidate is enough, include `whyOnlyOneCandidate`. Without candidates, VibeBox records the event and warns instead of creating active memory. Clear command/tool/environment failures are preserved as raw evidence; active AI failure memory requires an agent candidate.

## Auto Curation

After `aftertask`, VibeBox validates the agent's structured candidates and applies explicit status, dedupe, replacement-safety, relation, index, and integrity checks before routing each candidate to:

- `active`
- `replace`
- `discarded`
- `quarantined`

Active memory is the current optimized guidance set. Replaced, discarded, quarantined, rejected, and legacy pending memory are excluded from normal pre-task retrieval, active wiki sections, and active relation indexes.

Confirmed and inferred AI successful approaches can become active automatically. Inferred success must not be written as if the user confirmed it. If the user rejects the result, the result becomes AI failure/correction/prevention guidance, not a success pattern.

## Store And Projects

Default store:

```text
~/.vibebox
```

Override:

```text
VIBEBOX_HOME
```

VibeBox uses one global user store as the single source of truth. It does not create project-local `.vibebox` folders, workspace-local memory snapshots, copied memory stores, pointer files, or hidden metadata in work repositories.

Sandboxed agents may need approval to read or write that global store because it usually lives outside the current workspace. `pretask` and `context` are read-only memory retrieval for repository files, but they still require global-store read access and do not create project registry entries. `init`, `aftertask`, and `capture` can register the current project when write access is available; `aftertask` writes capture records, active memory, indexes, and wiki updates. If read approval is denied, report VibeBox guidance unavailable. If write approval is denied, report VibeBox capture unavailable and do not create a workspace-local snapshot. Codex users should see [Codex Adapter](adapters/codex/README.md) for sandbox and approval guidance.

The current AI working directory is treated as a project workspace unless it is an excluded internal path. Plain folders, static HTML/PHP folders, JSON-only app folders, documentation folders, and framework repos can all be projects. Git remotes and package metadata improve identity, but they are not required.

## Memory Language And Obsidian

Open the wiki in Obsidian:

```text
~/.vibebox/wiki
```

VibeBox keeps two layers separate:

- **Canonical memory**: JSON field names, enum values, relation types, memory roles, command names, file paths, and raw logs stay stable and mostly English/canonical.
- **Wiki display**: Obsidian filenames, category folders, headings, section labels, Recent Active Memory, memory notes, aliases, and managed links follow the configured `memoryLanguage`.

The wiki uses stable internal `docKey` values with localized visible filenames. In a Korean store, user-facing wiki pages use Korean names such as `사용자 성향.md`, `처리 방식.md`, `AI 실패 패턴.md`, and `AI 성공 패턴.md`. Important active memories get graph-visible notes under the matching category folder, such as `처리 방식/구현 전 간결한 계획 수립.md` or `AI 성공 패턴/npm.cmd test로 검증 성공.md`. The memory id stays in frontmatter, not in the visible filename or title.

Changing system locale does not rename memory. Language conversion is explicit and agent-required:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko-KR en-US
```

## Install And Run

From a checkout with Node.js 20 or newer:

```bash
git clone https://github.com/boksajang/vibebox.git
cd vibebox
npm install
npm link
vibebox init
vibebox doctor
```

Windows/Codex direct command preference:

```bash
vibebox.cmd pretask --task "..."
vibebox.cmd context --task "..."
vibebox.cmd aftertask --request "..." --summary "..." --candidates "<agent-candidate-json>"
```

Avoid wrapping read-only VibeBox retrieval commands in `powershell.exe -Command`; use direct `vibebox.cmd` first.

Direct repository fallback:

```bash
node bin/vibebox.mjs <command>
```

Codex users can enable the included VibeBox plugin wrapper. See [Codex Adapter](adapters/codex/README.md).

### Codex App Plugin Cache Check

VibeBox `0.1.1` bumps the plugin version to help Codex App stop reusing stale `0.1.0` plugin cache content. After updating the plugin, verify the installed cache version folder and compare key files before trusting the loaded skill:

```powershell
$repo = (Get-Location).Path
$cache = "$env:USERPROFILE\.codex\plugins\cache\personal\vibebox\0.1.1"
Test-Path $cache
Get-FileHash "$repo\.codex-plugin\plugin.json", "$cache\.codex-plugin\plugin.json"
Get-FileHash "$repo\skills\vibebox\SKILL.md", "$cache\skills\vibebox\SKILL.md"
Get-FileHash "$repo\skills\vibebox\references\WORKFLOW.md", "$cache\skills\vibebox\references\WORKFLOW.md"
Get-FileHash "$repo\skills\vibebox\references\COMMANDS.md", "$cache\skills\vibebox\references\COMMANDS.md"
Get-FileHash "$repo\skills\vibebox\references\MEMORY_POLICY.md", "$cache\skills\vibebox\references\MEMORY_POLICY.md"
Get-FileHash "$repo\adapters\codex\README.md", "$cache\adapters\codex\README.md"
Select-String -Path "$cache\skills\vibebox\SKILL.md" -Pattern "whyOnlyOneCandidate","no_reusable_memory_candidate","displayLanguage","Core will not infer active memory"
```

If the folder is still `0.1.0`, the hashes differ, or the latest contract phrases are missing, Codex App is reading stale installed cache content. Reinstall or update the plugin, or refresh the cache through Codex App; VibeBox does not delete or rewrite Codex's plugin cache automatically.

## Core Commands

```bash
vibebox init
vibebox doctor
vibebox pretask --task "..."
vibebox context --task "..."
vibebox aftertask --request "..." --summary "..." --candidates "<agent-candidate-json>"
vibebox report
vibebox blackbox
vibebox backup --output ./vibebox-backup
vibebox restore --from ./vibebox-backup --confirm-replace
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko-KR en-US
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

Manual debug/override commands:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

## Backup, Restore, And Rebuild

`backup` and `restore` are normal CLI commands. Restore is destructive replace, not merge, and requires explicit confirmation.

`convert-lang` and semantic `rebuild` require an agent runtime marker because they rewrite the Obsidian display layer: Markdown filenames, category folders, headings, aliases, links, category pages, project pages, memory notes, and the wiki-doc registry. They do not rewrite raw logs or internal JSON field names/enums. Without `VIBEBOX_AGENT_RUNTIME`, they exit before changing files.

## Agent Support

- Codex: plugin wrapper and shared skill included
- Claude: compatible adapter guide included
- Cursor and generic CLI agents: use the shared skill and CLI
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

VibeBox is local-first. It does not sync memory to a cloud service by itself. Sensitive-looking values are redacted before active memory, wiki, and context output. Raw logs are diagnostic records, not active guidance.

## License / Author

MIT License. Created by Boksajang.
