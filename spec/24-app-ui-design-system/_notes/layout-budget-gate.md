---
title: Layout budget gate (plan 30 step 41)
slug: layout-budget-gate
plan: 30
step: 41
status: locked
---

# Layout budget gate

## Purpose

Freeze the editor shell layout so region gates (42+) compose against a
fixed grid. All visual primitives are locked (steps 36-40); this gate
turns them into a deterministic frame at 1440x900 and 1024x768.

## Shell grid

Fixed frame, no floating panels, no user-resizable rails at v1.0.

```text
+---------------------------------------------------------+
|                    Top bar (48 px)                      |
+------+-------------------------------------+------------+
|      |                                     |            |
| Tool |                                     |  Right     |
| rib  |            Canvas                   |  rail      |
| (56) |            (flex)                   |  (320 px)  |
|      |                                     |            |
|      |                                     |            |
+------+-------------------------------------+------------+
|                    Status strip (28 px)                 |
+---------------------------------------------------------+
```

### Region sizes

| Region       | Axis   | Value          | Locked |
| ------------ | ------ | -------------- | ------ |
| Top bar      | height | `48px`         | v1.0   |
| Tool ribbon  | width  | `56px`         | v1.0   |
| Right rail   | width  | `320px`        | v1.0   |
| Status strip | height | `28px`         | v1.0   |
| Canvas       | both   | remaining flex | v1.0   |

All values MUST reference spacing tokens or a single sizing constant per
region. No arbitrary Tailwind (`h-[48px]`, `w-[320px]`) in editor scope.

## Breakpoints

Two supported viewports; no others at v1.0.

| Name      | CSS width   | Use               |
| --------- | ----------- | ----------------- |
| `wide`    | >= 1440px   | primary target    |
| `compact` | 1024-1439px | supported minimum |

Behaviour differences:

- Tool ribbon width, right rail width, top bar height, status strip
  height are identical across both breakpoints.
- Right rail section headers switch from `--text-hmi-header` at `wide` to
  `--text-hmi-body` at `compact`.
- Below 1024px: shell renders a single `min-viewport-unsupported`
  message. No mobile layout.

## Overflow and scrolling

- Top bar, tool ribbon, status strip: never scroll.
- Right rail: vertical scroll only, no horizontal. Scrollbar consumes 0
  additional width (overlay scrollbar via `overflow-y: overlay` fallback
  to `auto`).
- Canvas: pan/zoom, no browser scroll.

## Consumption rules

Editor scope (`src/components/editor/**`, `src/routes/setup*.tsx`):

- No absolute positioning at shell level. Absolute only inside a canvas
  overlay or a popover.
- No `position: fixed` in editor scope. Modals use the shell overlay
  slot at `--elevation-3`.
- No CSS `grid-template-columns`/`-rows` with arbitrary pixel values;
  use the shell layout component that reads region tokens.

## Budget

- Region sizes: 5 (locked).
- Breakpoints: 2 (locked).
- Absolute/fixed positioning outside canvas + popovers: 0.
- Arbitrary shell dimensions in editor scope: 0.

## Regression guards

```bash
# G-LAYOUT-01: no arbitrary shell dimensions
rg -nE "(w|h|min-w|min-h|max-w|max-h)-\[[0-9]+px\]" \
  src/components/editor src/routes/setup*.tsx

# G-LAYOUT-02: no position: fixed in editor scope
rg -nE "position:\s*fixed|\\bfixed\\b\\s+(top|bottom|left|right)-" \
  src/components/editor src/routes/setup*.tsx

# G-LAYOUT-03: no arbitrary grid templates
rg -nE "grid-(cols|rows)-\\[|gridTemplate(Columns|Rows)" \
  src/components/editor src/routes/setup*.tsx
```

Expected: empty for all three.

## Decision

Shell grid frozen: 48/56/flex/320/28 across 2 breakpoints. Step 42 (tool
ribbon budget gate) may proceed.
