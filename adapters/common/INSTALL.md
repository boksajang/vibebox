# Common VibeBox Install And Invocation

## Requirements

- Node.js `>=20`
- npm

## Local CLI

From this repository:

```bash
node bin/vibebox.mjs <command>
```

## Linked CLI

Create a development command:

```bash
npm install
npm link
vibebox <command>
```

On Windows PowerShell, if the npm `.ps1` shim is blocked, use:

```bash
vibebox.cmd <command>
```

## Initialize Store

```bash
vibebox init
```

Fallback:

```bash
node bin/vibebox.mjs init
```

`vibebox init` creates or updates the single global user store:

```text
<USER_HOME>/.vibebox
%USERPROFILE%\.vibebox
```

Use `VIBEBOX_HOME` or `--store <path>` for a different store.

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in work projects.

## Agent Invocation

Before meaningful work:

```bash
vibebox pretask --task "<task description>"
```

After meaningful work:

```bash
vibebox schema --format json
vibebox aftertask --request "<original request or faithful summary>" --summary "..." --candidates-file structured-candidates.json
```

The agent, not Core, creates structured memory candidates. Use `vibebox schema --format json` as the single source of truth for candidate enum values, category keys, defaults, and the skeleton before writing the candidates file.
