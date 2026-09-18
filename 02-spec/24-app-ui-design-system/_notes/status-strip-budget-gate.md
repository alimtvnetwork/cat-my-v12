---
title: Status strip budget gate (plan 30 step 43)
slug: status-strip-budget-gate
plan: 30
step: 43
status: locked
---

# Status strip budget gate

## Purpose

Freeze the bottom status strip so it becomes a deterministic surface for
log codes, undo depth, and save state. Closes the shell perimeter after
top bar (layout gate), tool ribbon, canvas (`03-canvas.md`), and right
rail (`05-rule-controller.md`).

## Geometry

- Strip height: `28px` (from layout gate).
- Padding: `--space-1` top/bottom, `--space-3` left/right.
- Divider: 1 px `--ca-border` on top edge, no side dividers.
- Elevation: `--elevation-0` (in-flow, no shadow).
- Background: `--ca-chrome`. Ink: `--ca-chrome-ink`.
- Text: `--text-hmi-caption` for labels, `--text-hmi-badge` for codes.
- Font-variant-numeric: `tabular-nums` on every numeric slot so widths
  do not jitter as values change.

## Slot layout

Three regions, left / center / right, single row, no wrapping.

| Region | Content                                | Alignment  | Overflow              |
| ------ | -------------------------------------- | ---------- | --------------------- |
| left   | last log code (level chip + code text) | flex-start | truncate with tooltip |
| center | FPS badge (dev-only, `?debug=fps`)     | center     | hidden if not enabled |
| right  | undo depth + redo depth + save state   | flex-end   | never truncates       |

### Left: last log code

- Level chip: 12 px square using status colors: `--ca-ok`
  (`info`/`success`), `--ca-warn` (`warn`), `--ca-ng` (`error`).
- Code text: monospace, `--text-hmi-badge`, single line.
- On click: opens log console at `--elevation-3` scoped to the last 200
  entries. No inline expansion.

### Center: FPS badge

- Renders only when `?debug=fps` is present or a dev flag is set.
- Format: `NN fps` right-aligned with `tabular-nums`.
- Turns `--ca-warn` below 55 fps, `--ca-ng` below 30 fps.

### Right: undo / redo / save

- Undo depth: `Un/50` where `n` is the current stack size (ties to
  `_notes/undo-coalescing-fixtures.md` 50-entry ring).
- Redo depth: `Rn/50`.
- Save state: one of `Saved`, `Dirty`, `Saving...`. `Dirty` uses
  `--ca-warn`, others use `--ca-ink-muted`.

## Consumption rules

Editor scope, status-strip files only:

- No arbitrary heights (`h-[28px]`). Height reads from the layout
  region token.
- No inline `role` overrides on the strip container. The strip is a
  landmark `role="status"` region.
- No animations on numeric changes. Only `--motion-instant` for save
  state and undo depth updates (per `prefers-reduced-motion` collapse
  rule from the motion gate).
- No `title` attribute for tooltips. Use the shared tooltip primitive.

## Budget

- Slots: 3 (left/center/right, locked).
- Height variants: 1 (28 px).
- Log-level ink colors: 3 (`--ca-ok`, `--ca-warn`, `--ca-ng`).
- Save state values: 3 (`Saved`, `Dirty`, `Saving...`).
- Arbitrary dimensions in status-strip files: 0.

## Regression guards

```bash
# G-STATUS-01: no arbitrary heights in status-strip files
rg -nE "(h|min-h|max-h)-\[" src/components/editor/status

# G-STATUS-02: tabular-nums applied to every numeric slot
rg -n "tabular-nums" src/components/editor/status
# Expected: at least 3 hits (undo, redo, fps).

# G-STATUS-03: no title-attribute tooltips in status-strip files
rg -n "title=" src/components/editor/status

# G-STATUS-04: no motion tokens other than instant in status-strip files
rg -n "motion-(fast|base|slow)" src/components/editor/status
```

Expected: G-STATUS-01, G-STATUS-03, G-STATUS-04 empty; G-STATUS-02 >= 3.

## Decision

Status strip frozen: 3 slots, 1 height, 3 log-level inks, 3 save states.
Step 44 (rule kinds budget gate) may proceed.
