# VibeBox Memory Policy

VibeBox memory is reviewed local context for AI coding work. It is not a replacement for the current user request or the repository's actual state.

## Memory Types

- `user_preference`
- `project_decision`
- `architecture_rule`
- `avoid_rule`
- `failure_memory`
- `success_pattern`
- `tooling_preference`
- `coding_style`
- `design_preference`
- `workflow_rule`

## Memory Scopes

- `global`: broad user preference across projects.
- `domain`: applies to a domain such as dashboards, apps, UI, backend, or dependency management.
- `project`: applies to the current repository.
- `task`: applies to the current task only.
- `temporary`: time-limited or experimental context.

Project memory should be considered before global memory for the current repository.

## Confidence Levels

- `low`: weak, inferred, tentative, or incomplete context.
- `medium`: likely preference or rule with some supporting context.
- `high`: explicit, confirmed, repeated, or strict context.

Low-confidence memory must not be treated as final fact.

## Active Vs Pending Memory

- `active`: reviewed memory available for Context Packs and Pre-Task Briefs.
- `pending`: candidate memory awaiting review.
- `superseded`: replaced by a newer approved memory.
- `rejected`: reviewed and declined.
- `archived`: kept for history but not active retrieval.

Pending memory must not be treated as active memory.

## Conflict Statuses

- `no_conflict`
- `duplicate`
- `refinement`
- `exception`
- `direct_conflict`
- `supersedes`
- `needs_user_review`

Direct conflicts, supersedes, exceptions, duplicate records, and unclear candidates require review.

## Review-First Policy

New memory candidates are never authority by default. They must be reviewed before active use.

Use:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox approve --safe
vibebox reject <candidate-id>
```

Fallback:

```bash
node bin/vibebox.mjs <command>
```

On Windows PowerShell, use `vibebox.cmd <command>` if the npm `.ps1` shim is blocked.

## Sensitive Data Policy

Sensitive data must not enter active memory, wiki pages, or Context Packs.

Treat these as sensitive:

- API keys
- tokens
- passwords
- bearer credentials
- private connection strings
- secrets printed in command output

If suspicious data appears in raw task material, avoid repeating it and prefer `[REDACTED]`.

## Context-Based Classification Policy

Memory classification should consider context, not just isolated words.

Use these judgment axes:

- Permanence: one-off instruction, temporary allowance, repeatable rule, or long-term preference.
- Scope: current task, current project, domain, or global.
- Certainty: weak opinion, preference, confirmed decision, or strict rule.
- Intent: instruction, correction, rejection, confirmation, exception, or replacement.
- Evidence: explicit user statement, result-based inference, repeated observation, or single event.
- Relation to existing memory: duplicate, refinement, exception, direct conflict, supersedes, or unclear.

## Why Keyword-Only Classification Is Not Enough

The same word can mean different things depending on intent and context. For example, a sentence may mention a database as a failed experiment, an approved decision, a temporary exception, or a broad preference. VibeBox should preserve that distinction.

## Handling Uncertain Memory

When uncertain:

- Keep the candidate pending.
- Mark low confidence when appropriate.
- Use `needs_user_review` for unclear conflicts.
- Do not include it as an active constraint in normal pre-task output.

## Current Request Vs Past Memory

The user's current explicit request wins over past memory. If active memory warns against the current request, mention the warning and follow the user's current instruction unless it creates a safety or feasibility issue.

## Runtime State Exclusion Policy

VibeBox runtime state lives in one global user store at `~/.vibebox` by default, or under `VIBEBOX_HOME` when configured. Global preferences and rules live under `global/`; project memory lives under `projects/{projectId}/`; wiki, index, logs, pending, and registry data live under the global store.

The project id is derived from the current working directory using git remote `origin`, `package.json` name, git root folder name, then current folder name.

VibeBox does not create project-local `.vibebox` folders, pointer files, or hidden metadata in work projects. Old project-local stores are legacy; `doctor` warns about them, and migration remains explicit and non-destructive.
