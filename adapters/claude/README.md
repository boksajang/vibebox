# VibeBox Claude Adapter

VibeBox is agent-neutral. This adapter is a Claude-compatible packaging guide or skeleton for using the shared VibeBox skill instructions with the local VibeBox CLI.

## Shared Skill

Use the shared skill source:

- `skills/vibebox/SKILL.md`

Reference details are in:

- `skills/vibebox/references/COMMANDS.md`
- `skills/vibebox/references/WORKFLOW.md`
- `skills/vibebox/references/MEMORY_POLICY.md`

## Command Fallback

Preferred:

```bash
vibebox <command>
```

Windows PowerShell fallback:

```bash
vibebox.cmd <command>
```

Fallback inside the VibeBox repository:

```bash
node bin/vibebox.mjs <command>
```

## Workflow Summary

Before non-trivial work, run:

```bash
vibebox pretask --task "<task description>"
```

Claude-compatible agents should read and apply the `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` sections before planning or editing. Do not merely paste the memory into a response; use it to shape the plan, validation, avoided approaches, and final report.

After meaningful work, run:

```bash
vibebox aftertask --request "<original user request or faithful summary>" --summary "..." --candidates "<agent-candidate-json>" --technical-outcome success --user-acceptance accepted
```

The `--request` value preserves the user success criteria source. Active memory requires Claude to provide structured candidates with its semantic judgment; do not send only an action summary. Use `--request` directly or include `User request:` and `Structured memory candidates:` in a `--from-file` payload for long records.

Claude is the semantic authority. It decides success criteria, corrections, AI failure signals, successful approaches, task-only details, model class, scope, categories, relations, replacements, and localized display text. Core validates, stores, dedupes, safely replaces, indexes, and renders the candidates; it does not infer memory from raw user requests, keywords, headings, bullets, action summaries, or fixture terms. The user's request is success criteria, user corrections update those criteria, and user dissatisfaction is an AI failure signal. Confirmed and inferred AI successful approaches can become active when Claude submits them; inferred success must not be described as user-confirmed. Preserve command, permission, environment, and tool failure evidence, and submit active AI failure memory only when Claude has made that structured candidate. Manual review is for debugging or override, not the normal promotion path:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

## Current Limitations

- This is a compatibility guide and local skeleton, not a claim of registry availability.
- VibeBox memory behavior comes from the Core CLI and shared skill, not from this adapter.
- Agents should not treat pending memory as active memory.
- VibeBox uses one global user store at `~/.vibebox` by default, overrideable with `VIBEBOX_HOME`.
- VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.
- Claude performs semantic extraction and supplies structured candidates; action summaries and technical failure text are evidence only until represented in a candidate.
- `backup` and `restore` are normal CLI maintenance commands; restore is destructive replace and requires confirmation.
- `convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and Claude-provided localized/semantic data; Core applies file operations and integrity checks but does not translate or reclassify meaning.
- Obsidian filenames, category folders, headings, aliases, links, Recent Active Memory, and category-based memory notes follow the configured memory language; internal JSON fields, enum values, relation types, command names, file paths, and raw logs stay canonical. Visible note names are meaning-based; `mem_...` ids stay in frontmatter.
