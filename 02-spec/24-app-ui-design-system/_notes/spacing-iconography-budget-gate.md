---
title: Spacing + iconography budget gate (plan 30 step 40)
slug: spacing-iconography-budget-gate
plan: 30
step: 40
status: locked
---

# Spacing + iconography budget gate

## Purpose

Freeze the last two token categories that block layout gates (41+).
Iconography rides with spacing because icon sizing and stroke width are
derivatives of the same 4 px base grid.

## Spacing

### Allowed set

4 px base grid, closed 8-step scale plus `0`.

| Token        | Value  |
| ------------ | ------ |
| `--space-0`  | `0`    |
| `--space-1`  | `4px`  |
| `--space-2`  | `8px`  |
| `--space-3`  | `12px` |
| `--space-4`  | `16px` |
| `--space-5`  | `20px` |
| `--space-6`  | `24px` |
| `--space-8`  | `32px` |
| `--space-10` | `40px` |

Tailwind utilities generated from these tokens: `p-0..p-10`, `m-0..m-10`,
`gap-0..gap-10` at the same numeric steps.

### Consumption rules

Editor scope (`src/components/editor/**`, `src/routes/setup*.tsx`):

- No arbitrary spacing: `p-[13px]`, `m-[1.25rem]`, `gap-[7px]` banned.
- No off-grid Tailwind steps: `p-7`, `p-9`, `p-11..p-96` banned.
- No inline `style={{ padding | margin | gap: ... }}` for layout.
- Row heights are always a spacing token, not a hardcoded height.

### Budget

- Spacing tokens: 9 (locked, spec v1.0).
- Arbitrary spacing utilities in editor scope: 0.
- Off-grid steps in editor scope: 0.

## Iconography

### Allowed set

Fixed icon set: **lucide-react** only. No inline SVG in editor scope
except for canvas rendering primitives (rects, polygons) inside
`src/components/editor/canvas/**`.

### Sizes

Exactly 4 icon sizes, all multiples of the 4 px grid.

| Token       | Value  | Use                             |
| ----------- | ------ | ------------------------------- |
| `--icon-sm` | `12px` | dense chip / status strip       |
| `--icon-md` | `16px` | default: ribbon, inline, button |
| `--icon-lg` | `20px` | rail section headers            |
| `--icon-xl` | `24px` | canvas overlay badges           |

Stroke width: **1.5** for all sizes (lucide default is 2; overridden at
the icon wrapper). No per-icon stroke overrides.

### Consumption rules

- Every icon MUST be a lucide-react component.
- Every icon MUST consume `--icon-*` via the wrapper `<Icon size="md" />`
  (or the equivalent Tailwind utility). No `size={17}`, no `w-[13px]`.
- No emoji as icons.
- No third-party icon fonts.

### Budget

- Icon libraries: 1 (lucide-react).
- Icon sizes: 4 (locked).
- Stroke widths: 1 (1.5).
- Inline SVG outside canvas: 0.

## Regression guards

Step 51+ implementation gate MUST pass all six:

```bash
# G-SPACE-01: no arbitrary spacing utilities in editor scope
rg -nE "(p|m|gap|space-x|space-y|inset)-\[" src/components/editor src/routes/setup*.tsx

# G-SPACE-02: no off-grid Tailwind spacing in editor scope
rg -nE "\b(p|m|gap)-(7|9|11|13|14|15)\b" src/components/editor src/routes/setup*.tsx

# G-SPACE-03: no inline padding/margin/gap in editor scope
rg -nE "style=\{\{[^}]*(padding|margin|gap)" src/components/editor src/routes/setup*.tsx

# G-ICON-01: no non-lucide icon imports in editor scope
rg -n "from ['\"](react-icons|@heroicons|@radix-ui/react-icons|@fortawesome" src/components/editor src/routes/setup*.tsx

# G-ICON-02: no inline SVG outside canvas
rg -n "<svg" src/components/editor src/routes/setup*.tsx \
  | rg -v "src/components/editor/canvas/"

# G-ICON-03: no arbitrary icon sizing in editor scope
rg -nE "(w|h)-\[[0-9]" src/components/editor src/routes/setup*.tsx
```

Expected output: empty for all six. Any hit blocks the gate.

## Decision

Spacing frozen at a 9-step 4 px grid; iconography frozen at lucide-react
with 4 sizes and a single 1.5 stroke width. Six regression guards
G-SPACE-01..03 + G-ICON-01..03. Step 41 (layout budget gate) may proceed.
