---
title: Rule kinds budget gate (plan 30 step 44)
slug: rule-kinds-budget-gate
plan: 30
step: 44
status: locked
---

# Rule kinds budget gate

## Purpose

Freeze the 5-kind matrix so selectors, undo, boundaries, and controller
gates all diff against one closed set. Kinds are already locked in the
tool ribbon gate (order C/R/K/S/E) and the kind-picker keyboard model;
this gate closes their param surfaces and validation contracts.

## Kind matrix

| Code | Name               | Shape types            | Primary params         | Threshold shape                                     |
| ---- | ------------------ | ---------------------- | ---------------------- | --------------------------------------------------- |
| C    | Compare (Presence) | `rectangle`, `polygon` | `sensitivity`          | `okThreshold`, `ngThreshold` in `params.thresholds` |
| R    | Region (Count)     | `rectangle`, `polygon` | `minCount`, `maxCount` | `okThreshold`, `ngThreshold` in `params.thresholds` |
| K    | Keypoint           | `point[]` (2-8 pts)    | `radius`, `tolerance`  | `okThreshold`, `ngThreshold`                        |
| S    | Shape (Match)      | `polygon`              | `iouThreshold`         | `okThreshold`, `ngThreshold`                        |
| E    | Expression (Math)  | none (references)      | `expression: string`   | derived from expression comparison                  |

Every kind carries the same top-level fields: `id`, `kind`, `name`,
`shape`, `params`, `params.thresholds`, `meta` (`createdAt`, `updatedAt`,
`editorVersion`).

## Kind-specific validation (delegated)

- Math (E) grammar and evaluator vectors:
  `.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/ss-03-math-expression-grammar.md`.
- Shape and geometry vectors: same SS-03 file (geometry section).
- Lighting is a global control, not a rule kind, and is delegated to
  `ss-05-lighting-controls.md`.

## Kind switch

- Switching kind creates a new rule shell with defaults; existing
  `shape` is preserved when the new kind supports its shape type,
  otherwise the shape is cleared and `W_UI_SHAPE_CLEARED_ON_KIND_SWITCH`
  is logged.
- Params are always reset to kind defaults on switch (no cross-kind
  param carry-over).
- Exactly 1 `rule.kind-switch` history entry per switch, ties to
  `_notes/undo-coalescing-fixtures.md` F-UNDO-04.
- Same-kind commit is a no-op with no log and no history entry.

## Defaults

| Kind | Param defaults                           | Threshold defaults  |
| ---- | ---------------------------------------- | ------------------- |
| C    | `sensitivity=0.5`                        | `ok=0.8`, `ng=0.4`  |
| R    | `minCount=1`, `maxCount=10`              | `ok=1`, `ng=0`      |
| K    | `radius=8`, `tolerance=2`                | `ok=0.9`, `ng=0.5`  |
| S    | `iouThreshold=0.7`                       | `ok=0.85`, `ng=0.5` |
| E    | `expression=""` (invalid until authored) | derived             |

## Consumption rules

Editor scope:

- No new kinds without a spec v1.1 bump and a matching migration
  version in `_notes/program-migration-v1-to-v2.md`.
- No aliasing of a kind under a different code. Kind codes are the
  storage key.
- No kind-specific param on a different kind (e.g. `iouThreshold` on C).
  Enforced by the schema.
- Every kind MUST have a corresponding param panel component under
  `src/components/editor/rules/kinds/<lowercase-name>/`.

## Budget

- Kinds: 5 (locked at spec v1.0).
- Threshold shape: single `params.thresholds.{ok,ng}` object (locked).
- Kind-switch history entries per switch: exactly 1.
- Same-kind switch history entries: exactly 0.

## Regression guards

```bash
# G-KIND-01: kind literal is exactly the 5-element tuple
rg -n "KIND_CODES\s*=\s*\[" src/lib
# Expected: exactly one match; array literal is exactly ['C','R','K','S','E'].

# G-KIND-02: no legacy kind aliases
rg -nE "\b(presence|count|keypoint|shape|math|expression)_kind\b" src

# G-KIND-03: no kind-specific param used on a different kind (grep smoke)
rg -n "iouThreshold" src/components/editor/rules/kinds/compare
rg -n "sensitivity" src/components/editor/rules/kinds/shape
# Expected: 0 hits for each.

# G-KIND-04: every kind has a param panel folder
for k in compare region keypoint shape expression; do
  test -d "src/components/editor/rules/kinds/$k" || echo "missing: $k"
done
```

Expected: G-KIND-01 = 1 match with the literal `['C','R','K','S','E']`;
G-KIND-02..03 empty; G-KIND-04 prints nothing (all folders exist at
step 71+).

## Decision

Kind matrix frozen at 5 kinds with locked param defaults, threshold
shape, and kind-switch semantics. Step 45 (selectors budget gate) may
proceed.
