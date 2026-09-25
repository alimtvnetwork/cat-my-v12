---
title: Right rail scaffold + Rule List (plan 30 step 54)
slug: right-rail-rule-list
plan: 30
step: 54
status: locked
---

# Right rail scaffold + Rule List

## Purpose

Mount the right rail into the shell `rail` slot from step 52 and land
the Rule List as the first surface that drives selection into the
ribbon and (later) the controller. Closes the shell-slot triangle
(topBar / ribbon / rail) before canvas lands.

## Target files (new)

```
src/components/editor/rail/
  RightRail.tsx            # 320 px column host, section headers
  RuleList.tsx             # virtualized-ready list of RuleRow
  RuleRow.tsx              # single row: kind badge, name, hidden/lock
  RailSectionHeader.tsx    # locked typography, wide vs compact
  index.ts                 # barrel

src/lib/editor/store/actions/
  selection.ts             # selection.set, selection.toggle, selection.range
```

## Rail contract (matches `_notes/layout-budget-gate.md`)

- Width exactly 320 px, background `--ca-panel`, top-align sections,
  overlay scrollbar, no horizontal scroll.
- Section header typography: `--text-hmi-header` on `wide`,
  `--text-hmi-body` on `compact` (media-query break at 1440 px).
- Elevation `--elevation-1` on the rail root; sections use `--elevation-0`.
- `role="complementary"` landmark, `aria-label="Rule list"`.

## RuleRow contract

Left-to-right slots inside a 40 px row:

| Slot          | Width | Content                                                     |
| ------------- | ----- | ----------------------------------------------------------- |
| kind badge    | 24 px | single letter C/R/K/S/E in `--text-hmi-badge`               |
| name          | flex  | `--text-hmi-body`, ellipsize, respects locked/hidden styles |
| hidden toggle | 24 px | lucide `Eye` / `EyeOff` icon, `--icon-md`                   |
| locked toggle | 24 px | lucide `Lock` / `Unlock` icon, `--icon-md`                  |

Gap `--space-2`, padding `--space-2` horizontal / `--space-1` vertical.
Locked rows render name at `--ca-ink-muted`; hidden rows render the
entire row at opacity 0.6 (still selectable via rail, per selectors
gate).

## Selection wiring

Rail gestures dispatch through the new `selection` actions:

- Row click -> `selection.set([id])`, source `"rail-row"`.
- Ctrl/Cmd+row click -> `selection.toggle(id)`, source `"rail-toggle"`;
  closes controller (single-selection-only mount).
- Shift+row click -> `selection.range(id)`, source `"rail-range"`,
  computed over stack order not DOM order.
- Ctrl/Cmd+A while rail has focus -> `selection.set(visibleUnlocked)`,
  source `"rail-select-all"`.

Every committed gesture emits exactly one `I_UI_SELECTION_CHANGED` with
`count`, `source`, `correlation_id` (selectors gate). Hidden and locked
rows never appear in `Ctrl+A` output.

## Empty state

When `rules.length === 0`, rail body renders a single info card at
`--elevation-0`: `"No rules yet. Use the ribbon to add one."` in
`--text-hmi-body` + `--ca-ink-muted`. No CTA button in v1 (creation
lands via canvas draw at step 66).

## Focus and keyboard

- Rail body is `role="listbox"` on RuleList, rows are `role="option"`,
  roving tabindex.
- Arrow Up/Down move focus, Home/End jump ends, PageUp/PageDown jump 10.
- Enter commits selection to the focused row; Space toggles.
- Escape from rail focus returns focus to the shell body root.

## Acceptance for step 54

- Rail mounts at 320 px in the shell `rail` slot, section headers switch
  typography at 1440 px, empty state renders when the store has 0 rules.
- Selecting a row from a 3-rule fixture fires exactly one
  `I_UI_SELECTION_CHANGED` and enables the corresponding ribbon chip
  active state; ribbon disable path (`selection.length !== 1`) verified
  by Ctrl+click producing multi-select.
- Hidden and locked toggles dispatch layout actions and never mutate
  selection.
- Guards G-BOUND-02 (no `setState`), G-SELECT-01..02 (no local selected
  state, ids-only), G-LOG-01 (no `console.*`) pass on new files.

## Regression guards (delta)

```bash
# G-RAIL-01: rail width is token-locked, not arbitrary
rg -nE "w-\[[0-9]+px\]|width:\s*[0-9]+px" src/components/editor/rail

# G-RAIL-02: no local selection state in rail
rg -nE "useState[^)]*selected" src/components/editor/rail

# G-RAIL-03: hidden/locked toggles never dispatch selection actions
rg -n "selection\." src/components/editor/rail/RuleRow.tsx
```

Expected: G-RAIL-01 empty (rail width lives on the shell grid);
G-RAIL-02 empty; G-RAIL-03 empty in RuleRow toggle handlers.

## Decision

Rail is locked at 320 px, 4-slot 40 px rows with kind badge / name /
hidden / locked, three new selection actions (`set` / `toggle` / `range`),
listbox keyboard model, and one selection log per committed gesture.
Step 55 (status strip) may mount into the shell `status` slot and
consume the same log stream.
