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
vibebox aftertask --request "..." --summary "..." --outcome success
```

Review candidates before promotion:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

## Current Limitations

- This is a compatibility guide and local skeleton, not a claim of registry availability.
- VibeBox memory behavior comes from the Core CLI and shared skill, not from this adapter.
- Agents should not treat pending memory as active memory.
- `.vibebox/` is user-project runtime state and should usually not be committed to public repositories.
