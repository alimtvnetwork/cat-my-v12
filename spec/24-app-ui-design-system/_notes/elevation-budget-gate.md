---
title: Elevation budget gate (plan 30 step 39)
slug: elevation-budget-gate
plan: 30
step: 39
status: locked
---

# Elevation budget gate

## Purpose

Freeze the elevation token surface for editor scope. Color (37) and
motion (38) are locked; elevation is the last visual primitive before
layout/spacing gates can compose them. Draft lives at
`_notes/elevation-tokens.md`; this gate closes the set and wires guards.

## Allowed token set

Exactly 5 semantic elevation tokens.

| Token           | Use                                                   |
| --------------- | ----------------------------------------------------- |
| `--elevation-0` | flat, in-flow, canvas viewport                        |
| `--elevation-1` | resting panels, cards, left nav, right rail           |
| `--elevation-2` | popovers, dropdowns, tooltips, kind picker            |
| `--elevation-3` | modals, drawers, confirmation dialogs                 |
| `--elevation-4` | focus/selection halo on canvas + rule list active row |

Underlying `--shadow-hmi-*` primitives are internal; editor scope MUST
consume the semantic `--elevation-*` alias only.

## Consumption rules

- Every `box-shadow` in editor scope MUST resolve to `var(--elevation-N)`
  or `none`. No raw `0 Npx Mpx rgba(...)` values.
- No composition: at most one elevation token per element.
- Selection halo on canvas shapes: `--elevation-4` at full opacity.
  Hover halo: `--elevation-4` at `opacity: 0.6`. Both handled in the
  canvas layer, not per-shape components.
- Modal scrim uses `--ca-scrim` for backdrop + `--elevation-3` for the
  dialog surface. No exception.
- No arbitrary Tailwind shadows in editor scope: `shadow-[0_4px_12px_...]`
  is banned. Semantic Tailwind aliases bound to `--elevation-*` are OK.

## Z-index

Layering order is the elevation number, 0 (flat) up to 4 (top). Editor
scope MUST NOT set arbitrary `z-index: N` values; use the ordinal via
the semantic Tailwind utilities that bind to `--elevation-*` layers, or
add a new named z ordinal via a spec v1.1 bump.

## Budget

- Elevation tokens: 5 (locked).
- Raw `box-shadow` literals in editor scope: 0.
- Arbitrary Tailwind shadows in editor scope: 0.
- Direct `--shadow-hmi-*` consumption in editor scope: 0.
- Composed elevation (two tokens on one element): 0.

## Regression guards

Step 51+ implementation gate MUST pass all four:

```bash
# G-ELEV-01: no raw box-shadow literals in editor scope
rg -nE "box-shadow:\s*[^v]" src/components src/routes \
  | rg -v "box-shadow:\s*none"

# G-ELEV-02: no direct --shadow-hmi-* consumption in editor scope
rg -n "--shadow-hmi-" src/components src/routes

# G-ELEV-03: no arbitrary Tailwind shadows in editor scope
rg -nE "shadow-\[" src/components src/routes

# G-ELEV-04: no arbitrary z-index in editor scope
rg -nE "z-\[[0-9]+\]|z-index:\s*[0-9]+" src/components src/routes
```

Expected output: empty for all four. Any hit blocks the gate.

## Decision

Elevation frozen at 5 tokens with a single-composition rule and 4 guards.
Step 40 (spacing + iconography budget gate) may proceed.
