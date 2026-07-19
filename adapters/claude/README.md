# VibeBox Claude Adapter

This is a Claude Code and Claude-compatible guide for using the shared VibeBox skill with the local VibeBox CLI.

VibeBox memory behavior comes from Core and the shared skill, not from an adapter-specific fork.

## Claude Code Plugin Install

VibeBox ships Claude Code plugin metadata and hooks:

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `hooks/hooks.json`
- `scripts/claude-vibebox-hook.mjs`

Install from the VibeBox repository marketplace inside Claude Code:

```text
/plugin marketplace add boksajang/vibebox
/plugin install vibebox@boksajang
/reload-plugins
```

CLI form:

```bash
claude plugin marketplace add boksajang/vibebox
claude plugin install vibebox@boksajang
```

The marketplace name is `boksajang`; the plugin name is `vibebox`, so the installed plugin identifier is `vibebox@boksajang`.

After install, users should ask for normal coding work. They should not need to manually run `pretask`, `schema`, or `aftertask` during ordinary use.

If Claude Code repeatedly asks for access to the VibeBox global store, run:

```bash
vibebox setup-claude
vibebox doctor --claude
```

`setup-claude` creates `~/.vibebox`, backs up `~/.claude/settings.json`, creates it if missing, and merges `permissions.additionalDirectories`, `Read(~/.vibebox/**)`, `Edit(~/.vibebox/**)`, and VibeBox `Bash(...)` allow rules without duplicate entries. Restart Claude Code after setup.

## Claude Code Hooks

The plugin hook file is `hooks/hooks.json`.

- `UserPromptSubmit` runs the bundled VibeBox CLI with `pretask --task <submitted prompt>` and injects the active memory brief into Claude context before Claude plans or edits.
- `Stop` blocks once with an aftertask checkpoint. If meaningful work occurred, Claude must continue, run `schema --format json`, create structured candidates, and run `aftertask`.

The hook does not invent semantic memory. Claude remains the semantic authority: it decides whether reusable memory exists, reads the Core schema before candidate JSON, and submits either structured candidates or `no_reusable_memory_candidate`.

If global store access is denied, the hook adds that failure as context. Claude should report guidance or capture unavailable instead of creating a project-local fallback store.

## Shared Skill

- `skills/vibebox/SKILL.md`

References:

- `skills/vibebox/references/COMMANDS.md`
- `skills/vibebox/references/WORKFLOW.md`
- `skills/vibebox/references/MEMORY_POLICY.md`

## Command Fallback

Preferred:

```bash
vibebox <command>
```

Windows fallback:

```bash
vibebox.cmd <command>
```

Repository fallback:

```bash
node bin/vibebox.mjs <command>
```

## Workflow

This section is for non-plugin hosts, debugging, or manual validation. In normal Claude Code plugin use, the installed hooks and shared skill drive this workflow.

Before meaningful work:

```bash
vibebox pretask --task "<task description>"
```

Claude-compatible agents should apply `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` before planning or editing.

After meaningful work:

```bash
vibebox schema --format json
vibebox aftertask --request "<original user request or faithful summary>" --summary "..." --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

The `--request` value preserves the source of user success criteria. Active memory requires Claude to provide structured candidates with its semantic judgment. Do not send only an action summary when active memory should be created.

The schema command is the single source of truth for candidate enum values, category keys, defaults, and the skeleton. Claude-compatible agents should use it before authoring `structured-candidates.json` and should not invent enum values from prose.

If using a long file payload, include `User request:` and `Structured memory candidates:`.

Claude is the semantic authority. It decides success criteria, corrections, AI failure signals, successful approaches, task-only details, model class, scope, categories, relations, replacements, confidence, and localized display text.

Claude-compatible agents must choose candidate `scope` semantically. Prefer `scope: "global"` for durable user personal preferences, repeated procedural instructions, tool preferences, validation preferences, and response/reporting preferences unless the memory is explicitly tied to one repository, product, dataset, artifact format, UI flow, local path/cache state, test suite, or project name. Use `sourceProjectId`/`sourceProjectRoot` as provenance for global memories learned during project work; reserve `projectId` for memories whose active guidance is project-bound.

If a complex request produces only one candidate, include `whyOnlyOneCandidate`. If no reusable memory exists, submit `no_reusable_memory_candidate` with `noCandidateReason`.

Display fields should follow configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. For non-default initial languages and conversion targets, Claude must pass an AI-agent localized display template for the exact configured tag; Core renders that template instead of using hardcoded locale packs. A store configured with a Korean language tag needs Korean `displayTitle`, `displaySummary`, and `displayRule`, plus matching `displayLanguage`.

Core validates, stores, dedupes, safely replaces, indexes, links, and renders. It does not infer memory from raw user requests, keywords, headings, bullets, action summaries, command output, or missing display text.

Manual review is for debugging or override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

## Store Access

VibeBox uses one global user store:

```text
<USER_HOME>/.vibebox
```

or `VIBEBOX_HOME` when configured.

Sandboxed hosts may need approved read-only global VibeBox store access for `pretask`/`context` and approved global VibeBox store write access for `aftertask`. If read access is denied, report guidance unavailable. If aftertask write access is denied, report that capture, project registration, active memory, and wiki updates were not completed.

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in work projects.

Use `vibebox doctor --claude` to check whether `~/.claude/settings.json` grants VibeBox file access. The optional `Bash(vibebox ...)` rules reduce command prompts, while `Read(~/.vibebox/**)` and `Edit(~/.vibebox/**)` cover the global store files.

## Language And Maintenance

`convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and Claude-provided localized or semantic data. Core applies file operations and integrity checks but does not translate, summarize, generate missing display text, or reclassify meaning.

`backup` and `restore` are normal CLI maintenance commands. Restore is destructive replacement, not merge, and requires confirmation.
