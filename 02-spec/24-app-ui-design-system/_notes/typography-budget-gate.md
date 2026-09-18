---
title: Typography budget gate (plan 30 step 36)
slug: typography-budget-gate
plan: 30
step: 36
status: locked
---

# Typography budget gate

## Purpose

Lock the closed set of typography tokens the editor UI is allowed to use,
so downstream budget gates (color, motion, elevation, spacing) can cite a
frozen ramp instead of an open one. Locks `_notes/typography-size-tokens.md`
as the authoritative source.

## Allowed token set

Exactly 7 size tokens. No aliases, no new tokens without a spec bump.

| Token                | Tailwind utility   | Intended use                     |
| -------------------- | ------------------ | -------------------------------- |
| `--text-hmi-title`   | `text-hmi-title`   | title bar, uppercase labels      |
| `--text-hmi-header`  | `text-hmi-header`  | panel headings, action headers   |
| `--text-hmi-body`    | `text-hmi-body`    | labels, forms, table cells       |
| `--text-hmi-tile`    | `text-hmi-tile`    | tool tile labels                 |
| `--text-hmi-counter` | `text-hmi-counter` | numeric readouts, large counters |
| `--text-hmi-badge`   | `text-hmi-badge`   | status badges                    |
| `--text-hmi-caption` | `text-hmi-caption` | helper text, captions            |

## Family and weight

- Family: single UI family, resolved from `--font-hmi-ui` in
  `src/styles.css`. No new `font-family` declarations in editor code.
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold). No
  100/200/300/800/900 weights in editor UI.
- Italic: disallowed in editor UI. Reserved for prose docs only.

## Line-height and tracking

- Line-height: use Tailwind defaults; no per-utility overrides.
- Letter-spacing: only `tracking-wide` (or the equivalent token) permitted,
  and only on `--text-hmi-title` uppercase labels.

## Disallowed in editor scope

The following are hard-banned inside `src/components/editor/**` and
`src/routes/setup*.tsx`:

- Raw Tailwind size utilities: `text-xs`, `text-sm`, `text-base`,
  `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`.
- Arbitrary size utilities: `text-[13px]`, `text-[1rem]`, etc.
- Inline `style={{ fontSize: ... }}`.
- Any `font-family` other than `--font-hmi-ui`.

Existing shadcn primitives outside `src/components/editor/**` are out of
scope (they may still ship raw utilities).

## Budget

- Size tokens: 7 (locked at v1.0). Adding an 8th requires a spec v1.1 bump.
- Weight variants: 4 (locked).
- Italic variants: 0.
- Family variants: 1.

## Regression guards

Step 51+ implementation gate MUST pass all three:

```bash
# G-TYPO-01: no raw size utilities in editor scope
rg -n "\\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\\b" \
  src/components/editor src/routes/setup.tsx \
  src/routes/setup.roi.tsx src/routes/setup.reference.tsx

# G-TYPO-02: no arbitrary size utilities in editor scope
rg -n "text-\\[[0-9]" src/components/editor src/routes/setup*.tsx

# G-TYPO-03: no inline font-family or fontSize in editor scope
rg -n "fontSize|font-family" src/components/editor src/routes/setup*.tsx
```

Expected output: empty for all three. Any hit blocks the gate.

## Decision

Typography ramp is frozen at the 7 tokens above with 4 weights, 1 family,
0 italic variants. Step 37 (color budget gate) may proceed.
