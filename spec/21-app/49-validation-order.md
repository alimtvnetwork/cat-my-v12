# 49 - Validation Order and ValidationMode

**Status:** Draft (Plan 42 Step 4). Anchors: 47 (rule condition model), 22 (Rule / Judgment), 16 (processing pipeline), 17 (parallelism guarantees), 40 (error manage).

## 1. Purpose

Fix how a ruleset's rules are ordered and short-circuited when a captured image is evaluated. Adds a per-ruleset `ValidationMode` selecting Parallel (default, v2-equivalent) or Sequential (early-exit on first FAIL). This is orthogonal to the within-rule AND merge in 47 s6.

Slot 49 was chosen because slots 40-46 in `spec/21-app/` are already occupied (see 47 s1). Plan 42's original text referenced slot 42; that number is re-mapped to 49.

## 2. Non-Goals

- No cross-rule dependency graph. Rules do not consume each other's outputs.
- No priority weights. Order is a plain array; the UI is drag-to-reorder.
- No per-image mode override at runtime. `ValidationMode` is authored on the ruleset and read once per image.

## 3. Envelope

Ruleset gains a top-level field:

```
ruleset: {
  version: 3,
  validationMode: "parallel" | "sequential",
  rules: Rule[]
}
```

`ValidationMode` is the closed enum in `src/types/rules/ValidationMode.ts` (created by Plan 42 step 10). String literals in JSON MUST match the enum's serialized values.

Migration from v2 -> v3 (26 Migrations, `src/lib/editor/migrations.ts`) sets `validationMode = "parallel"`. This is a no-op semantically because v2 always ran every rule.

## 4. Mode Semantics

### 4.1 Parallel (default)

- Every rule is evaluated. Runner MAY fan out (17 s3) but is not required to.
- Ruleset verdict = AND-merge of all rule verdicts (any FAIL fails the ruleset, any ERROR is ERROR).
- `Judgment.perRule` contains one entry per rule, in the ruleset's declared order.
- v2-equivalent path. All existing tests remain green under this mode.

### 4.2 Sequential

- Rules evaluate top-to-bottom in the ruleset's declared array order.
- On the first rule returning FAIL or ERROR, evaluation STOPS. Remaining rules are marked `verdict = "Skipped"`, `reasonCode = "SequentialShortCircuit"`.
- Ruleset verdict = the verdict of the last evaluated rule (PASS if all ran and passed, otherwise the short-circuit verdict).
- `Judgment.perRule` still contains one entry per rule, preserving the Skipped placeholders (needed for the results screen to show which rules were bypassed).

Sequential mode is deterministic: the same image + same ruleset + same order MUST short-circuit at the same rule.

## 5. Order Model

- `ruleset.rules` is an ordered array. The UI drag-reorder (Plan 41 keyboard DnD) writes the new order back on save.
- Rule identity is `Rule.id` (ULID). Reorder never mutates IDs; the results screen keys on ID (22 s5).
- No sub-array grouping in v3. Section headers / groups are a future concern.

## 6. Runner Contract Delta

Runner signature stays `evaluateRuleset({ ruleset, image })` -> `Judgment`. The runner:

1. Reads `ruleset.validationMode`.
2. Parallel: awaits `Promise.all(rules.map(evaluateRule))`.
3. Sequential: for-await loop; breaks on first non-PASS; fills Skipped entries afterwards.

Any runner error (not a rule FAIL) surfaces as `Judgment.reasonCode = "RulesetEval"` with `AppError` code `ErrorCode.RulesetEval`. Never swallowed (40).

## 7. UI Contract

Full spec in `50-rule-controller-ui.md`. Summary:

- Ruleset header exposes a segmented control: Parallel / Sequential.
- Rule list gets a drag handle per row and a "Move up / down" keyboard affordance (Plan 41).
- Sequential mode adds a badge on each rule showing "will run only if previous PASS".
- Results screen renders Skipped rules in a muted style with a "Skipped by sequential mode" tooltip.

## 8. Persistence

- `validationMode` serializes on the ruleset root; `rules` order serializes as the array order (no `order` field on Rule).
- Schema bump: `RULESET_SCHEMA_VERSION` -> `3` in `src/lib/editor/schema.ts` (single bump covers both 47 and this spec).

## 9. Acceptance Checklist

- [ ] `ValidationMode` values are the ONLY strings ever seen at runtime (typecheck + magic-string lint).
- [ ] Parallel mode is byte-for-byte equivalent to v2 output on the existing golden fixture (regression gate).
- [ ] Sequential mode short-circuits at the first FAIL, proven by a targeted runner test with three rules where rule 2 fails and rule 3 must never be invoked.
- [ ] Skipped entries appear in `Judgment.perRule` with `reasonCode = "SequentialShortCircuit"`.
- [ ] Reorder round-trip: drag rule 3 above rule 1, save, reload, evaluate: order matches the new array (persistence test).
- [ ] `ruleset.validationMode = "parallel"` is set by v2 -> v3 migration and is idempotent.
