# Rule-layer store hardening (plan 30 step 71)

**Status:** locked as spec boundary at project v3.53.0.
**Owner module:** `src/lib/editor/store/rules-slice.ts` (extension of the Zustand shape locked by spec 24 §06).

## Root cause for locking now

Three input primitives (click, marquee, nudge) now commit through the store, but structural rule-layer ops (lock, hide, reorder, duplicate, delete, group-select-all) are still ad-hoc. Locking the action surface before rail (72), z-order (73), and controller (74) prevents each panel from freelancing its own mutations.

## Action surface

Every action is a pure reducer that returns the next state. No side effects, no logs from inside the reducer; the store commit boundary emits the log line.

- `setLocked(ruleIds: string[], locked: boolean)` -> flips `rule.locked`; skips already-matching rules.
- `setHidden(ruleIds: string[], hidden: boolean)` -> flips `rule.hidden`; if a hidden rule was selected, it is removed from selection in the same commit.
- `deleteRules(ruleIds: string[])` -> removes rules and prunes selection; refuses to delete locked rules (emits `W_UI_RULE_DELETE_REFUSED`).
- `duplicateRules(ruleIds: string[])` -> clones with new ids, offsets AABB/anchor by `+16 image px` on both axes (clamped to image), inserts directly above source in z-order, replaces selection with the new ids.
- `reorderRules(ruleIds: string[], targetIndex: number)` -> stable move of a contiguous or non-contiguous set to `targetIndex`; preserves original relative order within the moved set.
- `selectAllVisibleUnlocked()` -> convenience for `Ctrl/Cmd + A`.
- `replaceAll(rules: EditorRule[], selectedIds?: string[])` -> bulk replace for imported rule sets; prunes selection to ids present, defaults to first id when omitted. Emits `I_UI_RULES_REPLACED { count }`.
- `createRule(rule: EditorRule)` -> appends and replaces selection with the new id; caller supplies the id (G-STORE-03). Emits `I_UI_RULE_CREATED { ruleId }`.
- `updateParams(ruleId: string, params: EditorRuleParams)` -> shallow-replaces `rule.params` for one rule; no geometry change (I-4). Emits `I_UI_RULE_PARAMS_CHANGED { ruleId }`.

## Invariants

- **I-1:** `rule.id` is stable across every action (never regenerated).
- **I-2:** Selection only contains ids present in the rule list; every action prunes as its last step.
- **I-3:** Every action produces exactly one undo entry via the existing commit boundary (spec 24 §06 S-6). Batch ops = one entry, not N.
- **I-4:** No action mutates rule geometry. Geometry mutations remain owned by tools + nudge.

## Delta guards

- **G-STORE-01:** `rg 'set\(.*rules' src/components/editor` and `rg 'set\(.*rules' src/components/editor/rail` return zero. Only `rules-slice.ts` writes `state.rules`.
- **G-STORE-02:** Every exported action name appears in `rules-slice.test.ts` fixture list (kept in lockstep at step 93).
- **G-STORE-03:** Reducers are pure. `rg 'Date\.now\(\)|Math\.random\(\)|crypto\.' src/lib/editor/store/rules-slice.ts` returns zero (ids and timestamps are passed in by the commit boundary).

## Log surface

- `I_UI_RULES_LOCKED / _UNLOCKED / _HIDDEN / _SHOWN / _DELETED / _DUPLICATED / _REORDERED { ruleIds, correlationId }` — one per commit.
- `W_UI_RULE_DELETE_REFUSED { ruleIds, reason: 'locked', correlationId }` when delete is refused.

## Unblocks

- Step 72 rail actions (rail becomes a dumb view over these actions).
- Step 73 drag-reorder / z-order.
- Step 74 controller mount.
- Steps 75-79 C/R/K/S/E panels.
