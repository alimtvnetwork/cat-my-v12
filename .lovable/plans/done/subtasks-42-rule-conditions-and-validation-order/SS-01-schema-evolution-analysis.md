# Plan 42 Step 1: Schema Evolution Analysis

Status: done (v3.416.0)
Author: agent

## Purpose

Enumerate every field in `src/lib/editor/schema.ts` and `src/lib/editor/migrations.ts` that must evolve to support the SameImage / Presence / Color condition model and the Parallel / Sequential ruleset validation mode. Anchor for plan-42 step 11 (schema extension) and step 14 (v2 to v3 migration).

## Files read

- `spec/21-app/16-processing-pipeline.md` (104 lines): Dispatcher owns ordering. Section 5 "Ordering Guarantees" defines assignment as FIFO by `ImageSequence`, completion order as arbitrary. Section 8 (Acceptance Checklist) requires "Rule evaluation order matches `spec/21-app/33-rule-catalog.md`". This is the anchor for Sequential mode: rule order is layer order, short-circuit on FAIL.
- `spec/21-app/17-parallelism-guarantees.md` (86 lines): Section 8 forbids "cross-worker synchronization for rule evaluation. Each `Judgment` is independent." Sequential mode does NOT introduce cross-image sync, only within-image (single worker, single Judgment) rule ordering. No change to worker fan-out.
- `spec/21-app/33-rule-catalog.md`: current rule catalog. New conditions attach to existing controllers, they do not add a new controller kind.
- `src/lib/editor/schema.ts` (178 lines): current `EditorRuleV2` shape, `ControllerKind` union (10 kinds), `DEFAULT_PARAMS`, normalizers, `RULESET_SCHEMA_VERSION = 2`.
- `src/lib/editor/migrations.ts` (189 lines): forward-only v1 to v2. Idempotent for v2 input via `isAlreadyV2`. `MigrationError` code `E_UI_RULE_MIGRATE_FAIL`.
- `src/types/rules/ConditionType.ts`, `PresenceMode.ts`, `ColorMode.ts`, `src/types/ruleset/ValidationMode.ts`: enums for plan-42 steps 7-10, ALREADY SHIPPED (Plan 67 slice). No re-work needed.

## Fields that must evolve

### `src/lib/editor/schema.ts`

1. `RULESET_SCHEMA_VERSION`: bump `2` -> `3` (line 13).
2. Add `RuleCondition` union at module scope. Discriminator: `type: ConditionType`.
   - `SameImageCondition`: no extra params (empty payload beyond `type` + `id`).
   - `PresenceCondition`: `mode: PresenceMode` (`present` | `absent`), `threshold: number`, `minBlobPx: number`. Threshold and minBlobPx mirror `ParamsPresence` so existing rule params carry forward on migration.
   - `ColorCondition`: `mode: ColorMode` (`current` | `dense-2` | `dense-3` | `picked`), `expectedColor: string` (hex, required when mode = `picked`, ignored otherwise), `deltaE: number`. Mirrors `ParamsColor`.
3. `EditorRuleV3` extends `EditorRuleV2` with `conditions: RuleCondition[]` (non-empty, first item is authoritative for backward-compat renderers).
4. `EditorRulesetV3`: introduce a top-level ruleset envelope carrying `validationMode: ValidationMode` (default `Parallel`) and `rules: EditorRuleV3[]`. Current code passes bare `EditorRuleV2[]`; the envelope needs its own type + Zod schema.
5. `DEFAULT_PARAMS` unchanged (per-controller params are separate from conditions). No default change needed.
6. Add `DEFAULT_CONDITIONS[controller]` helper returning `[{ type: SameImage, id: ... }]` for every controller (SameImage is the always-safe default that preserves v2 semantics).
7. Add normalizers: `normalizeConditionType`, `normalizePresenceMode`, `normalizeColorMode`, `normalizeValidationMode` (mirror `normalizeGrowthTolerance` at lines 174-178). These already have type guards (`isConditionType` et al.); the normalizer wraps them with a fallback constant.
8. Type guard: `isRuleCondition(v: unknown): v is RuleCondition` discriminating on `type`.

### `src/lib/editor/migrations.ts`

9. Add `migrateRuleV2ToV3(rule)`: idempotent (returns v3 unchanged when `conditions` present and non-empty), otherwise attaches `conditions: [{ id: crypto.randomUUID(), type: SameImage }]`. Preserves all v2 fields.
10. Add `migrateRuleSetV2ToV3(ruleset)`: envelope migration that adds `validationMode: Parallel` when absent, and maps rules through step 9.
11. Compose: `migrateRuleSetV1ToV3 = v2 then v3` for callers loading legacy JSON. Existing v1 to v2 path stays untouched.
12. Extend `MigrationError` codes: `E_UI_RULE_MIGRATE_FAIL` reused. No new code needed for step 14; a new runtime code `RuleConditionEval` (plan step 25) lives on the runner side, not migrations.
13. `hydrateRuleSetForStore` (line 185-189): return type widens from `EditorRule[]` to `{ validationMode; rules: EditorRule[] }`. This is the largest ripple: every caller of `hydrateRuleSetForStore` (grep-scan required in step 11 of the plan) will need to unwrap `.rules` or accept the envelope. Flag as break-change candidate; the compat option is to keep the array export and add a sibling `hydrateRulesetEnvelopeForStore`.

### Ripple checklist (not evolving here, but downstream)

- `src/lib/editor/ruleset-io.ts`: import/export must round-trip v3 fields.
- `src/lib/editor/store/*`: zustand state shape gains `validationMode` and per-rule `conditions`.
- `src/lib/editor/validation.ts` / `validation.functions.ts`: runner entry must iterate `rule.conditions` and merge by AND; Sequential mode short-circuits at ruleset level.
- `src/components/editor/panels/*`: new `RuleControllerPanel` reads `rule.conditions[]`; `LayersPanel` renders `validationMode` toggle + numeric prefixes when Sequential.
- Tests: existing fixtures in `src/lib/editor/__tests__/` load v2 JSON. Migration step 15 must add v2 -> v3 round-trip test using an existing fixture.

## Backward compatibility contract

- v1 JSON: still valid, upgrades v1 -> v2 -> v3.
- v2 JSON: still valid, upgrades v2 -> v3 by attaching one `SameImage` condition per rule and defaulting `validationMode = Parallel`.
- v3 JSON with unknown enum values: normalizer coerces to the safe default (`ConditionType.SameImage`, `ValidationMode.Parallel`); a coercion breadcrumb is surfaced via `I_UI_RULE_MIGRATE_COERCED` info-level (already reserved in migrations.ts header).
- Runtime semantics for a rule with a single `SameImage` condition MUST equal the v2 behavior for that rule; regression coverage lives in the runner unit tests (plan step 26).

## Open questions punted to later steps

- Q1: Does `picked` require the reference image at rule-authoring time, or is it a runtime sample against the current inspected image? Punt to spec `47-rule-condition-model.md` (step 2) and `48-color-condition.md` (step 3).
- Q2: Sequential short-circuit: does a `Skipped` rule count toward the image verdict? Punt to `49-validation-order.md` (step 4). Default proposal: `Skipped` does not contribute; final image verdict = FAIL when any prior rule failed.
- Q3: Slot numbers: the plan lists spec files at slots 40-43, but 40-46 are already occupied in `spec/21-app/`. Reassigned to free slots 47-50 in this analysis; step 2 authors `47-rule-condition-model.md` accordingly. Plan file text to be updated when moving to `.lovable/plans/done/` at step 30.

## Verification

- `rg -n "RULESET_SCHEMA_VERSION" src/` -> single hit at `src/lib/editor/schema.ts:13`. Bump target confirmed.
- `rg -n "hydrateRuleSetForStore" src/` -> caller enumeration required at step 11 (this analysis flags the ripple but does not perform the grep; it is deferred to the schema-change step so the results are fresh).
- No code change in this step. Analysis only.
