# `.lovable/` Folder Guide

Structural map of the `.lovable/` control tree. Read this before touching any file here.

## Top-level

| Path                                     | Purpose                                                                       | Edit rule                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `overview.md`                            | Project overview + architecture diagrams (human + AI orientation).            | Update when architecture or onboarding changes.                    |
| `ai-improvement-guidelines.md`           | Codebase-derived AI quality guide.                                            | Append anti-patterns when recurring failures found.                |
| `what-to-read.md`                        | Authoritative onboarding map.                                                 | Update Read First order when new top-level docs added.             |
| `project.json`                           | Template + revision pin (`tanstack_start_ts_current`).                        | Never hand-edit.                                                   |
| `prompt.md`                              | Prompt registry: aliases → prompt files.                                      | Update whenever a new `prompts/xx-*.md` is added.                  |
| `coding-guidelines/coding-guidelines.md` | Coding rules referenced by the "coding tasks" branch of the next-task prompt. | Follow verbatim; treat as authoritative.                           |
| `memory/`                                | Distilled onboarding memory (this folder).                                    | Append focused files; keep `index.md` in sync.                     |
| `plans/`                                 | Plan lifecycle.                                                               | Use `pending/` → `done/`; sub-evidence in `subtasks/<plan-slug>/`. |
| `prompts/`                               | Numbered prompt archive (`xx-slug.md`).                                       | Never renumber; new prompts get the next `xx`.                     |
| `spec/commands/`                         | Command specs invoked by aliases.                                             | Add commands here; then link from `prompt.md`.                     |

## `memory/`

Ordered index of what a fresh agent must know. `index.md` is the always-read entry point.

| File                           | Domain                                      |
| ------------------------------ | ------------------------------------------- |
| `01-code-red.md`               | Hard prohibitions, size caps                |
| `02-naming.md`                 | DB / booleans / API                         |
| `03-error-manage.md`           | 3-tier error architecture                   |
| `04-design-system.md`          | Tokens + Tailwind v4 rules                  |
| `05a-pipeline-and-research.md` | On-demand digest of research/pipeline specs |
| `05b-linters.md`               | `linters/` rulesets                         |
| `05c-linter-scripts.md`        | `linter-scripts/` runners + guards          |
| `05d-scripts.md`               | `scripts/` maintenance invariants           |
| `06-spec-map.md`               | Full `spec/` map + `.lovable/` inventory    |
| `07-lovable-folder-guide.md`   | This file                                   |

## `plans/`

- `pending/NN-slug.md` — active plans (max 50 steps each).
- `done/NN-slug.md` — archived after completion.
- `subtasks/<plan-slug>/SS-NN-*.md` — per-step evidence (reads, artifacts, decisions).

Rule: move `pending → done` only after every step is checked and verification bullets pass.

## `prompts/`

Sequential archive. Aliases resolve through `prompt.md`. Notable current entries:

- `32-read-memory.md` — onboarding sequence (alias: **read memory**).
- `33..37-next-task.md` — successive archived next-task invocations (alias: **next task** / **next 2 steps** points to latest).

Never overwrite an old prompt; always add a new number.

## `spec/commands/`

- `01-plan-50-workflow.md` — the 50-step / max-enforcement plan protocol.
- `02-ip-guardrail.md` — no-vendor-name / study-only IP rule.
- `03-domain-vocabulary.md` — canonical machine-vision terminology.

## Cross-links

- Onboarding starts at `prompts/32-read-memory.md`, which points here.
- `mem://index.md` lists design/tokens memory; the `.lovable/memory/` files own project-rule memory.
