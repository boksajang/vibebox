# Common VibeBox Install And Invocation Guide

## Requirements

- Node.js `>=20`
- npm for `npm install` and `npm link`

## Local CLI Usage

From this repository:

```bash
node bin/vibebox.mjs <command>
```

## Linked CLI Usage

To make `vibebox` available as a global development command:

```bash
npm install
npm link
vibebox <command>
```

This uses the `bin.vibebox` entry in `package.json`.
On Windows PowerShell, if the npm `.ps1` shim is blocked by execution policy, use `vibebox.cmd <command>` or the direct `node bin/vibebox.mjs <command>` fallback.

## Project Initialization

Initialize the global VibeBox user store:

```bash
vibebox init
```

Fallback:

```bash
node bin/vibebox.mjs init
```

## How An Agent Should Locate VibeBox

1. Start from the current working directory.
2. Check whether VibeBox is available through `vibebox`, `vibebox.cmd`, or the local Node fallback.
3. Let VibeBox derive project identity from git remote `origin`, `package.json` name, git root folder name, then current folder name.
4. Run pre-task retrieval before meaningful repository work when memory could matter.
5. Prefer `vibebox <command>`.
6. Fall back to `node bin/vibebox.mjs <command>` inside the VibeBox repository.

## Avoid Storing Secrets

Do not include API keys, tokens, passwords, bearer credentials, or private connection strings in memory summaries. If command output includes a suspicious value, summarize the outcome without repeating the secret.

## Runtime State

`vibebox init` creates the global user store at `~/.vibebox` by default, or under `VIBEBOX_HOME` when configured. VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.
