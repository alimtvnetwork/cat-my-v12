# Deep-Dive: Elevation / Shadow Tokens (Plan 30 Step 24)

**Version:** 1.0  
**Updated:** 2026-07-14  
**Depends on:** `01-foundations.md`, `_notes/foundations-color-delta.md` (gap #7).  
**Blocks:** step 78 visual-regression suite.

---

## Semantic elevation scale landed in `src/styles.css`

| Token           | Backed by              | Use                                                   |
| --------------- | ---------------------- | ----------------------------------------------------- |
| `--elevation-0` | `none`                 | Flat surfaces, in-flow content, canvas viewport       |
| `--elevation-1` | `--shadow-hmi-panel`   | Resting panels, left nav, right rail, cards           |
| `--elevation-2` | `--shadow-hmi-popover` | Popovers, dropdowns, tooltips, kind picker menu       |
| `--elevation-3` | `--shadow-hmi-modal`   | Modals, drawers, confirmation dialogs                 |
| `--elevation-4` | `--shadow-hmi-glow`    | Focus/selection halo on canvas + rule list active row |

The underlying `--shadow-hmi-*` primitives remain as low-level tokens; components MUST consume the semantic `--elevation-*` alias instead, so future palette changes to the raw shadows automatically propagate.

---

## Usage rules

1. Never write raw `box-shadow: 0 ... oklch(...)` in components. Consume `var(--elevation-N)`.
2. Layering order matches the number: 0 flat → 4 top. Do not compose two elevation tokens on the same element.
3. Selection halo on canvas shapes uses `--elevation-4` at full opacity; hover halo uses `--elevation-4` with `opacity: 0.6`. Both are handled in the canvas layer, not in shape components.
4. Modal scrim uses `--ca-scrim` for the backdrop and `--elevation-3` for the dialog surface. No exception.

## Interaction with visual-regression suite (`08-testing.md`)

Stable elevation tokens are a prerequisite for the visual-diff gate (`maxDiffPixelRatio: 0.01` at 1440×900 and 1024×768). Any change to a `--shadow-hmi-*` primitive now cascades deterministically through the four semantic layers, so a single palette bump does not shift dozens of snapshots individually.

## Regression guards (added on top of foundations-delta + motion guards)

- `rg -n "box-shadow:" src/components src/routes` → each hit must resolve to `var(--elevation-*)` (or `none`).
- `rg -n "--shadow-hmi-" src/components src/routes` → 0 hits (components must go through `--elevation-*`).
