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

## Workflow Summary

Before non-trivial work:

```bash
vibebox.cmd pretask --task "<task description>"
```

Codex should read and apply the `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` sections before planning or editing. This is read-only retrieval: it prints active guidance and should not modify repository files. If host approval blocks a wrapper-style attempt, retry direct `vibebox.cmd pretask --task "..."`, then `vibebox pretask --task "..."`, then `node bin/vibebox.mjs pretask --task "..."` from the VibeBox repository. If all attempts fail, report that VibeBox guidance was unavailable before proceeding.

After meaningful work:

```bash
vibebox.cmd aftertask --request "<original user request or faithful summary>" --summary "..." --technical-outcome success --user-acceptance accepted
```

`aftertask` is a write/capture operation. The `--request` value is required for active user model extraction. If the request is long, pass a faithful semantic summary with `--request` or include `User request:` in a `--from-file` payload. If VibeBox guidance could not be retrieved before work, include that fact in `--errors` or `--notes`.

VibeBox extracts candidates and runs Auto Curator by default. The user's request is success criteria, user corrections update those criteria, and user dissatisfaction is an AI failure signal. Structured requests are decomposed into project criteria, user/domain patterns, validation and preservation rules, scope limits, AI failure-prevention rules, and task context before AI action summaries are used as supporting evidence. Confirmed and inferred AI successful approaches can become active without memory approval; inferred success must not be described as user-confirmed. Capture command, permission, environment, and tool failures as AI failure memory. Use review commands only for debugging, audits, or manual override:

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
- VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.
- `backup` and `restore` are ordinary CLI maintenance commands; restore is destructive replace and requires confirmation.
- `convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`.
- Obsidian filenames, category folders, headings, aliases, links, Recent Active Memory, and category-based memory notes follow the configured memory language through stable `docKey` identity; internal JSON fields, enum values, relation types, command names, file paths, and raw logs stay canonical. Visible note names are meaning-based; `mem_...` ids stay in frontmatter. A memory has one canonical note under its primary category and can be linked from multiple related category pages plus the source project page.
