# Plan 36 UI app shell and src v3 port, read phase

Slug: plan36-app-shell-src-v3-read-phase
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Plan 36 (`36-ui-app-shell-and-src-v3-port.md`) has been pending. This is the read-only kickoff: baseline the current app shell, inventory src v3 targets, produce a landed-vs-target matrix and a next-slice pointer. No code changes. Files (read-only): `src/routes/__root.tsx`, `src/components/app-shell/*` (if any), any `src-v3/` reference folder, spec entries for app shell. No new commands or issues this turn.

## Steps

1. Read Plan 36 end to end + any subtasks under `.lovable/plans/subtasks/36-*`; grep `spec/` for "app shell", "src v3", "chrome"; write `.lovable/memory/v2/plan36/00-baseline.md` with scope, current chrome behavior, spec references.
2. Inventory current app shell: `rg -n 'AppShell|Header|Footer|Sidebar' src/routes/ src/components/`; record path:line entries for shell components, layout routes, provider wrappers in `.lovable/memory/v2/plan36/10-shell-inventory.md`.
3. Inventory src v3 port targets: list every file/folder under `src-v3/` (or wherever the reference lives per Plan 36) with a mapping to its target path in `src/`; capture in `.lovable/memory/v2/plan36/15-v3-inventory.md`. See ./subtasks/60-plan36-app-shell-src-v3-read-phase/SS-01-v3-mapping.md.
4. Produce landed-vs-target matrix: for each shell capability (nav, header, footer, sidebar, breadcrumbs, theming, responsive breakpoints, keyboard shortcuts), record current-state + target-state citing rows from `10-shell-inventory.md` and `15-v3-inventory.md`; write `.lovable/memory/v2/plan36/20-target-matrix.md`.
5. Write `.lovable/memory/v2/plan36/25-read-phase-summary.md`: top 3 gaps (blast radius asc), proposed slice ordering, next-slice plan slug. Leave Plan 36 `Status: pending`; verify `git diff --stat` shows only the five memo files.

## Verification

- Five memo files exist under `.lovable/memory/v2/plan36/` (00, 10, 15, 20, 25).
- `10-shell-inventory.md` and `15-v3-inventory.md` list every file:line, matching `rg -n` output.
- `20-target-matrix.md` has an explicit landed-vs-target matrix.
- `25-read-phase-summary.md` names the next-slice plan slug + top 3 gaps.
- `git diff --stat` limited to `.lovable/memory/v2/plan36/*` (no src/ or spec/ changes).

## Appended from prior pending tasks

- First read-phase slice for Plan 36. Plan 36 stays pending; execution slices to follow.
- Plans 29/33/47-52 chain (Plan 52 closes), Plans 32/53-55 chain (Plan 55 closes), Plans 35/56-59 chain (Plan 59 closes) continue.
- Unrelated pending plans (37-46) untouched.
