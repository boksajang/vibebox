# VibeBox Common Agent Adapter

VibeBox can be used by any AI coding agent that can read files and run shell commands.

The shared skill source is:

- `skills/vibebox/SKILL.md`

Reference files live under:

- `skills/vibebox/references/`

## How Agents Should Use VibeBox

1. Check whether VibeBox is available through direct `vibebox.cmd`, `vibebox`, or the local Node fallback.
2. On Windows/Codex, run read-only `vibebox.cmd pretask --task "<task>"` before non-trivial work.
3. Outside Windows, run read-only `vibebox pretask --task "<task>"`.
4. If needed inside the VibeBox repository, fall back to `node bin/vibebox.mjs pretask --task "<task>"`.
5. Read `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.
6. Treat active memory as the current pattern graph: context and constraints, not authority over the current request.
7. Inspect the repository before editing.
8. Apply relevant guidance in the plan and implementation; do not merely print the VibeBox output.
9. Run `vibebox aftertask --request "<original user request or faithful summary>" --candidates "<agent-candidate-json>" ...` after meaningful work, including `--technical-outcome` and `--user-acceptance` when known. Do not call aftertask with only an AI action summary.
10. The adapter/agent is responsible for semantic extraction. Submit structured candidates for user success criteria, AI failure memory, AI successful approaches, task context, discarded detail, categories, relations, replacements, and localized display text. If no reusable memory exists, leave an explicit no-reusable-memory diagnostic instead of assuming Core will decide.
11. Use `review`, `approve`, and `reject` only for debugging, audits, or manual override.

## Storage Roles

- `~/.vibebox/global/`: global preferences and rules.
- `~/.vibebox/projects/{projectId}/`: project memory derived from the current working directory.
- `~/.vibebox/wiki/`: human-readable Markdown for inspection.
- `~/.vibebox/index/`: JSON indexes for retrieval.
- `~/.vibebox/logs/`: raw blackbox event records.
- `~/.vibebox/pending/`: legacy/manual debug candidates.
- `~/.vibebox/registry/`: project identity registry data.

Set `VIBEBOX_HOME` to use a different store root. VibeBox uses this global store as the single source of truth. VibeBox does not create project-local `.vibebox` folders, workspace-local memory snapshots, copied memory stores, pointer files, or hidden metadata in work projects.

Sandboxed hosts may block access to `~/.vibebox` or `$VIBEBOX_HOME` because the global store is outside the current workspace. `pretask` and `context` are read-only memory retrieval for repository files, but they still need global store read access. `aftertask` writes capture records and active memory updates, so it needs global store write access. If access is denied, request the appropriate approval or report that VibeBox guidance/capture was unavailable; do not create a copied memory fallback.

The wiki, relation index, Context Packs, and Pre-Task Briefs represent the active graph only: user success criteria, domain model, project model, failure prevention rules, AI successful approaches, validation/process/design patterns, preferences, and AI failure memory. Rejected, discarded, quarantined, replaced, task-only context, and legacy pending memory is excluded. Raw logs are diagnostic and should not be treated as prompt context by default.

Before acting, adapters should surface and apply all three lanes when present: `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches`.

Do not wrap VibeBox commands in `powershell.exe -Command` as the normal adapter path. Shell wrappers can look riskier to host approval layers than direct CLI calls. If a wrapper-style `pretask` or `context` attempt is blocked, retry direct `vibebox.cmd`, then `vibebox`, then `node bin/vibebox.mjs` from the repository. If the global store is blocked, request read-only global VibeBox store access. If all attempts fail, report that VibeBox guidance was unavailable and include that fact in the aftertask notes or errors.

`pretask` and `context` are read-only memory retrieval commands that print active guidance and should not modify repository files. `aftertask` is a global store write/capture operation and must include `--request` or a `User request:` section plus structured candidates for active memory creation. If candidates are missing, Core records the raw event and warns that the AI agent must provide structured candidates; rerun capture with candidates when reusable memory should be stored. Action summaries and technical failure evidence alone do not create active memory.

Internal memory stays canonical for agent processing: JSON field names, relation types, command names, file paths, errors, and raw logs remain stable. Obsidian is the user display layer: filenames, category folders, headings, aliases, links, Recent Active Memory, category pages, project pages, and category-based memory notes follow the configured memory language through stable `docKey` identity and agent-provided display fields. Visible note names are meaning-based; `mem_...` ids stay in frontmatter. A memory has one canonical note under its primary category and can be linked from multiple related category pages plus the source project page. Adapters must not call external translation APIs from Core. Only run `convert-lang` or semantic `rebuild` when the adapter has set an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and supplied localized/semantic data.

Technical success and user acceptance are separate. User acceptance is the user's reaction to the result, not memory approval. If the user rejects an outcome, adapters must treat it as AI failure and pass the correction as updated success criteria; if validation passes and no rejection signal exists, VibeBox may record inferred AI successful approach without claiming user confirmation. Command, permission, environment, and tool failures should be captured as AI failure memory, with successful workarounds captured as recovery approaches.

`backup` and `restore` are normal CLI maintenance commands. Restore is destructive replace, not merge, and requires explicit confirmation.

## Privacy Rule

Do not store secrets in active memory, wiki pages, or Context Packs. If sensitive values appear in raw inputs, redact or avoid repeating them.
