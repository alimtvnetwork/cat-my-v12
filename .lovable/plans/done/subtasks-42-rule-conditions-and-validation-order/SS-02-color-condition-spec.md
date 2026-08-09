# SS-02 Color Condition Spec (Plan 42 Step 3)

**Status:** DONE at v3.418.0.

Authored `spec/21-app/48-color-condition.md` fixing:

- Envelope (`Mode`, `ExpectedColor`, `DeltaE`) tied to `ColorMode` enum in `src/types/rules/ColorMode.ts`.
- Mode semantics: Current / Picked = mean-Lab; Dense2 / Dense3 = k-means centroids (k=2/3, deterministic seed = first pixel, max 32 iters).
- Delta-E 2000 as the single shared helper at `src/lib/color/deltaE.ts` (to be authored in a later step).
- Reason codes: `ColorDeltaE` on FAIL, `EmptyRoi` on empty mask, `RuleConditionEval` on evaluator throw.
- v2 -> v3 migration: color-controller rules become one Color condition preserving prior hex + delta.

Slot re-mapped from Plan 42's original 41 to 48 (40-46 in `spec/21-app/` are occupied; see 47 s1).
