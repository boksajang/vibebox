# VibeBox

![VibeBox hero](assets/vibebox-hero.webp)

VibeBox is local-first memory middleware for AI coding agents.

It helps an agent remember durable user preferences, project rules, validation habits, failure-avoidance rules, and reusable successful approaches without turning the project repository into a memory store.

## What It Is

VibeBox sits beside an AI coding workflow:

1. Before work, the agent runs `vibebox pretask` or `vibebox context`.
2. The agent reads active guidance and applies it while inspecting the repository.
3. After meaningful work, the agent runs `vibebox aftertask`.
4. The agent supplies the original `userRequest` plus structured memory candidates.
5. VibeBox Core validates, stores, dedupes, indexes, links, and renders those candidates.

![VibeBox workflow diagram](assets/vibebox-diagram.webp)

The semantic contract is simple: the AI agent interprets the user's request and creates structured candidates. VibeBox Core does not decide meaning from raw text, summaries, keywords, headings, or command output.

## Why It Helps

AI coding agents often repeat the same mistakes across sessions: changing files the user wanted preserved, skipping validation, forgetting preferred workflows, or reusing an approach the user rejected.

VibeBox turns those reusable lessons into active guidance:

- `User Success Criteria`: what a good result means for the user.
- `AI Failure Avoidance`: mistakes, tool failures, and rejected directions to avoid.
- `AI Successful Approaches`: reusable methods that worked before.

Past memory is context, not authority. The current user request always wins.

`pretask` always carries active global user-profile baselines such as durable personal, design, coding, and response preferences, even when the current task wording has no direct lexical overlap. Project-specific guidance still takes priority, and other global technical memory remains relevance-filtered. Localized display fields also participate in matching, so a user-language task can retrieve memory whose canonical fields use another language. Agents do not need to run the full `report` command to compensate for a filtered Pre-Task Brief; `report` is an audit view.

## Quick Start

Requirements:

- Node.js 20 or newer
- npm

### Windows Beginner Install

Use this path when Codex is already installed and you want to install VibeBox from GitHub on Windows.

Open PowerShell and run:

```powershell
codex plugin marketplace add boksajang/vibebox
codex plugin add vibebox@boksajang
codex plugin list
```

What each command does:

- `codex plugin marketplace add boksajang/vibebox` registers the GitHub marketplace with Codex.
- `codex plugin add vibebox@boksajang` installs and enables the VibeBox Codex plugin.
- `codex plugin list` confirms that `vibebox@boksajang` is installed and enabled.

The installed plugin bundles VibeBox Core, so a separate clone, `npm install`, `npm link`, or global `vibebox.cmd` command is not required.

You can ask Codex App to complete installation, permission setup, and initialization in one natural-language request:

```text
boksajang/vibebox 플러그인을 설치하고 활성화한 다음,
설치된 번들 CLI로 setup-codex를 실행해줘.
그 다음 이 대화에서 내가 사용하는 언어를 판별하고, schema의
initialization.displayTemplate 전체를 그 언어로 생성해서
같은 번들 CLI로 init까지 실행해줘.
완료되면 Codex를 재시작해야 한다고 알려줘.
```

### Required Codex Setup And Initialization

Plugin installation only copies and enables the plugin package. It does not execute VibeBox Core, grant write access to `%USERPROFILE%\.vibebox`, or create the store's categories, indexes, and Wiki files.

If you installed the plugin without the combined request above, start a new Codex task and ask:

```text
설치된 VibeBox 플러그인의 번들 CLI로 setup-codex를 실행해서
%USERPROFILE%\.vibebox를 Codex writable_roots에 추가한 다음,
이 대화에서 내가 사용하는 언어의 정확한 BCP 47 태그로 schema를 읽고,
initialization.displayTemplate의 모든 값을 같은 언어로 생성해줘.
그 템플릿과 언어 태그를 같은 번들 CLI의 init에 전달해서 전역 저장소의
카테고리, 인덱스, Wiki 기본 파일을 생성해줘.
완료되면 Codex를 재시작해야 한다고 알려줘.
```

`setup-codex` backs up `%USERPROFILE%\.codex\config.toml`, adds `%USERPROFILE%\.vibebox` to `[sandbox_workspace_write].writable_roots`, and creates the global store directory when it is missing. The agent determines the user's conversation language, generates the complete display template returned by `schema --language <canonical-bcp47>`, and passes both to `init`. Core does not contain Korean-only or other hardcoded translation packs.

Restart Codex after both commands succeed, then start another new task so the updated permission and installed hooks are loaded. The first meaningful prompt runs `pretask`. If the store is still missing, the hook instructs the active AI agent to generate a complete template in the user's language before running `init`; it never creates an English fallback store. The aftertask checkpoint supplies the installed CLI path for `schema` and `aftertask`.

`doctor --codex` is optional and is only needed to verify the permission setup or diagnose a problem. You can ask Codex:

```text
설치된 VibeBox 플러그인의 번들 CLI로 doctor --codex를 실행해서
전역 저장소 권한과 상태를 확인해줘.
```

### Agent Plugin Or Skill Use

Install or enable VibeBox through the AI agent surface you use, then start a new agent session.

After the VibeBox plugin or skill is installed, users should not need to run `pretask`, `schema`, or `aftertask` by hand. Ask for coding work normally. The installed agent contract handles the VibeBox workflow:

- before meaningful repository work, the agent retrieves active guidance from the global VibeBox store;
- before writing memory candidates, the agent reads the Core-generated structured candidate schema;
- after meaningful work, the agent captures the original user request, outcome, validation evidence, and AI-agent structured memory candidates;
- VibeBox Core validates, stores, dedupes, indexes, links, and renders the Wiki automatically when capture succeeds.

This applies to Codex plugin use, Claude Code plugin use, and Claude-compatible skill fallback use. The AI agent remains the semantic authority: it decides which reusable memories to submit, and Core manages those submitted candidates.

Sandboxed hosts may still ask for permission to read or write the single global VibeBox store. That approval is for automatic memory retrieval and capture, not for a manual user workflow.

To pre-authorize the default global store for supported hosts, ask the agent to run the bundled setup command and then restart that host:

```bash
vibebox setup-codex
vibebox setup-claude
```

`setup-codex` backs up `~/.codex/config.toml`, creates it if missing, and adds `~/.vibebox` to `[sandbox_workspace_write].writable_roots`. `setup-claude` backs up `~/.claude/settings.json`, creates it if missing, and adds VibeBox file and command permissions. Use `vibebox doctor --codex`, `vibebox doctor --claude`, or `vibebox doctor --agent all` to inspect these settings.

On first use, the agent or adapter must identify the user's language from the conversation, request the schema for its canonical BCP 47 tag, generate every required display-template value in that language, and pass the template and tag to `init`. Users should not need to craft VibeBox workflow commands or candidate JSON manually.

### Local CLI Development

Use the CLI commands directly only when developing, debugging, or validating VibeBox itself:

```bash
git clone https://github.com/boksajang/vibebox.git
cd vibebox
npm install
npm link
vibebox.cmd init
vibebox.cmd doctor
```

`vibebox init` and `vibebox doctor` are maintenance checks for a bare CLI checkout. In normal plugin or skill use, the agent invokes VibeBox during the coding workflow and no additional user setup commands are part of day-to-day memory capture.

## Codex Plugin Use

VibeBox includes a Codex plugin package at `plugins/vibebox`, with the wrapper at `plugins/vibebox/.codex-plugin/plugin.json` and the shared skill at `plugins/vibebox/skills/vibebox/SKILL.md`.

Install or register the marketplace source:

```bash
codex plugin marketplace add boksajang/vibebox
codex plugin add vibebox@boksajang
```

Then enable the `vibebox` plugin in Codex and start a new session if the host does not load the installed plugin immediately.

Codex App can read an installed plugin cache instead of your local checkout. A GitHub push alone does not update that installed cache. After updating local plugin source, run `git pull` or reinstall the plugin, then verify the cache folder and key file hashes.

Example cache placeholder:

```text
%USERPROFILE%\.codex\plugins\cache\boksajang\vibebox\0.1.13\
```

VibeBox does not delete or rewrite Codex App plugin cache files automatically.

## Claude Code Plugin Use

VibeBox includes a Claude Code plugin manifest at `.claude-plugin/plugin.json`, a Claude marketplace catalog at `.claude-plugin/marketplace.json`, and plugin hooks at `hooks/hooks.json`.

Install from the repository marketplace inside Claude Code:

```text
/plugin marketplace add boksajang/vibebox
/plugin install vibebox@boksajang
/reload-plugins
```

CLI form:

```bash
claude plugin marketplace add boksajang/vibebox
claude plugin install vibebox@boksajang
```

When the plugin is enabled, the bundled Claude hooks support the normal VibeBox workflow:

- `UserPromptSubmit` runs `pretask` when the store exists. When it is missing, the hook instructs Claude to infer the user's language, generate the complete schema-defined display template in that language, initialize the store, and then run `pretask`.
- `Stop` blocks once with an aftertask checkpoint and supplies the installed CLI's absolute path, so Claude cannot silently finish meaningful work without running `schema` and `aftertask` with AI-agent structured candidates.

The hooks do not synthesize memory by themselves. Claude remains responsible for deciding whether reusable memory exists, reading the Core schema before candidate JSON, and submitting structured candidates or `no_reusable_memory_candidate`.

Claude Code resolves the marketplace `source: "./"` from the repository root and copies that plugin root into its cache. Because the root includes `bin/`, `src/`, `package.json`, hooks, and skills, Claude plugin installation does not require a separate clone, `npm install`, `npm link`, or global `vibebox` command. Claude may still show normal security prompts for access to `~/.vibebox` or execution of the bundled CLI.

## Obsidian Wiki

![Obsidian wiki screenshot](assets/obsidian-screen.webp)

The Obsidian-compatible wiki is a display layer for user review, not the source of truth. The global store remains the source of truth, and JSON indexes drive retrieval.

Default wiki locations:

```text
<USER_HOME>/.vibebox/wiki
%USERPROFILE%\.vibebox\wiki
```

Wiki filenames, titles, summaries, aliases, and link labels follow the configured `memoryLanguage`. `memoryLanguage` must be the user's actual language as a canonical BCP 47 tag. For every non-default initial language and conversion target, the AI Agent must generate the complete schema-defined display template in that exact language; Core rejects missing templates instead of silently falling back to English. Every recorded memory must also include `displayTitle`, `displaySummary`, and `displayRule` in that language with the matching `displayLanguage`, or Core rejects it before Wiki rendering.

## Runtime Store

VibeBox uses one global store as the single source of truth:

```text
<USER_HOME>/.vibebox
```

Override it with `VIBEBOX_HOME` or `--store <path>` when needed.

VibeBox does not create project-local `.vibebox` folders, workspace-local snapshots, copied stores, pointer files, or hidden metadata in work repositories.

In sandboxed agents, `pretask` and `context` are read-only retrieval commands but still need read access to the global store. `aftertask`, `init`, and `capture` need write access when they register projects, capture events, update active memory, or render wiki files.

## Update Workflow

For local source:

```bash
git pull
npm install
npm link
vibebox doctor
```

For Codex App plugin use:

1. Update or reinstall the plugin source.
2. Start a new Codex session.
3. Verify the installed cache under `%USERPROFILE%\.codex\plugins\cache\boksajang\vibebox\`.
4. Compare `plugins/vibebox/.codex-plugin/plugin.json`, `plugins/vibebox/skills/vibebox/SKILL.md`, and skill references between the package source and installed cache.

## Documentation

- [Concept](docs/CONCEPT.md)
- [Usage](docs/USAGE.md)
- [Memory Model](docs/MEMORY_MODEL.md)
- [Obsidian Wiki](docs/OBSIDIAN.md)
- [VibeBox Skill](skills/vibebox/SKILL.md)
- [Command Reference](skills/vibebox/references/COMMANDS.md)
- [Workflow Reference](skills/vibebox/references/WORKFLOW.md)
- [Memory Policy](skills/vibebox/references/MEMORY_POLICY.md)
- [Common Adapter](adapters/common/README.md)
- [Codex Adapter](adapters/codex/README.md)
- [Claude Adapter](adapters/claude/README.md)

## Privacy

VibeBox is local-first. It does not sync memory to a cloud service by itself. Sensitive values should not be stored as active memory, wiki text, or Context Pack content.

## License

MIT License. Created by Boksajang.
