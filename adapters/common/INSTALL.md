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

Initialize VibeBox in a repository:

```bash
vibebox init
```

Fallback:

```bash
node bin/vibebox.mjs init
```

## How An Agent Should Locate VibeBox

1. Start from the current repository root.
2. Look for `.vibebox/`.
3. If it exists, run pre-task retrieval before non-trivial work.
4. If it does not exist, initialize only when the user asks for VibeBox memory in that project.
5. Prefer `vibebox <command>`.
6. Fall back to `node bin/vibebox.mjs <command>` inside the VibeBox repository.

## Avoid Storing Secrets

Do not include API keys, tokens, passwords, bearer credentials, or private connection strings in memory summaries. If command output includes a suspicious value, summarize the outcome without repeating the secret.

## Runtime State

`vibebox init` creates `.vibebox/` inside the current project. That folder is local runtime state and should usually remain out of public source control.
