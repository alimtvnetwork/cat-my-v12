# SS-07 Rule.conditions Typing (Plan 42 Step 8)

**Status:** DONE at v3.421.0.

Root cause: spec 47 s3 requires `Rule.conditions: RuleCondition[]` as a discriminated union on `type`, but `src/lib/editor/schema.ts` had no such union, so evaluators (steps 12-14) and the AND-merge runner (step 15) could not narrow.

Changes to `src/lib/editor/schema.ts`:

- Added params interfaces `SameImageConditionParams`, `PresenceConditionParams { Mode; Threshold; MinBlobPx }`, `ColorConditionParams { Mode; ExpectedColor; DeltaE }` per spec 47 s5.
- Added discriminants `SameImageCondition`, `PresenceCondition`, `ColorCondition` and the `RuleCondition` union keyed on `type` from `ConditionType`.
- Added `DEFAULT_CONDITION_PARAMS` map + `makeDefaultCondition(type, id)` factory. `Presence` defaults to `{ Mode: Present, Threshold: 0.5, MinBlobPx: 10 }`; `Color` defaults to `{ Mode: Current, ExpectedColor: "#000000", DeltaE: 3.0 }`; `SameImage` params is `{}`.
- Added `EditorRuleV3` extending `EditorRuleV2` with `conditions: RuleCondition[]` (non-empty invariant enforced at construction / migration; parser tolerance for now).
- Added `isRuleCondition(v)` type guard enforcing regex `^#[0-9a-fA-F]{6}$` on `ExpectedColor` and `>= 0` on `DeltaE`, matching spec 48 s5.

Enum sources: `ConditionType`, `ColorMode`, `PresenceMode`, `ValidationMode` from `src/types/rules/*.ts`. Magic-string lint stays green: schema.ts references enum values only, never string literals.

Verification: `bunx tsgo --noEmit` clean.
