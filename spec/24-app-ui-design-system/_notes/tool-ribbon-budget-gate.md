---
title: Tool ribbon budget gate (plan 30 step 42)
slug: tool-ribbon-budget-gate
plan: 30
step: 42
status: locked
---

# Tool ribbon budget gate

## Purpose

Freeze the tool ribbon geometry, chip set, and keyboard model so canvas
overlays and status strip can compose against a fixed left edge. The
ribbon is the editor's highest-traffic surface and must remain
deterministic across breakpoints.

## Geometry

- Ribbon width: `56px` (from layout gate). Fixed at both breakpoints.
- Chip size: `40px x 40px` (`--space-10` square).
- Chip gap: `--space-2` (`8px`).
- Chip radius: `--radius-md`.
- Padding: `--space-2` top and bottom, `--space-2` left/right (chip is
  centered horizontally in the 56 px column).
- Ribbon elevation: `--elevation-1`.
- Chip elevation: `--elevation-0` at rest, `--elevation-2` on hover for
  the tooltip surface only (the chip itself does not lift).

## Chip set and order

Exactly 5 chips, in fixed order top-to-bottom:

1. `C` - Compare
2. `R` - Region
3. `K` - Keypoint
4. `S` - Shape
5. `E` - Expression (Math)

Order is locked at spec v1.0 and matches
`_notes/kind-picker-keyboard-model.md`. Adding a chip requires a spec
v1.1 bump and a new `K-KBD` acceptance row.

## Visual states

| State                  | Background     | Ink                                | Ring                                      |
| ---------------------- | -------------- | ---------------------------------- | ----------------------------------------- |
| resting                | `--ca-panel-2` | `--ca-ink-muted`                   | none                                      |
| hover                  | `--ca-panel`   | `--ca-ink`                         | none                                      |
| focus                  | `--ca-panel-2` | `--ca-ink`                         | `--ca-focus-ring` at `--elevation-4` glow |
| active (selected kind) | `--ca-select`  | `--ca-chrome-ink`                  | none                                      |
| disabled               | `--ca-panel-2` | `--ca-ink-muted` at `opacity: 0.4` | none                                      |

State transitions use `--motion-fast` with `--ease-standard`.

## Labels and tooltips

- Chip glyph: single uppercase letter, `--text-hmi-title`, weight 600.
- Icon: none in the chip itself (letter is the identity).
- Tooltip: appears after 500 ms hover, contains full kind name +
  primary keyboard shortcut. Tooltip surface uses `--elevation-2` and
  `--motion-base` for enter/exit.

## Keyboard model

Delegated in full to `_notes/kind-picker-keyboard-model.md`:

- `role="radiogroup"` with roving tabindex, single `0`, rest `-1`.
- Arrow Up/Down/Left/Right wrap and skip disabled.
- Home/End jump to first/last enabled.
- Enter/Space commit; same-kind is a no-op with no log/history.
- Typeahead `c/r/k/s/e` commits directly; disabled-typeahead logs
  `W_UI_KIND_DISABLED`.
- ESC restores trigger focus and logs `I_UI_KIND_PICKER_CANCELLED`.
- Real kind change fires `I_UI_RULE_KIND_CHANGED` and pushes exactly 1
  `rule.kind-switch` history entry.

## Consumption rules

Editor scope, ribbon files only:

- No arbitrary chip sizing (`w-[40px]`, `h-[40px]`).
- No inline `role="button"` on chips (must be `role="radio"` inside the
  `role="radiogroup"`).
- No `title` attribute for tooltip (use the shared tooltip primitive
  bound to `--elevation-2`).
- No per-chip color overrides. Colors flow from the state matrix above.

## Budget

- Chips: 5 (locked).
- Chip sizes: 1 (40x40).
- State variants: 5 (resting/hover/focus/active/disabled).
- Native `<select>` inside the ribbon: 0.
- Arbitrary chip dimensions in ribbon files: 0.

## Regression guards

```bash
# G-RIBBON-01: chip count and order stable (source-level assertion)
rg -n "RIBBON_KINDS\s*=\s*\[" src/components/editor/ribbon
# Expected: exactly one match; array literal is exactly ['C','R','K','S','E'].

# G-RIBBON-02: no arbitrary chip dimensions in ribbon files
rg -nE "(w|h)-\[[0-9]+" src/components/editor/ribbon

# G-RIBBON-03: no title tooltip fallback in ribbon files
rg -n "title=" src/components/editor/ribbon

# G-RIBBON-04: no <select> in ribbon files
rg -n "<select" src/components/editor/ribbon
```

Expected: G-RIBBON-01 = 1 match with the literal `['C','R','K','S','E']`;
G-RIBBON-02..04 empty.

## Decision

Ribbon frozen: 5 chips C/R/K/S/E at 40x40 with 5 state variants and full
keyboard delegation. Step 43 (status strip budget gate) may proceed.
