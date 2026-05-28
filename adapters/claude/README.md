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
vibebox aftertask --request "<original user request or faithful summary>" --summary "..." --technical-outcome success --user-acceptance accepted
```

The `--request` value is required for active user model extraction. Do not send only an action summary; use `--request` directly or include `User request:` in a `--from-file` payload for long records.

The user's request is success criteria, user corrections update those criteria, and user dissatisfaction is an AI failure signal. Confirmed and inferred AI successful approaches can become active through Auto Curator without memory approval; inferred success must not be described as user-confirmed. Capture command, permission, environment, and tool failures as AI failure memory. Manual review is for debugging or override, not the normal promotion path:

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
- User requests and user feedback are primary extraction signals; action summaries are supporting evidence.
- `backup` and `restore` are normal CLI maintenance commands; restore is destructive replace and requires confirmation.
- `convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`.
- Obsidian filenames, headings, aliases, links, Recent Active Memory, and memory-level notes follow the configured memory language; internal JSON fields, enum values, relation types, command names, file paths, and raw logs stay canonical.
