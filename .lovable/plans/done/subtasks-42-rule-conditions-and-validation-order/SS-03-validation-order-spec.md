# SS-03 Validation Order Spec (Plan 42 Step 4)

**Status:** DONE at v3.418.0.

Authored `spec/21-app/49-validation-order.md` fixing:

- Ruleset envelope gains `validationMode: "parallel" | "sequential"` backed by the closed `ValidationMode` enum (Plan 42 step 10, `src/types/rules/ValidationMode.ts`).
- Parallel = v2-equivalent AND-merge across all rules; Sequential = top-to-bottom short-circuit on first FAIL / ERROR, remaining rules marked `Skipped` with `reasonCode = "SequentialShortCircuit"`.
- Rule order is the array order of `ruleset.rules`; no `order` field on Rule. Drag / keyboard-DnD writes back on save.
- Migration: v2 -> v3 sets `validationMode = "parallel"` (idempotent, semantic no-op).
- Schema bump `RULESET_SCHEMA_VERSION` -> `3` covers both spec 47 and 49 in one migration.

Slot re-mapped from Plan 42's original 42 to 49 (40-46 occupied).
