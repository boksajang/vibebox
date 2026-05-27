# VibeBox Common Agent Adapter

VibeBox can be used by any AI coding agent that can read files and run shell commands.

The shared skill source is:

- `skills/vibebox/SKILL.md`

Reference files live under:

- `skills/vibebox/references/`

## How Agents Should Use VibeBox

1. Check whether VibeBox is available through `vibebox`, `vibebox.cmd`, or the local Node fallback.
2. Run `vibebox pretask --task "<task>"` before non-trivial work.
3. On Windows PowerShell, use `vibebox.cmd pretask --task "<task>"` if the npm `.ps1` shim is blocked.
4. If needed inside the VibeBox repository, fall back to `node bin/vibebox.mjs pretask --task "<task>"`.
5. Treat active memory as the current pattern graph: context and constraints, not authority over the current request.
6. Inspect the repository before editing.
7. Run `vibebox aftertask ...` after meaningful work, including `--technical-outcome` and `--user-acceptance` when known.
8. Let VibeBox auto-curate userRequest/userFeedback-first events into active, replaced, discarded, or quarantined memory.
9. Use `review`, `approve`, and `reject` only for debugging, audits, or manual override.

## Storage Roles

- `~/.vibebox/global/`: global preferences and rules.
- `~/.vibebox/projects/{projectId}/`: project memory derived from the current working directory.
- `~/.vibebox/wiki/`: human-readable Markdown for inspection.
- `~/.vibebox/index/`: JSON indexes for retrieval.
- `~/.vibebox/logs/`: raw blackbox event records.
- `~/.vibebox/pending/`: legacy/manual debug candidates.
- `~/.vibebox/registry/`: project identity registry data.

Set `VIBEBOX_HOME` to use a different store root. VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.

The wiki, relation index, Context Packs, and Pre-Task Briefs represent the active graph only: user model, domain model, project model, failure prevention rules, success patterns, validation/process/design patterns, preferences, and agent failure/success patterns. Rejected, discarded, quarantined, replaced, task-only context, and legacy pending memory is excluded. Raw logs are diagnostic and should not be treated as prompt context by default.

Human-facing active memory and wiki managed content follow the configured memory language. Obsidian document identity uses stable `docKey` values with localized filenames and links. JSON field names and command names stay English, and adapters must not call external translation APIs. Only run `convert-lang` or semantic `rebuild` when the adapter has set an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME`.

Technical success and user acceptance are separate. If the user rejects an outcome, adapters must not report it as a reusable `success_pattern`.

`backup` and `restore` are normal CLI maintenance commands. Restore is destructive replace, not merge, and requires explicit confirmation.

## Privacy Rule

Do not store secrets in active memory, wiki pages, or Context Packs. If sensitive values appear in raw inputs, redact or avoid repeating them.
