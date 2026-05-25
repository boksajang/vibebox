# Common VibeBox Install And Invocation Guide

## Local CLI Usage

From this repository:

```bash
node bin/vibebox.mjs <command>
```

## Linked CLI Usage

To make `vibebox` available as a local command during development:

```bash
npm link
vibebox <command>
```

This uses the `bin.vibebox` entry in `package.json`.

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
