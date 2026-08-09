# Undo coalescing fixtures (plan 30 step 27)

**Version:** 1.0.0 (2026-07-14, v3.32.0)
**Owner spec:** `06-state-persistence.md`
**Consumer suite:** `tests/unit/undo.test.ts` (created in step 61+).

## Contract

The undo stack is a bounded ring of at most **50 entries**. Each entry is `{ id: string, kind: HistoryKind, at: number, before: Snapshot, after: Snapshot }`. `HistoryKind` is one of:

- `rule.create`, `rule.delete`, `rule.reorder`
- `rule.kind-switch`
- `shape.transform` (translate, resize, vertex-drag)
- `shape.commit`
- `params.edit`
- `layout.toggle`

## Coalescing rules (fixture-driven, no code yet)

Fixtures live under `tests/fixtures/undo/` when the suite lands. Each fixture is an ordered list of intents plus the expected `stack.length` and top-entry `kind` after replay.

- **F-UNDO-01 drag coalesces:** N ≥ 2 `shape.transform` intents on the same `ruleId` + `vertexId` within a single pointer-down..pointer-up window collapse to exactly 1 entry. Expected: `length = 1`, `kind = shape.transform`.
- **F-UNDO-02 drag then commit:** drag window followed by `shape.commit` on the same shape produces exactly 1 entry (the commit absorbs the coalesced drag). Expected: `length = 1`, `kind = shape.commit`.
- **F-UNDO-03 ESC cancel:** drag window ending in ESC produces **0 entries**. The `before` snapshot is restored, the stack is untouched.
- **F-UNDO-04 kind-switch is atomic:** switching a rule from `presence` to `count` (or any two of `C/R/K/S/E`) is exactly 1 entry regardless of how many derived params reset. Expected: `length = 1`, `kind = rule.kind-switch`.
- **F-UNDO-05 params burst:** ≥ 2 `params.edit` intents on the same `(ruleId, paramKey)` within 400 ms coalesce to 1. Different `paramKey` values do NOT coalesce.
- **F-UNDO-06 ring bound:** pushing entry 51 evicts entry 1 (FIFO on the tail). `stack.length` stays at 50; `redo` stack clears on any new push.
- **F-UNDO-07 cross-rule never coalesces:** two `shape.transform` intents on different `ruleId` values always produce 2 entries even inside one pointer window (defensive: multi-select drag is out of scope for v1).

## Regression guards

- No fixture may assert `length > 50`.
- No fixture may assert coalescing across differing `kind` values except the F-UNDO-02 drag→commit case, which is explicitly whitelisted.
- Every fixture asserts BOTH pre-replay and post-replay `Snapshot` equality on the affected rule to prove `before`/`after` are complete, not partial.

## What this unblocks

Step 36 Zustand action design can lock the history middleware signature: `pushHistory(intent, { coalesceWith?: HistoryKind, windowMs?: number })`. Without these fixtures the middleware would be written against implementation intuition and rewritten once real drags exist.
