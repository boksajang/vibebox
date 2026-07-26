# VibeBox Command Reference

This reference documents the current CLI surface.

Preferred installed command:

```bash
vibebox <command>
```

Windows/Codex command order:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

Do not use `powershell.exe -Command` as a default VibeBox example. Use it only when direct invocation is unavailable.

Global store override:

```bash
VIBEBOX_HOME=<USER_HOME>/vibebox-store vibebox <command>
vibebox <command> --store <USER_HOME>/vibebox-store
```

VibeBox uses one global store as the single source of truth. Do not create workspace-local memory snapshots, copied stores, or project-local `.vibebox` folders as a fallback.

## Access Categories

Read-only or inspection commands:

- `vibebox pretask`
- `vibebox context`
- `vibebox report`
- `vibebox blackbox`
- `vibebox doctor` when used for inspection
- `vibebox schema`

These commands are safe inspection commands. `schema` only prints Core's structured candidate contract and does not read or write the global store. The other commands read the global store. `pretask` and `context` do not create project registry entries.

Write or maintenance commands:

- `vibebox aftertask`
- `vibebox capture`
- `vibebox extract`
- `vibebox approve`
- `vibebox reject`
- `vibebox init`
- `vibebox setup-codex`
- `vibebox setup-claude`
- `vibebox backup`
- `vibebox restore`
- `vibebox convert-lang`
- `vibebox rebuild`

These commands create, update, export, restore, or maintain files in the global store or user-level agent configuration. `init`, `aftertask`, and `capture` can register the current project when write access is available. `setup-codex` and `setup-claude` target user configuration files under `~/.codex` and `~/.claude` so the default `~/.vibebox` store is allowed by the host.

If access is denied, request the narrow global-store access needed. For `pretask` or `context`, request approved read-only global VibeBox store access. For `aftertask`, request approved global VibeBox store write access or report capture unavailable and state that project registration, active memory, and wiki updates did not happen.

## Language Policy

Seed a new store:

```bash
VIBEBOX_LANGUAGE=<canonical-bcp47> VIBEBOX_DISPLAY_TEMPLATE='<agent-template-json>' vibebox init
vibebox init --language <canonical-bcp47> --display-template-file <agent-template.json>
```

Configured `memoryLanguage` controls Obsidian Wiki display text. It must represent the user's actual conversation language as a valid canonical BCP 47 tag. Core validates the tag generically and does not keep hardcoded language packs or a fixed list of supported languages.

For non-default initial languages and conversion targets, the AI Agent must provide a complete display template for the exact configured tag with `VIBEBOX_DISPLAY_TEMPLATE`, `--display-template`, or `--display-template-file`. Core stores it in `config.displayTemplates` and renders from that agent-provided template.

The template JSON can be either a direct template pack for the selected tag or `{ "displayTemplates": { "<canonical-bcp47>": { "...key": "localized text" } } }`. Adapters can call `displayTemplateSchema()` from `src/core.mjs` to inspect the required keys before asking the AI Agent to fill localized text.

`VIBEBOX_LOCALE` is only an environment hint. For agent-driven initialization, infer the user's language from the conversation and run `schema --language <canonical-bcp47>` before generating the complete template. The AI Agent must write `displayTitle`, `displaySummary`, and `displayRule` in the configured language and set `displayLanguage` to the exact configured tag. Core rejects missing or mismatched display fields before activation and Wiki rendering.

## `vibebox init`

Purpose: create or update the global VibeBox user store.

Example:

```bash
vibebox init
```

Notes: for a non-English user language, `init` fails unless the AI Agent supplies a complete display template for the exact tag. Existing VibeBox files are preserved. Use `convert-lang` with agent-provided localized candidates to repair or intentionally convert an existing store; do not use `init` to change its language.

## `vibebox setup-codex`

Purpose: configure Codex user settings for the default `~/.vibebox` global store.

Example:

```bash
vibebox setup-codex
vibebox doctor --codex
```

Notes: creates `~/.vibebox` if missing, creates `~/.codex/config.toml` if missing, backs up an existing config, and adds the default global store to `[sandbox_workspace_write].writable_roots` without duplicate entries. It adds missing top-level `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"` keys. Restart Codex after setup.

## `vibebox setup-claude`

Purpose: configure Claude Code user settings for the default `~/.vibebox` global store.

Example:

```bash
vibebox setup-claude
vibebox doctor --claude
```

Notes: creates `~/.vibebox` if missing, creates `~/.claude/settings.json` if missing, backs up an existing settings file, and merges `permissions.additionalDirectories`, `Read(~/.vibebox/**)`, `Edit(~/.vibebox/**)`, and VibeBox `Bash(...)` allow rules without duplicate entries. Restart Claude Code after setup.

## `vibebox pretask`

Purpose: generate an agent-ready Pre-Task Brief from active memory.

Examples:

```bash
vibebox.cmd pretask --task "Fix dashboard table scrolling"
vibebox pretask --task "Fix dashboard table scrolling"
vibebox pretask "Fix dashboard table scrolling"
```

Notes: read-only retrieval. It should not modify repository files, but it needs read access to the global store. Agents should apply `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` in their actual work. Active global user-profile baselines are included even without lexical overlap, and localized display fields participate in matching. The full `report` is an audit command, not a required fallback before normal work.

## `vibebox context`

Purpose: generate a compact Context Pack.

Examples:

```bash
vibebox.cmd context --task "Update dependency handling"
vibebox context --task "Update dependency handling"
```

Notes: read-only retrieval. `pretask` is usually better before acting because it includes direct agent instructions.

## `vibebox aftertask`

Purpose: capture task completion details and ingest AI-agent structured memory candidates.

Examples:

```bash
vibebox.cmd aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-level scrolling" --files "src/table.mjs" --commands "npm.cmd test" --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-level scrolling" --structured-candidates-file structured-candidates.json
```

Supported candidate inputs:

- `--candidates <json>`
- `--candidates-file <path>`
- `--structured-candidates-file <path>`
- `Structured memory candidates:` in a `--from-file` payload

Notes:

- Always pass the original user request or a faithful semantic summary with `--request` when active memory should connect to the user criteria.
- Before writing candidate JSON, run `vibebox schema --format json` and use the returned Core enum values, category model, defaults, and candidate skeleton.
- Do not submit candidate JSON before reading schema in the current task. Do not guess `memoryRole`, `type`, `modelClass`, `scope`, `primaryCategory`, `relatedCategories`, `confidence`, or `sourceType`; labels such as `project_outcome`, `project_result`, `success_memory`, and `project_memory` are invalid unless the schema explicitly returns them.
- Do not call aftertask with only an AI action summary.
- Without candidates, VibeBox records the event and warns instead of creating active memory.
- Without structured candidates, Core records raw evidence and warns instead of creating active memory.
- Core does not semantically interpret `userRequest`, headings, bullets, keywords, summaries, or command output.
- If one candidate represents a captured complex request, include `whyOnlyOneCandidate`.
- If there is no reusable memory, submit `no_reusable_memory_candidate` with `noCandidateReason` instead of forcing a fake `task_context`.
- Wiki display fields must match configured `memoryLanguage`.

## `vibebox schema`

Purpose: print the structured candidate schema generated from VibeBox Core enum constants.

Examples:

```bash
vibebox.cmd schema --format json
vibebox schema --format json
vibebox schema --format text
```

Notes: this command does not read or write the global store. Agents should use it before creating `--candidates-file` JSON instead of copying enum lists into prompts or guessing `type`, `modelClass`, `sourceType`, `primaryCategory`, or `relatedCategories`.

## `vibebox capture`

Purpose: append a raw diagnostic event to the global log.

Example:

```bash
vibebox capture --request "Fix table scrolling" --summary "Kept package setup unchanged" --changed-files "src/table.mjs" --technical-outcome success --user-acceptance unknown
```

Notes: raw capture does not create active memory by itself.

## `vibebox extract`

Purpose: ingest AI-agent structured candidates for validation, dedupe, replacement safety, indexes, and Wiki rendering.

Example:

```bash
vibebox extract --candidates-file structured-candidates.json
```

Notes: raw `--text`, `--file`, `--event`, or `--last-event` inputs are manual/debug evidence paths only. Core does not create active user memory from them without structured candidates. `--manual-review` keeps candidates pending for debug or override workflows.

## Legacy / Manual Debugging Only

Summary-only `aftertask` and raw-text `extract --text` are raw evidence/debug paths only. They do not create active memory because Core does not semantically interpret user requests, headings, bullets, keywords, raw action summaries, or command output.

## Manual Review Commands

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

Use these for debugging, audits, or manual override. Normal workflow is auto-curated.

## Reports

```bash
vibebox report
vibebox blackbox --limit 10
```

`report` summarizes active memory and legacy/manual debug pending state. `blackbox` summarizes recent diagnostic task history without dumping raw logs.

## `vibebox doctor`

Purpose: check global-store health and current project identity.

Example:

```bash
vibebox doctor
vibebox doctor --codex
vibebox doctor --claude
vibebox doctor --agent all
```

Notes: read-only inspection. It checks storage layout, JSON parsing, indexes, localized Wiki links, suspicious raw secrets, duplicate localized docs, orphan project pages, and legacy project-local stores. With `--codex`, `--claude`, or `--agent all`, it also reports whether the user-level agent settings include the default `~/.vibebox` store and shows the matching `setup-*` fix command when needed.

## Backup And Restore

```bash
vibebox backup --output <USER_HOME>/vibebox-backup
vibebox restore --from <USER_HOME>/vibebox-backup --confirm-replace
```

Restore is destructive replacement, not merge.

## Language Conversion And Rebuild

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang <from-bcp47> <to-bcp47> --display-template-file <agent-template.json>
VIBEBOX_AGENT_RUNTIME=adapter vibebox language convert <from-bcp47> <to-bcp47> --display-template-file <agent-template.json>
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

These commands require an AI Agent runtime marker and agent-provided localized/semantic data. Core applies file operations, link rewrites, registry updates, indexes, and integrity checks; it does not translate, summarize, or reclassify memory by reading raw requests.

Use `vibebox rebuild --index-only` for non-semantic index repair.
