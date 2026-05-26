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
7. Run `vibebox aftertask ...` after meaningful work.
8. Keep memory promotion review-first with `review`, `approve`, and `reject`.

## Storage Roles

- `~/.vibebox/global/`: global preferences and rules.
- `~/.vibebox/projects/{projectId}/`: project memory derived from the current working directory.
- `~/.vibebox/wiki/`: human-readable Markdown for inspection.
- `~/.vibebox/index/`: JSON indexes for retrieval.
- `~/.vibebox/logs/`: raw blackbox event records.
- `~/.vibebox/pending/`: memory candidates awaiting review.
- `~/.vibebox/registry/`: project identity registry data.

Set `VIBEBOX_HOME` to use a different store root. VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects.

The wiki and relation index represent the active graph only: current project decisions, failure prevention rules, success patterns, validation/process/design patterns, user preferences, and agent failure/success patterns. Raw logs are diagnostic and should not be treated as prompt context by default.

Set `VIBEBOX_LOCALE` or `VIBEBOX_LANGUAGE` to localize human-facing headings. JSON field names and command names stay English.

## Privacy Rule

Do not store secrets in active memory, wiki pages, or Context Packs. If sensitive values appear in raw inputs, redact or avoid repeating them.
