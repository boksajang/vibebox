# VibeBox Usage

This is the practical guide for installing and running VibeBox.

## Requirements

- Node.js `>=20`
- npm for `npm install` and `npm link`

## Installation

From a clone:

```bash
npm install
```

To create a global development command:

```bash
npm link
vibebox --help
```

On Windows/Codex, prefer the generated command shim directly. Do not wrap read-only memory retrieval commands in `powershell.exe -Command` unless no direct invocation is possible:

```bash
vibebox.cmd pretask --task "Check project memory before editing"
vibebox.cmd context --task "Change dependency handling"
vibebox.cmd --help
```

The direct Node fallback works from the VibeBox repository root:

```bash
node bin/vibebox.mjs <command>
```

## Runtime Storage

`vibebox init` creates or updates one user-level global store. By default that store is `~/.vibebox` on macOS/Linux and `C:\Users\{USER}\.vibebox` on Windows. Set `VIBEBOX_HOME` or pass `--store <path>` to use a different store.

The current AI working directory is treated as a project workspace unless it is an excluded internal path such as the user home directory, the VibeBox global store, a drive root, `.codex`, `.agents`, plugin cache, `node_modules`, or the system temp root. Git remote origin and `package.json` name improve project identity when present; otherwise VibeBox uses the current folder name. Project memory is stored under `projects/{projectId}/` inside the global store. VibeBox does not create `.vibebox/`, workspace-local memory snapshots, copied memory stores, pointer files, or hidden metadata inside work repositories.

In Codex or other sandboxed hosts, the global store may require explicit access because it is outside the workspace. `pretask` and `context` are read-only memory retrieval for repository files but still read the global store; `aftertask` writes capture records to that store. See `adapters/codex/README.md` for the Codex sandbox and approval guidance.

The global store contains:

- `config.json`
- `global/` for user-wide preferences and rules
- `projects/{projectId}/` for project decisions, failures, successes, and workflow rules
- `wiki/` for the Obsidian-compatible cross-project wiki
- `index/` for retrieval indexes
- `logs/events.jsonl` for raw blackbox events with `projectId`
- `pending/memory-candidates.jsonl` for legacy/manual debug candidates with `projectId` or `scope`
- `registry/projects.json` for known project identities
- `registry/wiki-docs.json` for stable `docKey` to localized wiki filename/title/alias mapping

`config.json` stores one primary `memoryLanguage`. Obsidian filenames, category folders, headings, section labels, Recent Active Memory, managed summaries, aliases, and links follow that language. `VIBEBOX_LOCALE` is only an environment hint and does not rewrite an existing store. Raw logs can preserve source text. JSON field names, command names, relation types, enum values, file paths, and technical literals remain canonical, and VibeBox does not use external translation APIs.

## Project Initialization

```bash
vibebox init
```

Fallback:

```bash
node bin/vibebox.mjs init
```

Initialization creates missing global-store files and preserves existing ones. It registers or refreshes the current project identity for the current working directory unless that directory is an excluded internal path. Plain folders, static HTML/PHP folders, JSON-only app folders, and documentation folders can all be project workspaces when an AI coding agent is working there.

## Pre-Task Usage

Run before non-trivial coding or design work:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

or:

```bash
vibebox pretask "Fix dashboard table scrolling"
```

`pretask` is read-only memory retrieval. It prints a Pre-Task Brief with relevant active memory, validation and process patterns, known failure risks, prevention rules, success patterns, project guardrails, potential conflicts, and instructions for the agent, and should not modify repository files. It chooses guidance by task situation, so debugging work emphasizes failure prevention and verification work emphasizes validation patterns.

The most important sections are:

- `User Success Criteria`: the user's current and remembered success conditions.
- `AI Failure Avoidance`: rejected directions, instruction misses, technical failures, environment failures, permission failures, tool failures, and prevention rules.
- `AI Successful Approaches`: reusable implementation, validation, command, recovery, or workaround methods.

Agents should apply these sections in the actual plan and work. Printing the guidance without using it is an incomplete VibeBox workflow.

## After-Task Usage

Run after meaningful work:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-based scrolling and kept package.json unchanged." --files "src/table.mjs" --commands "npm.cmd test" --technical-outcome success --user-acceptance accepted --candidates '[{"memoryRole":"user_success_criteria","type":"layout_constraint","modelClass":"project_model","modelSubClass":"ui_layout_rule","scope":"project","primaryCategory":"design_philosophy","relatedCategories":["validation_patterns"],"title":"Preserve dashboard layout while fixing table scroll","summary":"For this dashboard, preserve the existing layout and fix scrolling locally instead of changing global page flow.","rule":"Use component-level scrolling for dashboard tables unless the user asks for a layout restructure.","displayTitle":"Preserve dashboard table layout","displaySummary":"Preserve the existing dashboard layout and fix table scrolling locally.","displayRule":"Use component-level scrolling unless a layout restructure is requested.","displayLanguage":"en-US","confidence":"high","sourceType":"agent_semantic_extraction","evidence":["User requested a table scroll fix without changing package setup."]}]'
```

For longer notes:

```bash
vibebox aftertask --from-file task-result.txt
```

`aftertask` writes a blackbox event and accepts AI-agent structured memory candidates. The AI agent, not Core, decides reusable success criteria, failures, successful approaches, model class, scope, categories, replacements, relations, and localized display text. Core validates the candidate schema, applies BCP 47 checks, stores raw evidence, dedupes, applies replacement safety, indexes, and renders the wiki.

Do not call `aftertask` with only an AI action summary. Use `--request` or include a `User request:` section in a `--from-file` payload, and include `Structured memory candidates:` when the event should create active memory. If `userRequest` is present but candidates are missing, VibeBox records the event, warns, and creates no active user memory. If only `aiActionSummary` is present, Core preserves raw evidence but creates no active memory. Clear command/tool/environment failures can be preserved as raw evidence, but active AI failure memory requires an agent candidate.

Long `--from-file` payloads can use these wrapper sections:

```text
User request:
AI action summary:
Changed files:
Commands:
Errors:
Structured memory candidates:
```

The wrapper section names do not create memory by themselves; the JSON or structured block under `Structured memory candidates:` is the semantic contract.

## End-To-End Consumption Routine

A complete VibeBox cycle is:

1. Run `pretask` or `context` before work.
2. Read `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.
3. Write a plan that explicitly applies the relevant criteria, avoids relevant failures, and reuses relevant successful approaches.
4. Perform the work.
5. Run real validation when available.
6. Report changed files and validation results when the user's criteria require it.
7. Run `aftertask` with the original user request or faithful summary and the agent's structured memory candidates so the active graph can update.

This is the expected practical behavior for agents using the VibeBox skill or adapters.

## Capture And Extract

`capture` records a raw event supplied by the user or agent:

```bash
vibebox capture --request "..." --summary "..." --outcome partial
```

`extract` ingests agent structured candidates for validation, dedupe, replacement safety, indexes, and wiki rendering:

```bash
vibebox extract --candidates '<agent-structured-candidate-json>'
```

## Manual Review And Override

Normal workflows are auto-curated. Use these commands for debugging, audits, or manual override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

Safe approval is a manual/debug helper for no-conflict candidates:

```bash
vibebox approve --safe
```

Conflict, exception, supersede, duplicate, low-confidence, and review-needed candidates are discarded, quarantined, or left in legacy/manual pending state when automatic handling is not appropriate. When a candidate replaces or refines older active memory for the same subject and scope, the older memory is removed from active retrieval, Context Packs, Pre-Task Briefs, active wiki sections, active relations, and namespace files.

## Memory Language

`memoryLanguage` controls the human-facing display language. Internal JSON fields, enum values, relation types, command names, file paths, and raw logs stay canonical. Obsidian filenames, category folders, headings, Recent Active Memory, managed summaries, aliases, and links follow the configured language. Individual memory notes use human-readable filenames under category folders; ids remain in frontmatter. `VIBEBOX_LANGUAGE` or `--language` can seed a new store; `VIBEBOX_LOCALE` is only an environment hint and does not change an existing store. To intentionally change the wiki display language and localized filenames, run `convert-lang` from an adapter runtime.

## Context Pack

```bash
vibebox context --task "Update dashboard dependency handling"
```

`context` is read-only memory retrieval that prints a compact memory pack and should not modify repository files. `pretask` is usually better before coding because it is more instruction-oriented.

`pretask` and `context` include three core guidance lanes when relevant:

- User Success Criteria: what the user wants, including style, validation, reporting, preservation, and project-specific criteria.
- AI Failure Avoidance: preference mismatches, instruction misses, command failures, environment failures, permission failures, tool failures, and prevention rules.
- AI Successful Approaches: reusable implementation, validation, command, recovery, or workaround methods.

The Context Pack can include user patterns such as `validation_pattern`, `process_pattern`, `design_philosophy`, `correction_pattern`, and `agent_failure_pattern` when those patterns match the current task situation.

## Reports

```bash
vibebox report
vibebox blackbox --limit 10
```

`report` summarizes active memory and any legacy/manual debug pending state. `blackbox` summarizes recent task events, failed approaches, successful approaches, changed files, decisions, and prevention rules.

Reports and blackbox output are active-graph oriented. Raw logs remain diagnostic and are not treated as current guidance.

## Doctor

```bash
vibebox doctor
```

`doctor` checks the global store, current project identity, registry, JSON parsing, index consistency, wiki references, pending consistency, suspicious unredacted secrets in raw logs, and legacy project-local `.vibebox/` folders.

## Backup And Restore

Create a backup:

```bash
vibebox backup --output ./vibebox-backup
```

Restore by destructive replace:

```bash
vibebox restore --from ./vibebox-backup --confirm-replace
```

Restore never merges. If a store already exists, VibeBox prints a destructive replace warning and refuses to continue until explicitly confirmed.

## Language Conversion And Rebuild

Semantic operations require an AI agent runtime marker:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang ko-KR en-US
VIBEBOX_AGENT_RUNTIME=adapter vibebox language convert ko-KR en-US
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

Without `VIBEBOX_AGENT_RUNTIME` or an adapter-provided runtime marker, `convert-lang` and semantic `rebuild` exit before changing files. `convert-lang` also requires agent-provided localized display candidates; Core does not translate or rewrite meaning. Core updates Markdown filenames, category folders, headings, aliases, managed links, Recent Active Memory, category pages, project pages, memory notes, and the wiki-doc registry, then runs integrity checks. Raw logs are not rewritten, and internal JSON field names, enum values, relation types, and command names stay English.

## External Project Workflow

After `npm link`, VibeBox can be used from another repository:

```bash
cd path/to/another-project
vibebox init
vibebox pretask --task "Check project memory before editing"
vibebox aftertask --request "Check project memory before editing" --summary "Inspected project state." --technical-outcome success --user-acceptance accepted --candidates '[{"memoryRole":"task_context","type":"workflow_note","modelClass":"task_context","modelSubClass":"pretask_context","scope":"task","primaryCategory":"workflow_rules","relatedCategories":[],"title":"Project memory checked before editing","summary":"The agent checked VibeBox memory before editing this project.","rule":"Use the retrieved VibeBox context when planning repository work.","displayTitle":"Project memory checked","displaySummary":"The agent checked VibeBox memory before editing.","displayRule":"Use retrieved VibeBox context in the work plan.","displayLanguage":"en-US","confidence":"medium","sourceType":"agent_semantic_extraction","evidence":["Pretask was run before editing."]}]'
vibebox context --task "Change dependency handling"
vibebox report
vibebox blackbox --limit 5
vibebox doctor
```

For manual debugging or override, add `vibebox review`, `vibebox approve <candidate-id>`, or `vibebox reject <candidate-id>`.

On Windows/Codex, use direct `vibebox.cmd` for the same commands first. If a wrapper-style `pretask` or `context` attempt is blocked by host approval, retry `vibebox.cmd`, then `vibebox`, then `node bin/vibebox.mjs` from the repository before proceeding without VibeBox guidance.

## Troubleshooting

- If `vibebox` is not found, run `npm link` from the VibeBox repository or use `node bin/vibebox.mjs <command>`.
- If PowerShell blocks `vibebox.ps1`, use `vibebox.cmd <command>`.
- If `pretask` or `context` was blocked only because it was wrapped in `powershell.exe -Command`, retry direct `vibebox.cmd pretask --task "..."` or `vibebox.cmd context --task "..."`.
- If `pretask` or `context` was blocked because the sandbox denied `~/.vibebox` or `$VIBEBOX_HOME`, approve read-only global VibeBox store access or proceed only after reporting that guidance was unavailable.
- If `aftertask` was blocked by global store permissions, approve global VibeBox store write access for aftertask capture or report capture unavailable.
- If you need an isolated store, set `VIBEBOX_HOME` before running commands.
- If pre-task output is empty, check whether events were captured and inspect active memory with `report`. Use `review` and `approve` only for legacy/manual override.
- If indexes or wiki files look inconsistent, run `vibebox doctor`.
- If `doctor` reports an old project-local `.vibebox/`, treat it as legacy. No destructive migration is performed automatically.

## Examples

Dashboard database preference:

```bash
vibebox extract --candidates '[{"memoryRole":"user_success_criteria","type":"database_preference","modelClass":"domain_model","modelSubClass":"reporting_database_choice","scope":"domain","domain":"dashboard_reporting","primaryCategory":"technology_decisions","relatedCategories":["project_decisions"],"title":"Prefer MSSQL for dashboard reporting modules","summary":"For dashboard reporting modules, prefer MSSQL when reporting views already live there.","rule":"Use MSSQL for dashboard reporting modules that depend on existing reporting views.","displayTitle":"Prefer MSSQL for reporting dashboards","displaySummary":"Use MSSQL for dashboard reporting modules when the reporting views already live there.","displayRule":"Choose MSSQL for reporting dashboards tied to existing reporting views.","displayLanguage":"en-US","confidence":"medium","sourceType":"agent_semantic_extraction","evidence":["Agent semantic candidate from a reusable database preference."]}]'
```

App database preference:

```bash
vibebox extract --candidates '[{"memoryRole":"user_success_criteria","type":"database_preference","modelClass":"domain_model","modelSubClass":"prototype_database_choice","scope":"domain","domain":"small_app_prototypes","primaryCategory":"technology_decisions","relatedCategories":[],"title":"Supabase is acceptable for small app prototypes","summary":"For small app prototypes, Supabase is usually fine unless the project already has a database decision.","rule":"Use Supabase for small app prototypes when no project-specific database decision exists.","displayTitle":"Supabase for small prototypes","displaySummary":"Supabase is acceptable for small app prototypes without an existing database decision.","displayRule":"Use Supabase unless the project has already chosen another database.","displayLanguage":"en-US","confidence":"medium","sourceType":"agent_semantic_extraction","evidence":["Agent semantic candidate from a reusable prototype preference."]}]'
```

Package avoid rule:

```bash
vibebox extract --candidates '[{"memoryRole":"ai_failure_memory","type":"prevention_rule","modelClass":"user_model","modelSubClass":"dependency_churn_prevention","scope":"global","primaryCategory":"prevention_rules","relatedCategories":["workflow_rules"],"title":"Avoid unrequested package.json changes","summary":"Unrequested package.json changes have caused review problems, so avoid dependency churn unless explicitly requested.","rule":"Do not modify package.json unless the user explicitly asks or the task cannot be completed otherwise.","displayTitle":"Avoid package churn","displaySummary":"Unrequested package.json changes have caused review problems.","displayRule":"Do not modify package.json unless explicitly requested or necessary to complete the task.","displayLanguage":"en-US","confidence":"high","sourceType":"agent_semantic_extraction","evidence":["Agent identified an AI failure-prevention rule from prior review problems."]}]'
```

Failed layout approach:

```bash
vibebox aftertask --request "Fix table scroll" --summary "Tried changing global body overflow." --errors "Global overflow caused layout regressions." --outcome failure --candidates '[{"memoryRole":"ai_failure_memory","type":"prevention_rule","modelClass":"project_model","modelSubClass":"layout_failure_prevention","scope":"project","primaryCategory":"prevention_rules","relatedCategories":["design_philosophy"],"title":"Avoid global body overflow for table scrolling","summary":"Changing global body overflow to fix table scrolling caused layout regressions.","rule":"Fix table overflow at the component or wrapper level before touching global body overflow.","displayTitle":"Avoid global overflow scroll fixes","displaySummary":"Changing global body overflow caused layout regressions for table scrolling.","displayRule":"Use component or wrapper-level scrolling before changing global body overflow.","displayLanguage":"en-US","confidence":"high","sourceType":"agent_semantic_extraction","evidence":["Global overflow caused layout regressions."]}]'
```

Successful table scroll pattern:

```bash
vibebox aftertask --request "Fix wide table scroll" --summary "Wrapper-based table scrolling worked without global layout changes." --technical-outcome success --user-acceptance accepted --candidates '[{"memoryRole":"ai_successful_approach","type":"implementation_pattern","modelClass":"project_model","modelSubClass":"layout_recovery_approach","scope":"project","primaryCategory":"agent_success_patterns","relatedCategories":["success_patterns"],"title":"Use wrapper-based scrolling for wide tables","summary":"Wrapper-based table scrolling solved wide table overflow without global layout changes.","rule":"For wide table overflow, wrap the table in a local scrolling container first.","displayTitle":"Wrapper-based table scrolling","displaySummary":"Wrapper-based scrolling handled wide tables without global layout changes.","displayRule":"Wrap wide tables in a local scrolling container first.","displayLanguage":"en-US","confidence":"high","sourceType":"agent_semantic_extraction","evidence":["Validation passed after wrapper-based table scrolling."]}]'
```

Project decision:

```bash
vibebox extract --candidates '[{"memoryRole":"user_success_criteria","type":"project_decision","modelClass":"project_model","modelSubClass":"visualization_library_decision","scope":"project","primaryCategory":"project_decisions","relatedCategories":["technology_decisions"],"title":"Use ECharts for dashboard visualization","summary":"This project uses ECharts for dashboard visualization after rejecting Chart.js.","rule":"Use ECharts for dashboard visualization in this project unless the user changes the project decision.","displayTitle":"Use ECharts for dashboards","displaySummary":"This project uses ECharts for dashboard visualization after rejecting Chart.js.","displayRule":"Use ECharts for dashboard visualization unless the project decision changes.","displayLanguage":"en-US","confidence":"high","sourceType":"agent_semantic_extraction","evidence":["Agent semantic candidate from a project visualization decision."]}]'
```

Raw text extraction is available only for legacy/manual debugging. It stores raw evidence or manual-review material; it is not the normal semantic extraction workflow and Core will not infer active user memory from the raw sentence:

```bash
vibebox extract --text "Raw diagnostic note for manual inspection."
```
