---
title: Selectors budget gate (plan 30 step 45)
slug: selectors-budget-gate
plan: 30
step: 45
status: locked
---

# Selectors budget gate

## Purpose

Freeze the selection model that joins the canvas, Rule List, Rule
Controller, and status strip. Rule kinds are closed at C/R/K/S/E, so this
gate locks which objects can be selected, how selection is represented,
and which source owns each gesture.

## Selection state

Canonical store field: `selection: RuleId[]` in stack order, with ids
only. Components never store selected `Rule` objects or duplicate
selection booleans.

| Mode   | Shape     | Controller  | Source gestures                          |
| ------ | --------- | ----------- | ---------------------------------------- |
| none   | `[]`      | empty state | ESC, delete last selected, blank click   |
| single | `[id]`    | mounted     | canvas hit, Rule List click, draw commit |
| multi  | `[id...]` | unmounted   | Ctrl/Cmd+click, marquee, Ctrl/Cmd+A      |
| range  | `[id...]` | unmounted   | Shift+click over Rule List order         |

Selection ids MUST reference unlocked, visible rules except when the Rule
List explicitly targets a hidden rule row. Canvas hit-testing never selects
hidden rules and skips locked rules.

## Gesture ownership

| Gesture            | Owner           | Result                                      |
| ------------------ | --------------- | ------------------------------------------- |
| Canvas body click  | canvas hit-test | topmost hit becomes single selection        |
| Canvas blank click | canvas          | clears selection                            |
| Marquee            | canvas          | fully enclosed visible + unlocked rules     |
| Alt+click stack    | canvas hit-test | cycles topmost to next eligible rule        |
| Rule row click     | Rule List       | single selection, opens Controller          |
| Ctrl/Cmd+row click | Rule List       | toggle id, closes Controller when count > 1 |
| Shift+row click    | Rule List       | range over stack order, closes Controller   |
| Ctrl/Cmd+A         | active surface  | all visible + unlocked rules                |

Selection changes emit exactly one `I_UI_SELECTION_CHANGED` log line per
committed gesture with `count`, `source`, and `correlation_id`.

## Hit-test order

Canvas hit-test consumes the pure boundary from
`_notes/canvas-geometry-boundary.md`. Candidate rules are filtered in this
order: active program, visible, unlocked, valid shape, pointer hit. When
multiple candidates remain, the highest stack index wins. Alt+click cycles
through the same ordered candidate list without changing hidden or locked
rules.

## Focus and accessibility

- Canvas selection focus lands on the workspace root after a canvas
  gesture.
- Rule List selection focus lands on the selected row.
- Multi-select announces `N rules selected` through the shared live region.
- Controller mounts only for exactly one selected id and unmounts
  synchronously when the selection count changes away from one.

## Budget

- Store selection fields: 1 (`selection`).
- Selection modes: 4 (`none`, `single`, `multi`, `range`).
- Canvas hit-test eligibility filters: 4 (`program`, `visible`, `unlocked`,
  `valid shape`).
- Selection log lines per committed gesture: exactly 1.
- Component-local selected state: 0.

## Regression guards

```bash
# G-SELECT-01: no component-local selected id state in editor scope
rg -nE "useState\([^)]*selected|selectedRuleId|selectedIds" src/components/editor src/routes/setup*.tsx

# G-SELECT-02: selection stored only as ids, not rule objects
rg -nE "selection:\s*Rule\[|selectedRules\s*:" src/lib/editor src/components/editor

# G-SELECT-03: Rule Controller mounts only on exactly one id
rg -n "selection\.length === 1" src/components/editor src/lib/editor

# G-SELECT-04: canvas hit-test skips locked and hidden rules
rg -nE "locked|visible" src/components/editor/canvas src/lib/editor/hit-test.ts
```

Expected: G-SELECT-01..02 empty; G-SELECT-03 has at least one mount guard
when step 74 lands; G-SELECT-04 has both `locked` and `visible` filtering
when canvas selection lands.

## Decision

Selectors are frozen around one id-array store field, four modes, one log
line per committed gesture, and geometry-boundary hit-testing. Step 46
(undo budget gate) may proceed.
