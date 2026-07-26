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

## Quick Start

Requirements:

- Node.js 20 or newer
- npm

### Windows Beginner Install

Use this path when Codex is already installed and you want to install VibeBox from GitHub on Windows.

Open PowerShell and run:

```powershell
mkdir C:\VibeBox
cd C:\VibeBox
git clone https://github.com/boksajang/vibebox.git
cd vibebox
npm install
npm link
vibebox.cmd init
vibebox.cmd setup-codex
vibebox.cmd doctor
codex plugin marketplace add boksajang/vibebox
codex plugin add vibebox@boksajang
codex plugin list
```

What each command does:

- `mkdir C:\VibeBox` creates a working folder for the install.
- `cd C:\VibeBox` moves PowerShell into that folder.
- `git clone https://github.com/boksajang/vibebox.git` downloads VibeBox from GitHub.
- `cd vibebox` moves into the downloaded VibeBox folder.
- `npm install` installs the Node.js packages VibeBox needs.
- `npm link` registers the `vibebox` command globally on this PC.
- `vibebox.cmd init` creates the global VibeBox store at `%USERPROFILE%\.vibebox`, including the default folders, indexes, logs, registry, and Wiki files.
- `vibebox.cmd setup-codex` updates Codex settings so Codex can read and write `%USERPROFILE%\.vibebox` without repeated approval prompts.
- `vibebox.cmd doctor` checks that the VibeBox store and Codex setup are valid.
- `codex plugin marketplace add boksajang/vibebox` registers the GitHub marketplace with Codex.
- `codex plugin add vibebox@boksajang` installs and enables the VibeBox Codex plugin.
- `codex plugin list` confirms that `vibebox@boksajang` is installed and enabled.

On Windows PowerShell, prefer `vibebox.cmd` in examples. Running `vibebox init` may call `vibebox.ps1` and be blocked by the PowerShell execution policy.

You can also ask inside Codex App:

```text
boksajang/vibebox 플러그인을 설치하고 활성화 해라. 필요하면 GitHub에서 clone하고 npm install, npm link, vibebox.cmd init, vibebox.cmd setup-codex, vibebox.cmd doctor까지 실행해라.
```

If Codex only installs the plugin and does not run the CLI setup, run the full PowerShell sequence above yourself. `setup-codex` is not the plugin install command; it is the one-time Codex permission setup after `npm link` makes `vibebox.cmd` available.

At minimum, after `npm install` and `npm link`, run these once so the global memory store and Codex permissions are ready:

```powershell
vibebox.cmd init
vibebox.cmd setup-codex
vibebox.cmd doctor
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

To pre-authorize the default global store for supported hosts, run the setup command for that agent and restart it:

```bash
vibebox setup-codex
vibebox setup-claude
```

`setup-codex` backs up `~/.codex/config.toml`, creates it if missing, and adds `~/.vibebox` to `[sandbox_workspace_write].writable_roots`. `setup-claude` backs up `~/.claude/settings.json`, creates it if missing, and adds VibeBox file and command permissions. Use `vibebox doctor --codex`, `vibebox doctor --claude`, or `vibebox doctor --agent all` to inspect these settings.

On first use, the agent or adapter should bootstrap the global store and provide any required localized display template for the configured `memoryLanguage`. Users should not need to craft VibeBox workflow commands or candidate JSON manually.

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
%USERPROFILE%\.codex\plugins\cache\boksajang\vibebox\0.1.8\
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

- `UserPromptSubmit` runs `pretask` for the submitted prompt and adds the retrieved guidance to Claude context.
- `Stop` blocks once with an aftertask checkpoint so Claude cannot silently finish meaningful work without running `schema` and `aftertask` with AI-agent structured candidates.

The hooks do not synthesize memory by themselves. Claude remains responsible for deciding whether reusable memory exists, reading the Core schema before candidate JSON, and submitting structured candidates or `no_reusable_memory_candidate`.

## Obsidian Wiki

![Obsidian wiki screenshot](assets/obsidian-screen.webp)

The Obsidian-compatible wiki is a display layer for user review, not the source of truth. The global store remains the source of truth, and JSON indexes drive retrieval.

Default wiki locations:

```text
<USER_HOME>/.vibebox/wiki
%USERPROFILE%\.vibebox\wiki
```

Wiki filenames, titles, summaries, aliases, and link labels follow the configured `memoryLanguage`. `memoryLanguage` must be a valid canonical BCP 47 language tag. For non-default initial languages and language conversion targets, the AI Agent must provide a localized display template for the exact configured tag; Core stores and renders that agent-provided template instead of using hardcoded locale packs.

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
