# VibeBox Common Agent Adapter

VibeBox can be used by any AI coding agent that can read files and run shell commands.

The shared skill source is:

- `skills/vibebox/SKILL.md`

Reference files live under:

- `skills/vibebox/references/`

## How Agents Should Use VibeBox

1. Check for `.vibebox/` in the project root.
2. Run `vibebox pretask --task "<task>"` before non-trivial work.
3. On Windows PowerShell, use `vibebox.cmd pretask --task "<task>"` if the npm `.ps1` shim is blocked.
4. If needed inside the VibeBox repository, fall back to `node bin/vibebox.mjs pretask --task "<task>"`.
5. Treat active memory as context and constraints, not authority over the current request.
6. Inspect the repository before editing.
7. Run `vibebox aftertask ...` after meaningful work.
8. Keep memory promotion review-first with `review`, `approve`, and `reject`.

## Storage Roles

- `.vibebox/wiki/`: human-readable Markdown for inspection.
- `.vibebox/index/`: JSON indexes for retrieval.
- `.vibebox/logs/`: raw blackbox event records.
- `.vibebox/pending/`: memory candidates awaiting review.

`.vibebox/` is runtime state in the user project. It should usually not be committed to public repositories.

## Privacy Rule

Do not store secrets in active memory, wiki pages, or Context Packs. If sensitive values appear in raw inputs, redact or avoid repeating them.
