# VibeBox Common Agent Adapter

This guide is for any AI coding agent that can read files and run shell commands.

Shared skill:

- `skills/vibebox/SKILL.md`

Reference files:

- `skills/vibebox/references/COMMANDS.md`
- `skills/vibebox/references/WORKFLOW.md`
- `skills/vibebox/references/MEMORY_POLICY.md`

## Responsibilities

The adapter or agent must:

1. Locate VibeBox through `vibebox.cmd`, `vibebox`, or `node bin/vibebox.mjs`.
2. Run read-only `pretask` before meaningful repository work when memory could matter.
3. Apply `User Success Criteria`, `AI Failure Avoidance`, and `AI Successful Approaches` while planning and editing.
4. Inspect the repository; VibeBox memory does not replace codebase reality.
5. Run `aftertask` after meaningful work unless the user opts out.
6. Provide `userRequest` plus AI-agent structured memory candidates.
7. Submit `whyOnlyOneCandidate` for a one-candidate complex request, or `no_reusable_memory_candidate` with `noCandidateReason` when nothing reusable exists.
8. Write `displayTitle`, `displaySummary`, `displayRule`, and `displayLanguage` for the configured `memoryLanguage`.
9. Use manual review commands only for debugging, audits, or override.

Core validates, stores, dedupes, safely replaces, indexes, links, and renders. Core does not infer active memory from raw requests, summaries, headings, bullets, command output, or raw logs.

## Store Access

VibeBox uses one global store as the single source of truth:

```text
<USER_HOME>/.vibebox
%USERPROFILE%\.vibebox
```

or `VIBEBOX_HOME` when configured.

Sandboxed hosts may block the store because it is outside the workspace.

- `pretask` and `context` are read-only retrieval commands but still need global-store read access.
- `pretask` and `context` do not create project registry entries.
- `aftertask` is a write/capture operation and may need write access for project registration, raw event capture, active memory, indexes, and Wiki updates.
- If read access is denied, request approved read-only global VibeBox store access or report VibeBox guidance unavailable.
- If write access is denied, request approved global VibeBox store write access or report capture unavailable and state that project registration, active memory, and wiki updates were not completed.
- Do not create a copied store, workspace-local memory snapshot, project-local `.vibebox`, pointer file, or hidden metadata fallback.

## Command Preference

Windows/Codex:

```bash
vibebox.cmd <command>
vibebox <command>
node bin/vibebox.mjs <command>
```

Other environments:

```bash
vibebox <command>
node bin/vibebox.mjs <command>
```

Do not wrap VibeBox commands in `powershell.exe -Command` as the normal adapter path. If a wrapper attempt is blocked, retry direct commands before proceeding without guidance.

## Capture Contract

`aftertask` must include:

- `--request` or a `User request:` section
- `--candidates`, `--candidates-file`, `--structured-candidates-file`, or `Structured memory candidates:`

Action summaries and technical failure text are evidence only. Active user memory, AI failure memory, and AI successful approaches require structured candidates supplied by the agent.

## Language

The Obsidian Wiki is the display layer. Filenames, headings, summaries, aliases, and link labels follow configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. For non-default initial languages and conversion targets, the adapter must pass an AI-agent localized display template for the exact configured tag; Core renders that template instead of using hardcoded locale packs.

Adapters must not call external translation APIs from Core. Language conversion and semantic rebuild require an adapter runtime marker such as `VIBEBOX_AGENT_RUNTIME` and agent-provided localized or semantic data. Core does not translate, summarize, or generate missing user-facing display text.

## Privacy

Do not store secrets in active memory, Wiki pages, or Context Packs. Redact or omit API keys, tokens, passwords, bearer credentials, private connection strings, and secrets printed in command output.
