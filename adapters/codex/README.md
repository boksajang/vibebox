# VibeBox Codex Adapter

VibeBox is agent-neutral. This adapter explains how to use VibeBox with Codex-style plugin packaging while keeping the Core CLI unchanged.

## Shared Skill

Codex should read the shared skill at:

- `skills/vibebox/SKILL.md`

The Codex plugin wrapper is:

- `.codex-plugin/plugin.json`

The wrapper points to the shared skill source. It does not copy or replace the VibeBox Core CLI.

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

Before non-trivial work:

```bash
vibebox pretask --task "<task description>"
```

After meaningful work:

```bash
vibebox aftertask --request "..." --summary "..." --outcome success
```

Then review and promote memory:

```bash
vibebox review
vibebox approve <candidate-id>
```

## Current Limitations

- This repository includes a local plugin wrapper, not a marketplace publication claim.
- Agents still need shell access to run the VibeBox CLI.
- The shared skill is the source of usage behavior; the adapter should not fork memory policy.
- `.vibebox/` is user-project runtime state and should usually not be committed to public repositories.
