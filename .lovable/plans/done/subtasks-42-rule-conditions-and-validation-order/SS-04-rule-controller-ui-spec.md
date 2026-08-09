# SS-04 Rule Controller UI Spec (Plan 42 Step 5)

**Status:** DONE at v3.420.0.

Authored `spec/21-app/50-rule-controller-ui.md` fixing:

- Component tree under `src/features/rules/editor/`: `RulesetHeader`, `ValidationModeToggle`, `RulesList`, `RuleRow`, `RuleEditorDrawer`, `RuleConditionsEditor`, `ConditionCard`, `ConditionTypeSelect`, `ConditionParamsPanel`, `LivePreviewBadge`.
- Ruleset header hosts the segmented `ValidationModeToggle` driven by `ALL_VALIDATION_MODES` (49).
- Condition list is always non-empty; "Add condition" appends `SameImage` with `crypto.randomUUID`; delete disabled when length = 1 (47 s3).
- Per-type params panels: SameImage (no fields), Presence (Mode / Threshold / MinBlobPx), Color (Mode / ExpectedColor / DeltaE + eyedropper when `Picked`).
- Keyboard DnD contract: Space to pick up, Arrow keys to move, Space to drop, Escape to cancel (Plan 41).
- A11y invariants + observability sinks in `src/lib/projects/store.ts`; no swallow of runner errors.
- Magic-string lint gate: no JSX literal may match `ConditionType`, `ColorMode`, `PresenceMode`, or `ValidationMode` values.
