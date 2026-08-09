# 47 - Rule Condition Model

**Status:** Draft (Plan 42 Step 2). Anchors: 33 (rule catalog), 34 (tolerance model), 22 (Rule / Judgment envelope), 48 (color condition), 49 (validation order), 50 (rule controller UI).

## 1. Purpose

Extend every rectangular / circular rule with a first-class **condition list**. A rule's verdict is the AND-merge of its conditions. Conditions are the authoring primitive users compose in the rule controller drawer; they are NOT a new `ruleKind`.

Slot 47 was chosen because slots 40-46 in `spec/21-app/` are already occupied. Plan 42's original text referenced 40-43; those numbers are re-mapped to 47-50 (this file + 48/49/50).

## 2. Non-Goals

- No change to `ruleKind` enum in 33.
- No change to the per-controller `paramsJson` schemas in 33 s3. Conditions live in a NEW sibling field.
- No cross-image state. Every condition evaluates against a single captured image (per 17 s8).
- No new worker fan-out. Conditions run inside the existing per-image worker call.

## 3. Condition Envelope

Every condition is a discriminated object:

```json
{
  "id": "cnd_01H...",
  "type": "same-image | presence | color",
  "params": { ... type-specific ... }
}
```

| Field    | Rule                                                                      |
| -------- | ------------------------------------------------------------------------- |
| `id`     | ULID / crypto.randomUUID; stable across saves; used for DnD reorder keys. |
| `type`   | Closed enum `ConditionType` (see `src/types/rules/ConditionType.ts`).     |
| `params` | PascalCase JSON object, schema fixed per `type` (s5).                     |

A `Rule.conditions` array MUST contain at least one entry. Migration from v2 attaches a single `SameImage` condition so v2 rules keep their prior semantics (see 26 Migrations and `src/lib/editor/migrations.ts` v2 -> v3 path).

## 4. Condition Types

| Type      | Value        | Sub-mode enum        | Purpose                                                                       |
| --------- | ------------ | -------------------- | ----------------------------------------------------------------------------- |
| SameImage | `same-image` | none                 | Baseline v2-equivalent evaluation using the rule's controller params.         |
| Presence  | `presence`   | `PresenceMode`       | Assert the ROI contains (Present) or does not contain (Absent) matter.        |
| Color     | `color`      | `ColorMode` (see 48) | Assert the ROI color matches Current / Dense2 / Dense3 / Picked (48 details). |

`ConditionType`, `PresenceMode`, `ColorMode` are the authoritative enum modules. No free-text strings; magic-string lint (`spec/02-coding-guidelines`) applies.

## 5. Params Schemas

### 5.1 SameImage

```
params: {}
```

No fields. The rule's controller params (`Rule.paramsJson`) drive evaluation. This is the migration-safe default and the v2-equivalent path.

### 5.2 Presence

```
params: {
  Mode: "Present" | "Absent",
  Threshold: number,     // 0..1, fraction of ROI area
  MinBlobPx: integer     // absolute pixel count
}
```

Semantics mirror the `presence` / `absence` controllers in `src/lib/editor/schema.ts` (`ParamsPresence`). `Threshold` and `MinBlobPx` default to the controller's own values on v2 -> v3 migration when the rule's controller is `presence` or `absence`; otherwise defaults are `0.5` and `10`.

### 5.3 Color

See `48-color-condition.md` for the full Current / Dense2 / Dense3 / Picked contract. This file fixes only the envelope:

```
params: {
  Mode: "Current" | "Dense2" | "Dense3" | "Picked",
  ExpectedColor: string, // hex "#RRGGBB", required when Mode="Picked"
  DeltaE: number         // >= 0
}
```

## 6. Merge Rule (Within One Rule)

A rule verdict is `PASS` iff every condition in `rule.conditions` returns `PASS`. Any `FAIL` in the list fails the rule. Any `ERROR` short-circuits to `ERROR` (per 22 s4 precedence). This is a pure AND merge; there is no OR / weight / priority in v3.

Evaluation order within one rule is the array order (top-to-bottom in the UI). Order affects only which reason code surfaces first in `Judgment.reasonCode`; it does not change the merged verdict.

## 7. Runner Contract

- Input: `{ rule: Rule, image: Bitmap, roi: Region }`.
- Output: `{ verdict, reasonCode, reasonMessage, perCondition: [{ id, verdict, reasonCode }] }`.
- Failure of any condition surfaces `reasonCode = "RuleConditionEval"` when the failure is an internal evaluator error (thrown / rejected). `AppError` code `ErrorCode.RuleConditionEval` is reserved; see 40 Error Manage.
- Purity: same inputs must produce identical outputs (per 33 s2).

## 8. Persistence

Conditions serialize inline on the rule (no side table). Schema version bumps from `2` to `3` in `src/lib/editor/schema.ts`. Migration is forward-only (26 Migrations); v2 payloads gain a single `SameImage` condition on load.

## 9. UI Contract Summary

Full UI spec lives at `50-rule-controller-ui.md`. Callers see:

- Segmented control for the primary match mode (SameImage / Presence / Color).
- Conditional sub-panels per mode.
- "Add condition" + button appends another entry; DnD reorders (keyboard DnD per Plan 41).
- Delete allowed for any condition except the last (list is non-empty by invariant).

## 10. Acceptance Checklist

- [ ] `Rule.conditions` is always non-empty on disk.
- [ ] All enum values match `src/types/rules/*.ts` at build time (typecheck gate).
- [ ] v2 -> v3 migration is idempotent and preserves per-rule verdicts under a single `SameImage` condition (runner unit test).
- [ ] AND merge is proven by a targeted test with two conflicting conditions on one rule (Vitest).
- [ ] Reason codes use PascalCase per 22.
- [ ] No new controller kind added to 33.
