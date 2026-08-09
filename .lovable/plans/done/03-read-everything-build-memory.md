# Read Everything — Build Project Memory

Slug: read-everything-build-memory
Steps: 10
Status: pending
Created: 2026-07-12

## Context

User asked me to thoroughly read the entire `spec/` folder, the entire `.lovable/` folder, plus `linters/`, `linter-scripts/`, and `scripts/`, then create my own memory capturing what to read in the `.lovable/` folder. Deliverable is a persisted memory index inside `.lovable/memory/` and refreshed `mem://` entries. Related commands: `.lovable/spec/commands/01-plan-50-workflow.md`, `.lovable/prompts/32-read-memory.md` (the "read memory" onboarding sequence).

## Steps

1. Inventory `.lovable/` recursively (memory, plans/pending, plans/done, plans/subtasks, spec/commands, prompts, coding-guidelines, project.json) — produce a file list with byte counts. See ./subtasks/03-read-everything-build-memory/ss-01-inventory-lovable.md.
2. Read every top-level `.lovable/*.md` file plus `.lovable/coding-guidelines/coding-guidelines.md` and record CODE-RED rules, hard caps, and naming conventions verbatim.
3. Walk `spec/` breadth-first at depth 1; open every `00-overview.md` to build a section map (numbered folder → purpose one-liner). See ./subtasks/03-read-everything-build-memory/ss-02-spec-map.md.
4. Deep-read the coding, error-manage, database, and design-system spec trees (`spec/02-*`, `spec/03-*`, `spec/04-*`, `spec/07-*`, `spec/17-consolidated-guidelines/`) — every numbered file, not just overviews.
5. Deep-read the remaining spec trees (`spec/05`, `spec/06`, `spec/08`–`spec/16`, `spec/21`–`spec/24`) capturing anything that could affect UI, CLI, or update flows we already ship.
6. Read every file under `linters/` (golangci, phpcs, sonarqube, stylecop) and record which rules are enforced against generated code.
7. ✅ Read every script under `linter-scripts/` (top-level `.py`/`.sh` plus `tests/`) and note which ones run in CI and what they gate on. Output: `.lovable/memory/05c-linter-scripts.md`.
8. ✅ Read every file under `scripts/` (`fix-repo/`, `visibility-change/`, root `fix-repo.*`, `visibility-change.*`) and record the invariants those scripts enforce on the repo. Output: `.lovable/memory/05d-scripts.md`.
9. Write consolidated project memory: create `.lovable/memory/index.md` plus one focused file per domain (`01-code-red.md`, `02-naming.md`, `03-error-manage.md`, `04-design-system.md`, `05-linters-and-scripts.md`, `06-spec-map.md`, `07-lovable-folder-guide.md`). See ./subtasks/03-read-everything-build-memory/ss-03-memory-layout.md.
10. Update `mem://index.md` with pointers to the new `.lovable/memory/*.md` files and cross-link `.lovable/prompts/32-read-memory.md` so the "read memory" alias loads the new index first.

## Verification

- Every file listed in Step 1 appears in the notes for Steps 2–8 (no silent skips).
- `.lovable/memory/index.md` exists and lists every file created in Step 9.
- `mem://index.md` references at least one new `.lovable/memory/*.md` entry.
- Running the `read memory` prompt lands on the new index within one hop.
- No code files modified this turn (planning only).

## Appended from prior pending tasks

- `02-control-automation-redesign.md` — 50-step redesign, currently at Step 30/50. Continues independently; not folded into this plan.
