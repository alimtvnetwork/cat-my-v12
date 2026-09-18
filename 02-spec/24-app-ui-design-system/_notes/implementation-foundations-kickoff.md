---
title: Implementation foundations kick-off (plan 30 step 51)
slug: implementation-foundations-kickoff
plan: 30
step: 51
status: locked
---

# Implementation foundations kick-off

## Purpose

All 14 budget gates (typography, color, motion, elevation,
spacing/iconography, layout, tool ribbon, status strip, rule kinds,
selectors, undo, boundaries, perf, visual snapshots) are closed. Step 51
opens implementation by declaring the shared token contract, module
skeletons, and enforcement wiring that steps 52-90 will fill in. No
runtime code ships here; this file is the contract implementation must
satisfy.

## Token contract (single source)

- CSS tokens live in `src/styles.css` under `@theme` and the `.dark`
  mapping. No component defines its own token.
- Editor-scope aliases (`--ca-*`, `--elevation-*`, `--motion-*`,
  `--ease-*`, `--space-*`, `--icon-*`, `--text-hmi-*`, `--font-hmi-ui`,
  `--radius-md`) are declared once and referenced by name.
- Component code uses Tailwind utilities mapped to tokens or raw
  `var(--...)` in a `style` prop; never a hex, rgb, hsl, ms, or px
  literal in editor scope.

## Module skeletons (no runtime code, only shapes)

```
src/lib/editor/
  index.ts                 # barrel: re-exports store, selectors, types
  types.ts                 # Rule, RuleId, Program, EditorError, Result<T,E>
  geometry/
    index.ts               # barrel
    rect.ts                # hitTestRect, boundsOf, containsPoint
    polygon.ts             # hitTestPolygon, iou
    point.ts               # keypoint math
  store/
    index.ts               # createEditorStore + useEditorStore hook
    actions/
      rules.ts             # rule.create/delete/reorder/kind-switch
      shape.ts             # shape.transform/commit
      params.ts            # params.edit
      layout.ts            # layout.toggle
    reducers.ts            # discriminated union reducer
  selectors/
    index.ts               # selectVisibleRules, selectSelectedIds,
                           # selectHitTestIndex, selectHistoryCounts
  hit-test.ts              # rebuild(visibleUnlocked) -> HitIndex
  undo/
    ring.ts                # UNDO_CAPACITY = 50 FIFO
    coalesce.ts            # 400 ms params window, F-UNDO-02 exception
  persistence/
    serialize.ts           # serializeProgram(state): Program
    adapter.ts             # write(program): Result<void, EditorError>
  errors.ts                # E_UI_*, W_UI_*, I_UI_* codes + logger
```

```
src/components/editor/
  shell/                   # top bar, layout grid, error boundaries
  ribbon/                  # 5-chip kind picker (steps 52-53)
  rail/                    # right rail, Rule List, section headers
  canvas/                  # single <canvas> layer (steps 61-70)
  controller/              # per-kind param panels (steps 71-82)
  status/                  # 28 px status strip
  boundaries/              # EditorErrorBoundary, CanvasErrorBoundary,
                           # ControllerErrorBoundary
```

Barrels export public API only. Cross-layer imports follow the matrix in
`_notes/boundaries-budget-gate.md`.

## Enforcement wiring

- CI script `scripts/check-editor-budgets.sh` runs every G-\* regression
  guard from all 14 gates and fails on any non-empty result outside its
  declared allowlist.
- Guards are grouped by gate file; each gate note lists its guards with
  expected empty/non-empty status at each implementation step.
- Playwright visual runner (step 97) reads the 10 VS-IDs from
  `_notes/visual-snapshots-budget-gate.md`; no ad-hoc surfaces.
- Perf runner (step 95) enforces the 16 ms frame with slice attribution
  from `_notes/perf-budget-gate.md`.

## Logging contract

- All editor codes live in `src/lib/editor/errors.ts` as a frozen union:
  `I_UI_*` info, `W_UI_*` warn, `E_UI_*` error.
- Every log line carries `correlation_id`, plus code-specific fields
  declared in `07-errors-logging.md`.
- No `console.log` in editor scope; use `logger.info/warn/error` from
  `errors.ts`. Guard `G-LOG-01: rg 'console\.' src/components/editor
src/lib/editor` must be empty.

## Step-by-step opening moves (52-55 outline, non-binding)

- 52: shell grid + top bar shell (layout gate).
- 53: tool ribbon chips wired to `rules.kind-switch` action.
- 54: right rail scaffold with Rule List (empty state + row).
- 55: status strip scaffold with log-code left slot.

Each of 52-55 lands its own guards from the relevant gate as green.

## Budget

- Editor library layers: 7 (matches boundaries gate).
- Public barrels: 4 (`lib/editor`, `lib/editor/geometry`,
  `lib/editor/store`, `lib/editor/selectors`).
- Logging entry points: 1 (`errors.ts` logger).
- Token sources: 1 (`src/styles.css`).
- CI budget-check scripts: 1 (`scripts/check-editor-budgets.sh`).

## Regression guards

```bash
# G-FOUND-01: no console.* in editor scope
rg -nE "console\.(log|warn|error|info)" src/components/editor src/lib/editor 2>/dev/null

# G-FOUND-02: token sources centralized
rg -l "@theme" src/

# G-FOUND-03: editor library barrel exists
test -f src/lib/editor/index.ts && echo ok

# G-FOUND-04: CI budget script exists
test -f scripts/check-editor-budgets.sh && echo ok
```

Expected: G-FOUND-01 empty from step 52+; G-FOUND-02 lists only
`src/styles.css`; G-FOUND-03..04 print `ok` when step 51 physical files
land (they may be placeholders at first).

## Decision

Foundations are frozen: one token source, 7-layer library skeleton with
4 public barrels, one logger, one CI budget script. Steps 52-60 (shell
implementation) may proceed against this contract.
