# VibeBox Codex Adapter

This adapter explains how to use VibeBox with Codex plugin packaging while keeping VibeBox Core agent-neutral.

## Files

Shared skill:

- `skills/vibebox/SKILL.md`

Codex plugin wrapper:

- `.codex-plugin/plugin.json`

Codex marketplace manifest:

- `.agents/plugins/marketplace.json`

The wrapper exposes the shared skill. It does not copy or replace the Core CLI.

## Install

Register the marketplace source:

```bash
codex plugin marketplace add boksajang/vibebox
```

Git URL form:

```bash
codex plugin marketplace add https://github.com/boksajang/vibebox.git
```

Windows shim fallback:

```bash
codex.cmd plugin marketplace add boksajang/vibebox
```

Then enable the `vibebox` plugin in Codex and start a new session.

Manual edits to Codex marketplace files are for local development or troubleshooting only.

## Installed Cache Verification

Codex App can read installed plugin cache files instead of the repository working tree. A GitHub push or local source edit does not automatically refresh that cache.

Cache placeholder:

```text
%USERPROFILE%\.codex\plugins\cache\personal\vibebox\0.1.6\
```

This `0.1.6` folder is the cache-busting installed version. Stale plugin cache content can make Codex App behave as if older skill files are still installed. After `git pull`, reinstall, or source updates, compare the installed cache against the repository:

```powershell
$repo = (Get-Location).Path
$cache = "$env:USERPROFILE\.codex\plugins\cache\personal\vibebox\0.1.6"
Test-Path $cache
Get-FileHash "$repo\.codex-plugin\plugin.json", "$cache\.codex-plugin\plugin.json"
Get-FileHash "$repo\skills\vibebox\SKILL.md", "$cache\skills\vibebox\SKILL.md"
Get-FileHash "$repo\skills\vibebox\references\WORKFLOW.md", "$cache\skills\vibebox\references\WORKFLOW.md"
Get-FileHash "$repo\skills\vibebox\references\COMMANDS.md", "$cache\skills\vibebox\references\COMMANDS.md"
Get-FileHash "$repo\skills\vibebox\references\MEMORY_POLICY.md", "$cache\skills\vibebox\references\MEMORY_POLICY.md"
Get-FileHash "$repo\adapters\codex\README.md", "$cache\adapters\codex\README.md"
Select-String -Path "$cache\skills\vibebox\SKILL.md" -Pattern "whyOnlyOneCandidate","no_reusable_memory_candidate","displayLanguage","Core will not infer active memory"
```

If hashes differ, expected contract phrases are missing, or stale plugin cache content is still loaded, reinstall/update the plugin or refresh the Codex App plugin cache. VibeBox does not delete or rewrite Codex App plugin cache files automatically.

## Command Fallback

Codex on Windows should prefer direct command invocation:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

Do not use `powershell.exe -Command` as a default VibeBox workflow example. Shell wrappers can look riskier to host approval layers than direct commands.

## Sandbox And Global Store Access

VibeBox uses one global store as the single source of truth:

```text
<USER_HOME>/.vibebox
%USERPROFILE%\.vibebox
```

or `VIBEBOX_HOME` when configured.

Codex App may run with a workspace sandbox. A setup that works in another terminal can still have global-store access denied in Codex App.

- `pretask` and `context` are read-only retrieval commands but still need global-store read access.
- `pretask` and `context` do not register a new project.
- `aftertask` needs write access for capture, project registration, active memory, indexes, and wiki updates.
- If read access is denied, request approved read-only global VibeBox store access or report VibeBox guidance unavailable.
- If write access is denied, request approved global VibeBox store write access or report that aftertask capture, project registration, active memory, and wiki updates were not completed.
- Do not create workspace-local memory snapshots, copied stores, project-local `.vibebox`, pointer files, or hidden metadata fallbacks.

Run `vibebox setup-codex` to create `~/.vibebox`, back up `~/.codex/config.toml`, create the config if missing, and add the default store to `[sandbox_workspace_write].writable_roots` without duplicate entries. The command adds missing top-level `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"` values, then asks you to restart Codex.

Check the setup with:

```bash
vibebox doctor --codex
```

If hooks are configured manually, use the current `[features].hooks` setting. Legacy `[features].codex_hooks` references are deprecated and should not be used for new setup.

## Codex Workflow

Before non-trivial work:

```bash
vibebox.cmd pretask --task "<task description>"
```

Codex must read and apply `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` before planning or editing. Reading `pretask` is not a complete VibeBox workflow by itself.

After meaningful work:

```bash
vibebox.cmd schema --format json
vibebox.cmd aftertask --request "<original user request or faithful summary>" --summary "..." --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

Codex is the semantic authority. It must decompose reusable meaning into structured candidates for success criteria, validation rules, reporting preferences, preservation rules, project/domain/user patterns, AI failure-prevention rules, successful approaches, task context, categories, relations, replacements, and localized display text.

Codex must choose candidate `scope` semantically. Prefer `scope: "global"` for durable user personal preferences, repeated procedural instructions, tool preferences, validation preferences, and response/reporting preferences unless the memory is explicitly tied to one repository, product, dataset, artifact format, UI flow, local path/cache state, test suite, or project name. Use `sourceProjectId`/`sourceProjectRoot` as provenance for global memories learned during project work; reserve `projectId` for memories whose active guidance is project-bound.

The schema command is the single source of truth for candidate enum values and the candidate skeleton. Codex must use it before authoring `structured-candidates.json` and must not invent enum values from prose.

If a complex request produces one candidate, include `whyOnlyOneCandidate`. If no reusable memory exists, submit `no_reusable_memory_candidate` with `noCandidateReason`.

Wiki display fields must follow configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. For non-default initial languages and conversion targets, Codex must pass an AI-agent localized display template for the exact configured tag; Core renders that template instead of using hardcoded locale packs. In a store configured with a Korean language tag, `displayTitle`, `displaySummary`, and `displayRule` should be Korean, and `displayLanguage` should match the configured tag.

Core validates, stores, dedupes, safely replaces, indexes, links, and renders. It does not translate missing display text or backfill semantic memory from raw summaries. Without candidates, VibeBox records the event and warns instead of creating active memory.

Use review commands only for debugging, audits, or manual override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

## Limitations

- Agents still need shell access to run the VibeBox CLI.
- The shared skill is the source of usage behavior; the adapter should not fork memory policy.
- VibeBox uses one global user store, overrideable with `VIBEBOX_HOME`.
- `backup` and `restore` are ordinary CLI maintenance commands; restore is destructive replacement and requires confirmation.
- `convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and Codex-provided localized/semantic data; Core does not translate, summarize, or generate missing user-facing display text.
- The Obsidian Wiki follows configured `memoryLanguage`; internal JSON fields, enum values, relation types, command names, paths, and raw logs stay canonical.
