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

After meaningful work, run:

```bash
vibebox aftertask --request "..." --summary "..." --technical-outcome success --user-acceptance accepted
```

Manual review is for debugging or override, not the normal promotion path:

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
