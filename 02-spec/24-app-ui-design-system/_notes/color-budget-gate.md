---
title: Color budget gate (plan 30 step 37)
slug: color-budget-gate
plan: 30
step: 37
status: locked
---

# Color budget gate

## Purpose

Freeze the color token surface for editor scope. Typography (step 36) is
locked; without a matching color lock the motion / elevation gates and
every region gate would inherit an open palette and could re-open
decisions already made in `_notes/foundations-color-delta.md`.

## Allowed token set

Exactly the 16 `--ca-*` semantic tokens plus the 8-step `--radius*` scale
already live in `src/styles.css`. No additions without a spec v1.1 bump.

### Semantic surfaces (8)

`--ca-bg`, `--ca-panel`, `--ca-panel-2`, `--ca-border`, `--ca-chrome`,
`--ca-chrome-ink`, `--ca-viewport`, `--ca-scrim`.

### Ink (2)

`--ca-ink`, `--ca-ink-muted`.

### Status (3)

`--ca-ok`, `--ca-ng`, `--ca-warn`.

### Brand + interaction (3)

`--ca-primary`, `--ca-select`, `--ca-focus-ring`.

Total: **16 semantic tokens**.

## Consumption rules

- Every editor color use MUST resolve to `var(--ca-*)` (directly or via
  the shadcn `--color-*` aliases mapped in `@theme inline`).
- No raw `#hex`, `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`, or
  `oklch(...)` in `src/components/**` or `src/routes/**`.
- No Tailwind palette utilities (`bg-red-500`, `text-blue-600`,
  `border-gray-200`, etc.) in editor scope. Only semantic utilities
  bound to `--ca-*` / `--color-*`.
- No arbitrary color utilities: `bg-[#123]`, `text-[hsl(...)]`.
- No `currentColor` overrides in editor scope; color flows from the
  parent token.

## Dark mode

Every `--ca-*` token has a `.dark` value in `src/styles.css`. The gate is
satisfied by that mapping alone; individual components MUST NOT branch
on `[data-theme]` or `.dark` to pick a hardcoded color.

## Budget

- Semantic tokens: 16 (locked at spec v1.0).
- Raw color literals in editor scope: 0.
- Tailwind palette utilities in editor scope: 0.

## Regression guards

Step 51+ implementation gate MUST pass all four:

```bash
# G-COLOR-01: no raw color literals in editor scope
rg -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" \
  src/components src/routes

# G-COLOR-02: no Tailwind palette utilities in editor scope
rg -nE "\b(bg|text|border|ring|from|to|via|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+" \
  src/components src/routes

# G-COLOR-03: no arbitrary color utilities in editor scope
rg -nE "(bg|text|border|ring|fill|stroke)-\[#" src/components src/routes

# G-COLOR-04: no .dark or [data-theme] branching outside src/styles.css
rg -n "\\.dark\\s|data-theme" src/components src/routes
```

Expected output: empty for all four. Any hit blocks the gate.

## Decision

Color palette is frozen at 16 semantic tokens with the existing dark
mapping. Step 38 (motion budget gate) may proceed.
