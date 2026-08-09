# Plan 35 UI/UX Photoshop layers overhaul, read phase

Slug: plan35-photoshop-layers-read-phase
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Plan 35 (`35-ui-ux-photoshop-layers-overhaul.md`) has been pending while the Plan 29 chain and Plan 32 chain took priority. This slice is the read-only kickoff: baseline the current layers UI, capture the target Photoshop-style contract, and produce the executable-slice pointer. No code changes. Files touched (read-only): `src/routes/**/layers*`, `src/components/layers/*`, `src/lib/layers*`, spec entries for layers UI. No new commands or issues this turn.

## Steps

1. Read Plan 35 end to end and any subtasks under `.lovable/plans/subtasks/35-*`; grep `spec/` for "layers", "photoshop", "layer panel"; write `.lovable/memory/v2/plan35/00-baseline.md` capturing scope, current behavior, references.
2. Inventory current layers UI: `rg -n 'Layer' src/components/ src/lib/` and route files matching `layers`; record path:line entries for components, hooks, state store, and drag-drop handlers in `.lovable/memory/v2/plan35/10-ui-inventory.md`.
3. Inventory current layers state model (shape, mutations, persistence): record types + reducer/store entries in `.lovable/memory/v2/plan35/15-state-inventory.md` with file:line references.
4. Define target Photoshop-style contract: visibility toggle, opacity slider, blend mode, group/nest, lock, drag-reorder, keyboard shortcuts; write `.lovable/memory/v2/plan35/20-target-contract.md` with a landed-vs-target matrix citing rows from `10-ui-inventory.md` and `15-state-inventory.md`. See ./subtasks/56-plan35-photoshop-layers-read-phase/SS-01-target-contract.md.
5. Produce the next executable slice pointer: write `.lovable/memory/v2/plan35/25-read-phase-summary.md` naming the top 3 gaps (blast radius asc), proposed slice ordering, and the plan slug to spin next. Leave Plan 35 `Status: pending`; verify `git diff --stat` shows only the four memo files.

## Verification

- Four memo files exist under `.lovable/memory/v2/plan35/` (00, 10, 15, 20, 25).
- `00-baseline.md` cites parent plan + any spec references found by grep.
- `10-ui-inventory.md` and `15-state-inventory.md` list every file:line touched by layer code, matching `rg -n` results.
- `20-target-contract.md` has an explicit landed-vs-target matrix.
- `25-read-phase-summary.md` names the next slice plan slug.
- `git diff --stat` limited to `.lovable/memory/v2/plan35/*` only (no src/ or spec/ changes).

## Appended from prior pending tasks

- First read-phase slice for Plan 35. Plan 35 stays pending; execution slices to follow.
- Plans 29, 33, 47-52 chain (Plan 52 closes it) and Plans 32, 53-55 chain (Plan 55 closes it) continue on their own tracks.
- Unrelated pending plans (36-46) untouched.
