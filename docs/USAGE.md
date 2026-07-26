# VibeBox Usage

This guide covers installation, normal CLI use, Codex plugin operation, and maintenance.

## Requirements

- Node.js `>=20`
- npm

## Install

From a repository checkout:

```bash
npm install
```

Create a development command:

```bash
npm link
vibebox --help
```

On Windows or Codex App, prefer the npm command shim:

```bash
vibebox.cmd --help
```

Repository fallback:

```bash
node bin/vibebox.mjs <command>
```

## Runtime Storage

For agent-driven initialization, first request the schema for the user's actual conversation language, generate every required display-template value in that same language, and initialize the single global user store:

```bash
vibebox schema --format json --language <user-language-bcp47>
vibebox init --language <user-language-bcp47> --display-template-file <agent-generated-template.json>
```

English uses Core's base display template. Every other language requires a complete agent-generated template. Core rejects a missing template instead of creating English Wiki files under a non-English `memoryLanguage`.

Default locations:

```text
<USER_HOME>/.vibebox
%USERPROFILE%\.vibebox
```

Override the store:

```bash
VIBEBOX_HOME=<USER_HOME>/custom-vibebox-store vibebox init
vibebox init --store <USER_HOME>/custom-vibebox-store
```

The global store contains `global/`, `projects/{projectId}/`, `wiki/`, `index/`, `logs/`, `pending/`, and `registry/`.

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in work repositories.

## Agent Sandbox Setup

For supported sandboxed agents, VibeBox can update user-level agent settings so the default global store is available without repeated approval prompts.

Codex:

```bash
vibebox setup-codex
vibebox doctor --codex
```

`setup-codex` creates `~/.vibebox` if missing, creates `~/.codex/config.toml` if missing, backs up an existing config, and adds the default global store to `[sandbox_workspace_write].writable_roots` without duplicate entries. It adds `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"` only when those top-level keys are missing. Restart Codex after setup.

Claude Code:

```bash
vibebox setup-claude
vibebox doctor --claude
```

`setup-claude` creates `~/.vibebox` if missing, creates `~/.claude/settings.json` if missing, backs up an existing settings file, and merges `permissions.additionalDirectories`, `Read(~/.vibebox/**)`, `Edit(~/.vibebox/**)`, and VibeBox `Bash(...)` allow rules without duplicate entries. Restart Claude Code after setup.

Use `vibebox doctor --agent all` to inspect both Codex and Claude Code settings.

## Normal Workflow

Before meaningful repository work:

```bash
vibebox pretask --task "Fix dashboard table scrolling"
```

Windows/Codex:

```bash
vibebox.cmd pretask --task "Fix dashboard table scrolling"
```

`pretask` is read-only retrieval. It prints active guidance and should not modify repository files, but it still reads the global store.

After meaningful work:

```bash
vibebox aftertask --request "Fix dashboard table scrolling" --summary "Used wrapper-level scrolling and ran tests." --files "src/table.mjs" --commands "npm.cmd test" --command-results "passed" --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

The `--request` value should be the original user request or a faithful semantic summary. The candidate file should contain AI-agent structured candidates.

Use `--candidates-file` or `--structured-candidates-file` for non-trivial JSON, especially on Windows shells.

## Structured Candidate Contract

`aftertask` writes a raw diagnostic event and ingests structured candidates. Active memory requires candidates when reusable meaning exists.

Each meaningful task should be reviewed for:

- user success criteria
- validation patterns
- reporting or response preferences
- process, design, or decision patterns
- project or domain rules
- failure-prevention rules
- AI failure memory
- AI successful approaches
- task context
- discarded details

If a complex request produces exactly one candidate, include `whyOnlyOneCandidate`. If no reusable memory exists, submit:

```json
[
  {
    "type": "no_reusable_memory_candidate",
    "no_reusable_memory_candidate": true,
    "noCandidateReason": "The request was a one-off check with no reusable success criteria, failure, approach, or project rule."
  }
]
```

Do not call aftertask with only an AI action summary when active memory should be created. If `userRequest` is present but candidates are missing, Core records the raw event, warns, and creates no active memory. Without candidates, VibeBox records the event and warns instead of creating active memory.

## Candidate File Shape

Before writing `structured-candidates.json`, ask Core for the current schema:

```bash
vibebox schema --format json
```

Use that output as the single source of truth for candidate enum values, category keys, defaults, and the skeleton. Do not copy enum lists into agent prompts or guess values from prose.

Do not create or submit the candidate file before reading schema in the current task. Role or outcome guesses such as `project_outcome`, `project_result`, `success_memory`, and `project_memory` are invalid unless the schema explicitly returns them.

Start active memory from `candidateSkeleton`. If there is no durable reusable memory, submit `no_reusable_memory_candidate` with `noCandidateReason` instead of forcing a fake `task_context`.

Example `structured-candidates.json`:

```json
[
  {
    "memoryRole": "user_success_criteria",
    "type": "validation_pattern",
    "modelClass": "project_model",
    "modelSubClass": "documentation_validation_rule",
    "scope": "project",
    "primaryCategory": "validation_patterns",
    "relatedCategories": ["workflow_rules"],
    "title": "Validate docs after policy cleanup",
    "summary": "Documentation cleanup should be verified with tests, check, doctor, and whitespace diff checks.",
    "rule": "Run repository validation before reporting documentation policy cleanup as complete.",
    "displayTitle": "Validate documentation cleanup",
    "displaySummary": "Run repository validation before completing documentation cleanup.",
    "displayRule": "Use tests, check, doctor, and diff whitespace checks for policy-facing documentation changes.",
    "displayLanguage": "en-US",
    "confidence": "high",
    "sourceType": "agent_semantic_extraction",
    "evidence": ["The user requested explicit validation commands."]
  }
]
```

Wiki display fields must match the configured `memoryLanguage`. `displayTitle`, `displaySummary`, and `displayRule` are required for reusable memory, and `displayLanguage` must exactly match the configured tag. Core rejects violations before activation.

## From-File Capture

For long records:

```bash
vibebox aftertask --from-file task-result.txt
```

When active memory should be created, the file must include:

```text
User request:
AI action summary:
Changed files:
Commands:
Errors:
Structured memory candidates:
```

The wrapper section names are not semantic extraction. The structured candidates are the semantic contract.

`task-result.txt` must include `User request:` and `Structured memory candidates:` when active memory should be created.

## Context Pack

Use `context` when a compact pack is enough:

```bash
vibebox context --task "Update dependency handling"
```

`pretask` is usually better before acting because it includes direct agent instructions and risk framing.

## Report And Diagnostics

```bash
vibebox report
vibebox blackbox --limit 10
vibebox doctor
```

`report` summarizes active memory and legacy/manual debug pending state. `blackbox` summarizes recent diagnostic task history without dumping raw logs. `doctor` checks store health, JSON parsing, indexes, localized Wiki links, suspicious raw secrets, registry state, and legacy project-local stores. Add `--codex`, `--claude`, or `--agent all` to check agent sandbox settings for the default `~/.vibebox` store.

## Legacy / Manual Debugging Only

Summary-only `aftertask` and raw-text `extract --text` are raw evidence/debug paths only. They do not create active memory because Core does not semantically interpret user requests, headings, bullets, keywords, raw action summaries, or command output.

## Manual Debug And Override

Normal memory creation is auto-curated from structured candidates. Use review commands only for debugging, audits, or manual override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

## Language Policy

Seed a new store language from an adapter-provided template:

```bash
VIBEBOX_LANGUAGE=<canonical-bcp47> VIBEBOX_DISPLAY_TEMPLATE='<agent-template-json>' vibebox init
vibebox init --language <canonical-bcp47> --display-template-file <agent-template.json>
```

Configured `memoryLanguage` controls Obsidian Wiki display text. It must represent the user's actual conversation language as a valid canonical BCP 47 tag. Core validates the tag generically and does not keep hardcoded language packs or a fixed list of supported languages.

For non-default initial languages and conversion targets, the AI Agent must provide a full display template for the exact configured tag with `VIBEBOX_DISPLAY_TEMPLATE`, `--display-template`, or `--display-template-file`. Core stores it in `config.displayTemplates` and renders from that agent-provided template.

The template JSON can be either a direct template pack for the selected tag or `{ "displayTemplates": { "<canonical-bcp47>": { "...key": "localized text" } } }`. Adapters can call `displayTemplateSchema()` from `src/core.mjs` to inspect the required template keys before asking the AI Agent to fill localized text.

The AI Agent writes `displayTitle`, `displaySummary`, and `displayRule` in the configured language and sets `displayLanguage` to the exact configured tag. These fields are required. Core rejects missing fields or a mismatched tag before activation and Wiki rendering; it does not silently store or display English fallback text.

`VIBEBOX_LOCALE` is only an environment hint and does not rewrite an existing store. To intentionally change Wiki display language, run conversion from an adapter runtime:

```bash
VIBEBOX_AGENT_RUNTIME=adapter vibebox convert-lang <from-bcp47> <to-bcp47> --display-template-file <agent-template.json>
VIBEBOX_AGENT_RUNTIME=adapter vibebox rebuild
```

`convert-lang` and semantic `rebuild` require an AI Agent runtime marker and agent-provided localized/semantic data. Core changes files and integrity indexes only when supplied with agent runtime semantics. It does not translate or reclassify memory by reading raw logs.

## Backup And Restore

Create a backup:

```bash
vibebox backup --output <USER_HOME>/vibebox-backup
```

Restore by destructive replacement:

```bash
vibebox restore --from <USER_HOME>/vibebox-backup --confirm-replace
```

Restore is replace, not merge.

## Codex App Plugin Cache

Codex App can load installed plugin cache files instead of the current repository checkout. Updating GitHub or pulling source is not enough by itself if Codex is still reading an older installed cache.

Cache placeholder:

```text
%USERPROFILE%\.codex\plugins\cache\boksajang\vibebox\0.1.12\
```

This is the cache-busting folder for `0.1.12`; stale plugin cache content can make Codex App behave as if older skill files are still installed. After updating or reinstalling, compare these files between `plugins/vibebox` and installed cache:

- `.codex-plugin/plugin.json`
- `skills/vibebox/SKILL.md`
- `bin/vibebox.mjs`
- `src/cli.mjs`
- `src/core.mjs`
- `skills/vibebox/references/WORKFLOW.md`
- `skills/vibebox/references/COMMANDS.md`
- `skills/vibebox/references/MEMORY_POLICY.md`

Example PowerShell:

```powershell
$repo = (Get-Location).Path
$package = "$repo\plugins\vibebox"
$cache = "$env:USERPROFILE\.codex\plugins\cache\boksajang\vibebox\0.1.12"
Test-Path $cache
Get-FileHash "$package\.codex-plugin\plugin.json", "$cache\.codex-plugin\plugin.json"
Get-FileHash "$package\skills\vibebox\SKILL.md", "$cache\skills\vibebox\SKILL.md"
Get-FileHash "$package\skills\vibebox\references\WORKFLOW.md", "$cache\skills\vibebox\references\WORKFLOW.md"
Get-FileHash "$package\skills\vibebox\references\COMMANDS.md", "$cache\skills\vibebox\references\COMMANDS.md"
Get-FileHash "$package\skills\vibebox\references\MEMORY_POLICY.md", "$cache\skills\vibebox\references\MEMORY_POLICY.md"
Get-FileHash "$package\bin\vibebox.mjs", "$cache\bin\vibebox.mjs"
Get-FileHash "$package\src\cli.mjs", "$cache\src\cli.mjs"
Get-FileHash "$package\src\core.mjs", "$cache\src\core.mjs"
Select-String -Path "$cache\skills\vibebox\SKILL.md" -Pattern "whyOnlyOneCandidate","no_reusable_memory_candidate","displayLanguage","Core will not infer active memory"
```

If hashes differ or expected contract phrases are absent, reinstall or refresh the plugin cache before trusting loaded skill behavior. VibeBox does not delete or rewrite Codex App plugin cache files automatically.

## Troubleshooting

- If `vibebox` is not found, run `npm link` from the VibeBox checkout or use `node bin/vibebox.mjs <command>`.
- If PowerShell blocks the `.ps1` shim, use `vibebox.cmd <command>`.
- If a wrapper-style call is blocked, retry direct `vibebox.cmd`, then `vibebox`, then the Node fallback.
- If Codex repeatedly asks for `~/.vibebox` approval, run `vibebox setup-codex`, restart Codex, then check `vibebox doctor --codex`.
- If Claude Code needs global-store file permissions, run `vibebox setup-claude`, restart Claude Code, then check `vibebox doctor --claude`.
- If sandbox access to the global store is denied, request approved read-only global VibeBox store access for `pretask`/`context` or approved global VibeBox store write access for `aftertask`.
- If write access is denied, report that capture, project registration, active memory, and wiki updates were not completed.
- If an isolated verification store is needed, set `VIBEBOX_HOME` to a temporary store path.
- If `doctor` reports an old project-local `.vibebox/`, treat it as legacy; VibeBox does not migrate it destructively.
