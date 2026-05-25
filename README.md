# VibeBox

**A local blackbox for AI coding sessions.**

VibeBox is a local-first memory middleware for AI coding agents.

It records important development decisions, failed approaches, successful patterns, user preferences, and project-specific rules, then turns them into a reusable context layer for future AI coding tasks.

AI coding agents are powerful, but they often forget why a decision was made, which approach failed before, or what the user explicitly rejected.

VibeBox is designed to solve that problem.

---

## Why VibeBox Exists

AI coding often repeats the same mistakes.

- It forgets previous project decisions.
- It suggests technologies the user already rejected.
- It touches files that should not be changed.
- It repeats failed approaches.
- It loses context between sessions.
- It forces the user to explain the same rules again and again.

VibeBox acts like a **blackbox recorder** for AI-assisted development.

It does not try to replace the coding agent.  
It helps the agent remember what matters before it starts working.

---

## Core Idea

Before an AI coding agent answers, designs, or writes code, VibeBox can provide a focused memory context.

After a task is completed, VibeBox can record what happened, what worked, what failed, and what should be remembered next time.


User Request
↓
VibeBox Memory Search
↓
Context Pack
↓
AI Coding Agent
↓
Task Result
↓
Blackbox Event
↓
Memory Candidate
↓
Review / Approval
↓
Reusable Project Memory


---

## What VibeBox Stores

VibeBox focuses on useful development memory, not raw conversation history.

It can store:

- User development preferences
- Project decisions
- Architecture rules
- Avoid rules
- Failure memory
- Success patterns
- Tooling preferences
- Coding style preferences
- Design preferences
- Workflow rules

Examples:


For dashboard projects, prefer MSSQL.
Do not modify package.json unless explicitly requested.
Global body overflow changes caused layout regressions before.
Wrapper-based table scrolling worked successfully.
This project uses ECharts for dashboard visualization.


---

## What VibeBox Does Not Do

VibeBox is not a chat log archive.

It does not aim to store every conversation line.  
It only extracts and stores reusable development knowledge.

VibeBox should not preserve noise.  
It should preserve decisions, failures, constraints, and patterns.

---

## Local-First Design

VibeBox stores everything locally inside the project workspace.


.vibebox/
  config.json
  wiki/
  index/
  logs/
  pending/


This makes the memory portable, inspectable, and versionable.

No hidden database.  
No remote dependency.  
No forced platform lock-in.

---

## Obsidian-Compatible Wiki

VibeBox generates Markdown files that can be opened as an Obsidian vault.

The wiki layer is for humans.

It helps users visually inspect how decisions, failures, tools, and preferences are connected.


.vibebox/wiki/
  Home.md
  User Preferences.md
  Project Decisions.md
  Architecture Rules.md
  Avoid Rules.md
  Failure Memory.md
  Success Patterns.md
  Tooling Preferences.md
  Workflow Rules.md


VibeBox also uses wiki-style links such as:

markdown
[[MSSQL]]
[[FastAPI]]
[[Dashboard Development]]
[[Failure Memory]]
[[Avoid Rules]]


This allows the project memory to become a connected knowledge graph.

---

## Fast JSON Index

The Markdown wiki is for humans.  
The JSON index is for AI agents.


.vibebox/index/
  memory-index.json
  keyword-index.json
  relation-index.json
  pending-index.json


The index allows VibeBox to quickly retrieve relevant memory for a task and generate a compact Context Pack.

---

## Context Pack

A Context Pack is the short, focused memory brief that an AI coding agent should read before starting a task.

Example:


VibeBox Context Pack

Task:
Improve dashboard table scrolling.

Relevant Avoid Rules:
- Do not solve layout scrolling by changing global body overflow.

Relevant Failure Memory:
- Global body overflow changes previously caused layout regressions.

Relevant Success Patterns:
- Wrapper-based table scrolling worked successfully for wide tables.

Guidance for AI Agent:
- Preserve existing layout behavior.
- Avoid repeating known failed approaches.
- Use the memory context as constraints.


---

## Review-First Memory

VibeBox does not automatically turn every extracted memory into permanent truth.

New memory is first stored as a pending candidate.


capture
↓
extract
↓
pending memory
↓
review
↓
approve / reject
↓
active memory


This prevents one-time comments, temporary decisions, or ambiguous statements from becoming permanent rules.

---

## Conflict-Aware Memory

VibeBox is designed to detect whether a new memory candidate is:

- a duplicate
- a refinement
- an exception
- a direct conflict
- a replacement
- unclear and requiring review

This is important because real development memory is rarely simple.

For example:


General app projects may prefer Supabase.
Internal dashboard-style apps may prefer MSSQL.


That is not a simple conflict.  
It is a conditional refinement.

VibeBox is built to preserve that nuance.

---

## Blackbox Reports

VibeBox is not only about remembering preferences.

It is also about understanding why AI coding succeeded or failed.

A blackbox report can summarize:

- failed approaches
- successful approaches
- rejected directions
- confirmed decisions
- recurring failure types
- frequently changed files
- prevention rules

The goal is simple:

**Do not let the AI repeat the same mistake twice.**

---

## Planned Commands

VibeBox is designed around simple commands.

bash
vibebox init
vibebox capture
vibebox extract
vibebox review
vibebox approve
vibebox reject
vibebox context
vibebox doctor


Future workflow commands may include:

bash
vibebox pretask
vibebox aftertask
vibebox report
vibebox blackbox


---

## Typical Workflow


1. Initialize VibeBox in a project.
2. Capture important AI coding events.
3. Extract memory candidates.
4. Review and approve useful memories.
5. Generate a Context Pack before the next AI task.
6. Let the AI coding agent work with better context.


---

## Example Use Case

A user repeatedly works on dashboard projects.

Over time, VibeBox learns that:


Dashboard projects usually use MSSQL.
FastAPI is preferred for backend services.
ECharts is preferred for dashboard visualization.
UI messages should use formal Korean.
package.json should not be modified without approval.


Later, when the user says:


Create a new dashboard module.


VibeBox can provide the AI agent with the relevant project memory before work begins.

This reduces repeated explanations and wrong assumptions.

---

## Philosophy

Vibe coding should not mean starting from zero every time.

A good AI coding agent should remember:

- what the user prefers
- what the project decided
- what failed before
- what worked before
- what must not be touched
- what should be preserved

VibeBox exists to make that memory visible, reusable, and controllable.

---

## Project Status

VibeBox is currently in early development.

The first goal is to build the local memory foundation:

- local `.vibebox/` storage
- Obsidian-compatible Markdown wiki
- JSON search index
- blackbox event log
- memory candidate extraction
- review-first approval flow
- context pack generation

---

## License

License information will be added as the project matures.

---

## Author

Created by **Boksajang**.

VibeBox is part of an open plugin ecosystem for AI-assisted development workflows.
