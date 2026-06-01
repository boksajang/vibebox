# VibeBox Claude Adapter

This is a Claude-compatible guide for using the shared VibeBox skill with the local VibeBox CLI.

VibeBox memory behavior comes from Core and the shared skill, not from an adapter-specific fork.

## Shared Skill

- `skills/vibebox/SKILL.md`

References:

- `skills/vibebox/references/COMMANDS.md`
- `skills/vibebox/references/WORKFLOW.md`
- `skills/vibebox/references/MEMORY_POLICY.md`

## Command Fallback

Preferred:

```bash
vibebox <command>
```

Windows fallback:

```bash
vibebox.cmd <command>
```

Repository fallback:

```bash
node bin/vibebox.mjs <command>
```

## Workflow

Before meaningful work:

```bash
vibebox pretask --task "<task description>"
```

Claude-compatible agents should apply `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` before planning or editing.

After meaningful work:

```bash
vibebox aftertask --request "<original user request or faithful summary>" --summary "..." --candidates-file structured-candidates.json --technical-outcome success --user-acceptance unknown
```

The `--request` value preserves the source of user success criteria. Active memory requires Claude to provide structured candidates with its semantic judgment. Do not send only an action summary when active memory should be created.

If using a long file payload, include `User request:` and `Structured memory candidates:`.

Claude is the semantic authority. It decides success criteria, corrections, AI failure signals, successful approaches, task-only details, model class, scope, categories, relations, replacements, confidence, and localized display text.

If a complex request produces only one candidate, include `whyOnlyOneCandidate`. If no reusable memory exists, submit `no_reusable_memory_candidate` with `noCandidateReason`.

Display fields should follow configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. For non-default initial languages and conversion targets, Claude must pass an AI-agent localized display template for the exact configured tag; Core renders that template instead of using hardcoded locale packs. A store configured with a Korean language tag needs Korean `displayTitle`, `displaySummary`, and `displayRule`, plus matching `displayLanguage`.

Core validates, stores, dedupes, safely replaces, indexes, links, and renders. It does not infer memory from raw user requests, keywords, headings, bullets, action summaries, command output, or missing display text.

Manual review is for debugging or override:

```bash
vibebox review
vibebox approve <candidate-id>
vibebox reject <candidate-id>
```

## Store Access

VibeBox uses one global user store:

```text
<USER_HOME>/.vibebox
```

or `VIBEBOX_HOME` when configured.

Sandboxed hosts may need approved read-only global VibeBox store access for `pretask`/`context` and approved global VibeBox store write access for `aftertask`. If read access is denied, report guidance unavailable. If aftertask write access is denied, report that capture, project registration, active memory, and wiki updates were not completed.

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in work projects.

## Language And Maintenance

`convert-lang` and semantic `rebuild` require an agent runtime marker such as `VIBEBOX_AGENT_RUNTIME` and Claude-provided localized or semantic data. Core applies file operations and integrity checks but does not translate, summarize, generate missing display text, or reclassify meaning.

`backup` and `restore` are normal CLI maintenance commands. Restore is destructive replacement, not merge, and requires confirmation.
