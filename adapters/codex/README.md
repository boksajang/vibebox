# VibeBox Codex Adapter

VibeBox is agent-neutral. This adapter explains how to use VibeBox with Codex-style plugin packaging while keeping the Core CLI unchanged.

## Shared Skill

Codex should read the shared skill at:

- `skills/vibebox/SKILL.md`

The Codex plugin wrapper is:

- `.codex-plugin/plugin.json`

The Codex marketplace manifest is:

- `.agents/plugins/marketplace.json`

The wrapper points to the shared skill source. It does not copy or replace the VibeBox Core CLI.

## Marketplace Install

Final users should register the VibeBox marketplace source with Codex:

```bash
codex plugin marketplace add boksajang/vibebox
```

Git URL form is equivalent:

```bash
codex plugin marketplace add https://github.com/boksajang/vibebox.git
```

On Windows PowerShell, if `codex` resolves to a blocked `.ps1` shim, use:

```bash
codex.cmd plugin marketplace add boksajang/vibebox
```

After adding the marketplace source, enable the `vibebox` plugin from Codex's plugin UI or plugin configuration and start a new Codex session. The new session should then be able to load the VibeBox shared skill from the plugin wrapper.

Manual edits to Codex marketplace files are for local development or troubleshooting only.

## Command Fallback

Codex on Windows should prefer direct command invocation. A command wrapped as `powershell.exe -Command 'vibebox.cmd ...'` can look riskier to the host approval layer than the direct CLI call, even when the VibeBox command itself is read-only.

Windows/Codex direct command order:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

Preferred command outside Windows:

```bash
vibebox <command>
```

Do not use `powershell.exe -Command` as a default VibeBox workflow example. Treat that wrapper as a last resort only when no direct invocation is possible.

`pretask` and `context` are read-only memory retrieval commands. `aftertask`, `init`, `backup`, `restore`, `convert-lang`, and semantic `rebuild` are write or maintenance operations.

## Codex Sandbox And Global Store Access

VibeBox uses one global store as the single source of truth, normally `~/.vibebox` or `C:\Users\{USER}\.vibebox`. It does not create workspace-local memory snapshots, project-local `.vibebox` folders, copied memory stores, pointer files, or hidden metadata in work projects.

Codex sandbox settings can block that global store because it is outside the current workspace. In a read-only sandbox, even `pretask` and `context` may need approved read-only global VibeBox store access. With on-request approval, Codex may ask before reading `~/.vibebox`; `aftertask` needs global VibeBox store write access because it records the task result and updates active memory. If access is denied, report that VibeBox guidance or capture was unavailable. Do not replace the global store with a local snapshot.

VibeBox does not automatically edit Codex configuration. If you configure hooks manually, use the current `[features].hooks` setting; legacy `[features].codex_hooks` references are deprecated and should not be used for new setup.

## Workflow Summary

Before non-trivial work:

```bash
vibebox.cmd pretask --task "<task description>"
```

Codex should read and apply the `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` sections before planning or editing. This is read-only retrieval for repository files: it prints active guidance and should not modify repository files, but it reads the global VibeBox store. If host approval blocks a wrapper-style attempt, retry direct `vibebox.cmd pretask --task "..."`, then `vibebox pretask --task "..."`, then `node bin/vibebox.mjs pretask --task "..."` from the VibeBox repository. If the sandbox blocks `~/.vibebox`, request read-only global VibeBox store access. If all attempts fail, report that VibeBox guidance was unavailable before proceeding.

After meaningful work:

```bash
vibebox.cmd aftertask --request "<original user request or faithful summary>" --summary "..." --candidates "<agent-candidate-json>" --technical-outcome success --user-acceptance accepted
```

`aftertask` is a global store write/capture operation. The `--request` value preserves the user's success criteria source, and `--candidates` or a `Structured memory candidates:` file section carries Codex's semantic judgment. If the request is long, pass a faithful semantic summary with `--request` or include `User request:` in a `--from-file` payload. Reading `pretask` is not a complete VibeBox workflow by itself: after meaningful work, Codex must submit structured candidates or an explicit `no_reusable_memory_candidate` item with `noCandidateReason`. If VibeBox warns that userRequest is present but structured candidates are missing, Codex must rewrite the capture input with `Structured memory candidates:` and run `aftertask` again; Core will not backfill active memory from the raw request or action summary. If VibeBox guidance could not be retrieved before work, include that fact in `--errors` or `--notes`. If sandbox permissions block aftertask, request global VibeBox store write access for aftertask capture; if approval is denied, report that capture was unavailable.

Codex is the semantic authority. It must decompose structured requests into project criteria, user/domain patterns, validation and preservation rules, reporting preferences, scope limits, AI failure-prevention rules, task context, categories, relations, replacements, and localized display text before capture. For meaningful work, Codex should scan `user_success_criteria`, `ai_failure_memory`, `ai_successful_approach`, `task_context`, `discarded_detail`, validation patterns, response preferences, process patterns, design philosophy, decision patterns, prevention/avoid rules, and no-reusable-memory diagnostics. Do not collapse separate success, validation, reporting, and failure-avoidance meanings into one summary candidate.

If a complex request produces only one candidate, Codex must include `whyOnlyOneCandidate`. If no reusable memory exists, submit `no_reusable_memory_candidate` with `noCandidateReason`. Wiki display fields must follow the configured `memoryLanguage`; in a `ko-KR` store, `displayTitle`, `displaySummary`, and `displayRule` should be Korean. VibeBox Core validates, stores, dedupes, safely replaces, indexes, and renders those candidates; it does not translate missing display text or backfill semantic memory from raw summaries. The user's request is success criteria, user corrections update those criteria, and user dissatisfaction is an AI failure signal. Confirmed and inferred AI successful approaches can become active without memory approval when Codex submits them; inferred success must not be described as user-confirmed. Preserve command, permission, environment, and tool failure evidence, and submit active AI failure memory only when Codex has made that structured candidate. Use review commands only for debugging, audits, or manual override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

## Current Limitations

- `codex plugin marketplace add` registers a marketplace source; Codex CLI `0.130.0` does not provide a `codex plugin list` command.
- Agents still need shell access to run the VibeBox CLI.
- The shared skill is the source of usage behavior; the adapter should not fork memory policy.
- VibeBox uses one global user store at `~/.vibebox` by default, overrideable with `VIBEBOX_HOME`.
- VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied memory stores, pointer files, or hidden metadata in work projects.
- `backup` and `restore` are ordinary CLI maintenance commands; restore is destructive replace and requires confirmation.
- `convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and Codex-provided localized/semantic data; Core applies files and integrity checks but does not translate or reclassify meaning.
- Obsidian filenames, category folders, headings, aliases, links, Recent Active Memory, and category-based memory notes follow the configured memory language through stable `docKey` identity; internal JSON fields, enum values, relation types, command names, file paths, and raw logs stay canonical. Visible note names are meaning-based; `mem_...` ids stay in frontmatter. A memory has one canonical note under its primary category and can be linked from multiple related category pages plus the source project page.
