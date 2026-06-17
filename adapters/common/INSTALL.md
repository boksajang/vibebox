# Common VibeBox Install And Invocation

## Requirements

- Node.js `>=20`
- npm

## Preferred Agent Install

Use an agent plugin, skill package, or hook-enabled adapter when one is available. In normal agent use, the user should not run `pretask`, `schema`, or `aftertask` manually. The installed agent contract or hooks should:

1. retrieve `pretask` guidance before meaningful work;
2. read `schema --format json` before writing structured memory candidates;
3. run `aftertask` after meaningful work with the original user request and AI-agent structured candidates.

The direct CLI commands below are for adapter authors, debugging, or fallback hosts that cannot load a plugin/hook package.

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

Manual invocation fallback:

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

When choosing candidate `scope`, prefer `global` for durable user personal preferences, repeated procedures, tool preferences, validation preferences, and response/reporting preferences unless they are explicitly bound to one repository. Use `project` for repository-specific product rules, data/schema/API contracts, artifact formats, UI flows, local paths/cache state, test suites, or explicit project names. Keep source project fields as provenance for global memories learned during project work.
