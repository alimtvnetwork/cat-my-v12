# Plan 35 store shape (read-phase)

Version: v3.208.0
File: `src/lib/editor/store/rules-slice.ts` (verified with `grep -nE`).

## Existing state

```ts
interface RulesState {
  rules: EditorRule[];
  selectedIds: string[];
  groups: RuleGroup[];
}
```

`RuleGroup` is re-exported from `./history-types`.

## Existing actions (line refs from `rules-slice.ts`)

- `setLocked(ruleIds, locked)` L286, impl L404.
- `setHidden(ruleIds, hidden)` L287, impl L413.
- `reorderRules(ruleIds, targetIndex)` L290, impl L445 - already covers Plan 35
  step 7 "reorderRule" surface; keyword vs signature: signature accepts an id
  array (multi-select drag), which is the shape LayersPanel drag needs.
- `groupSelected(groupId, name)` L292, impl L463.
- `mergeSelected()` L294, impl L481 - returns typed reason for the
  `E_LAYER_MERGE_INCOMPATIBLE` detail (`too-few` | `mixed-kind`).

## Pure helpers (already exported for tests)

`applySetLocked`, `applySetHidden`, `applyDeleteRules`, `applyDuplicateRules`,
`applyReorderRules`, `applySelectAllVisibleUnlocked`, `applyReplaceAll`,
`applyCreateRule`, `applyUpdateParams`, `applySetKind`, `applySetName`,
`applySetBounds`. All return a new `RulesState`; none mutate.

## Test coverage

`src/lib/editor/store/__tests__/rules-slice-groups.test.ts` already exists. New
tests for step 8 (`rules-slice-groups.test.ts` per the plan file) can extend
this file rather than creating a duplicate.

## Gap for Plan 35 step 7

The plan file names an `ungroup` reducer. `rules-slice.ts` header does not list
it in the top-level enumeration above; verify presence when step 7 lands and
either extend or add it. Do NOT rename existing actions.
