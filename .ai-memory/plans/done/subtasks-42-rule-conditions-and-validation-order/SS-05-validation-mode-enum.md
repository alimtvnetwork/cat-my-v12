# SS-05 ValidationMode Enum (Plan 42 Step 6)

**Status:** DONE at v3.420.0.

Root cause: SS-01 assumed `src/types/rules/ValidationMode.ts` existed; verification showed only `ConditionType`, `ColorMode`, `PresenceMode`, `DndMode`, `RuleKind` were present.

Change: created `src/types/rules/ValidationMode.ts` following the same shape as `ConditionType.ts`:

- `ValidationMode` const object: `Parallel = "parallel"`, `Sequential = "sequential"`.
- `VALIDATION_MODE_LABEL` and `VALIDATION_MODE_DESCRIPTION` frozen maps for UI copy.
- `ALL_VALIDATION_MODES` frozen array (order = Parallel, Sequential; drives the segmented control in `ValidationModeToggle`).
- `DEFAULT_VALIDATION_MODE = ValidationMode.Parallel` for the v2 -> v3 migration and new-ruleset defaulting (49 s3).
- `isValidationMode(value)` type guard.

Enum audit result (all 5 existing enums verified conformant to the "const object + type + label map + ALL\_ array + isX guard" shape; no drift):

- `src/types/rules/ConditionType.ts` OK.
- `src/types/rules/ColorMode.ts` OK.
- `src/types/rules/PresenceMode.ts` OK.
- `src/types/rules/DndMode.ts` OK.
- `src/types/rules/RuleKind.ts` OK.

Unblocks step 7 (`RULESET_SCHEMA_VERSION` -> 3 with `Ruleset.validationMode` typed field) and step 11 (v2 -> v3 migration setting `validationMode = DEFAULT_VALIDATION_MODE`).
