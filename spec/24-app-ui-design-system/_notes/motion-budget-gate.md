---
title: Motion budget gate (plan 30 step 38)
slug: motion-budget-gate
plan: 30
step: 38
status: locked
---

# Motion budget gate

## Purpose

Freeze the motion token surface for editor scope. `_notes/motion-tokens.md`
already drafted the tokens; the gate step closes the set and wires
regression guards so canvas gestures, right-rail collapses, and toasts do
not re-invent easings and durations.

## Allowed token set

### Duration (4)

`--motion-instant` (`0ms`), `--motion-fast` (`120ms`), `--motion-base`
(`200ms`), `--motion-slow` (`320ms`).

### Easing (4)

`--ease-standard`, `--ease-emphasized`, `--ease-in`, `--ease-out`.

Total: **8 motion tokens**.

## Consumption rules

- Every `transition-duration`, `animation-duration`, and Tailwind
  `duration-*` in editor scope MUST resolve to `var(--motion-*)`.
- Every `transition-timing-function` / `animation-timing-function` /
  Tailwind `ease-*` in editor scope MUST resolve to `var(--ease-*)`.
- No raw `Nms` or `Ns` literals in `src/components/**` or `src/routes/**`.
- No inline `cubic-bezier(...)` anywhere in components or routes.
- No arbitrary Tailwind durations: `duration-[150ms]` is banned.

## Canvas exception

Per-frame RAF animations (pan inertia, zoom inertia, drag preview) do NOT
consume these tokens; they are governed by the 16 ms budget in
`03-canvas.md`. This exception is scoped to
`src/components/editor/canvas/**` files that own the RAF loop. Any other
canvas child (toolbars, badges) still uses the tokens.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` at the shell root MUST collapse
all four duration tokens to `--motion-instant`. Easings are unchanged
(they run instantly regardless of curve). Owned by step 51+ shell impl.

## Budget

- Duration tokens: 4 (locked).
- Easing tokens: 4 (locked).
- Raw `ms` / `s` / `cubic-bezier(...)` in editor scope: 0.
- Arbitrary Tailwind durations in editor scope: 0.

## Regression guards

Step 51+ implementation gate MUST pass all four:

```bash
# G-MOTION-01: no raw ms literals in editor scope
rg -nE "\b[0-9]+ms\b" src/components src/routes

# G-MOTION-02: no raw cubic-bezier in editor scope
rg -n "cubic-bezier" src/components src/routes

# G-MOTION-03: no arbitrary duration utilities in editor scope
rg -nE "duration-\[[0-9]+" src/components src/routes

# G-MOTION-04: no raw second literals in editor scope
rg -nE "(transition|animation)[^\"']*\b[0-9]+(\.[0-9]+)?s\b" \
  src/components src/routes
```

Expected output: empty for all four (canvas RAF files may hit G-MOTION-01
via `requestAnimationFrame` timing math, which is a numeric budget not a
CSS duration; the guard MUST be tuned to CSS/style contexts at step 66
canvas impl or accepted with a scoped allowlist).

## Decision

Motion tokens frozen at 4 durations + 4 easings with reduced-motion
mapping. Step 39 (elevation budget gate) may proceed.
