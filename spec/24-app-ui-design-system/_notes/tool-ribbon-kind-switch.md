---
title: Tool ribbon chips wired to kind-switch (plan 30 step 53)
slug: tool-ribbon-kind-switch
plan: 30
step: 53
status: locked
---

# Tool ribbon chips wired to kind-switch

## Purpose

Land the first interactive editor surface: the 5-chip tool ribbon
(C/R/K/S/E) mounted into the shell's `ribbon` slot from step 52, wired
to the store action `rules.kindSwitch`. This exercises the store action
boundary (boundaries gate), the closed kind matrix (kinds gate), and the
`rule.kind-switch` history entry (undo gate) end-to-end for the first
time.

## Target files (new)

```
src/components/editor/ribbon/
  ToolRibbon.tsx           # 5-chip radiogroup, keyboard model host
  RibbonChip.tsx           # single chip: state matrix + glyph
  index.ts                 # barrel: ToolRibbon, RibbonChip

src/lib/editor/store/actions/
  rules.ts                 # rules.kindSwitch(id, kind) action
  index.ts                 # barrel

src/lib/editor/errors.ts   # logger stub + code union (real impl)
```

`ToolRibbon` reads the currently selected rule via
`selectSelectedIds` + a single-selection derived selector (added
inline; formal `selectors/` barrel lands step 54). Renders disabled
state when `selection.length !== 1`.

## Chip contract (matches `_notes/tool-ribbon-budget-gate.md`)

- Order: `['C', 'R', 'K', 'S', 'E']` (frozen literal, guarded by
  G-RIBBON-01).
- Size 40x40, gap `--space-2`, radius `--radius-md`.
- 5 visual states with the locked color matrix; hover tooltip on
  `--elevation-2` after 500 ms.
- Single uppercase glyph, weight 600, `--text-hmi-title`.
- Full keyboard delegation to `_notes/kind-picker-keyboard-model.md`:
  `role="radiogroup"`, roving tabindex, arrow wrap-and-skip-disabled,
  Home/End, Enter/Space commit, `c/r/k/s/e` typeahead, ESC restore.

## Action contract

```ts
// src/lib/editor/store/actions/rules.ts
export type KindSwitchInput = { id: RuleId; kind: RuleKind };
export type KindSwitchResult =
  { ok: true; entry: HistoryEntry<"rule.kind-switch"> } | { ok: false; error: EditorError };

export function kindSwitch(input: KindSwitchInput): KindSwitchResult;
```

Rules:

- Same-kind commit is a no-op: returns `{ ok: true, entry: null }`
  variant (no log, no history push) - matches kinds gate.
- Incompatible shape triggers shape clear + emits
  `W_UI_SHAPE_CLEARED_ON_KIND_SWITCH`.
- Params always reset to kind defaults from
  `_notes/rule-kinds-budget-gate.md`.
- Successful switch pushes exactly 1 `rule.kind-switch` history entry
  (F-UNDO-04) and emits `I_UI_RULE_KIND_CHANGED` with `previousKind`,
  `nextKind`, `ruleId`, `correlation_id`.
- ESC on open picker without commit emits
  `I_UI_KIND_PICKER_CANCELLED` and returns focus.

## Store surface

For step 53 only, `useEditorStore` may be a thin Zustand skeleton
exposing:

- `selection: RuleId[]`
- `rules: Rule[]`
- `dispatch(action)` returning the discriminated `Result` matching the
  action shape (no `setState` calls from components).

Full store lands progressively across 54-60; step 53 wires just the
subset needed for chip commit.

## Logging

`src/lib/editor/errors.ts` ships the frozen union at step 53:
`I_UI_RULE_KIND_CHANGED`, `I_UI_KIND_PICKER_CANCELLED`,
`W_UI_SHAPE_CLEARED_ON_KIND_SWITCH`, `W_UI_KIND_DISABLED`, plus a
`logger` object with `.info / .warn / .error` methods that accept
`{ code, correlationId, ...fields }`. Guard G-LOG-01 (no
`console.*` in editor scope) applies from step 53 onward with a single
allowlisted line in `EditorErrorBoundary` from step 52.

## Acceptance for step 53

- 5 chips render in order C/R/K/S/E at 40x40, spacing `--space-2`,
  states verifiable in DOM: resting, hover, focus, active, disabled.
- Selecting a rule and pressing `R` on the ribbon changes its kind
  from `C` to `R`, clears the shape when incompatible, resets params to
  R defaults, and produces exactly one `I_UI_RULE_KIND_CHANGED` log
  line and one `rule.kind-switch` history entry.
- Same-kind commit (pressing `C` while on `C`) produces no log and no
  history entry.
- With `selection.length !== 1`, all chips render disabled, keyboard
  activation is a no-op, and `W_UI_KIND_DISABLED` fires at most once
  per attempted commit.
- Guards G-RIBBON-01..04, G-KIND-01..04, G-BOUND-02 (no direct
  setState) pass on new files.

## Regression guards (delta)

```bash
# G-RIBBON-05: chip commit routes through actions, not setState
rg -nE "useEditorStore\.setState\(|store\.setState\(" src/components/editor/ribbon

# G-RIBBON-06: exactly one kind-changed log per commit path
rg -n "I_UI_RULE_KIND_CHANGED" src/lib/editor/store/actions/rules.ts | wc -l

# G-LOG-01: no console.* in editor scope (allowlist: shell error boundary)
rg -nE "console\.(log|warn|error|info)" src/components/editor src/lib/editor
```

Expected: G-RIBBON-05 empty; G-RIBBON-06 == 1; G-LOG-01 empty except
the boundary allowlist entry.

## Decision

Tool ribbon is wired at 5 chips in fixed order, `rules.kindSwitch`
action returning discriminated `Result`, single kind-change log per
committed switch, same-kind no-op, incompatible-shape clear with warn,
and `selection.length !== 1` disable path. Step 54 (right rail scaffold)
may mount into the `rail` slot and start driving selection into the
ribbon.
