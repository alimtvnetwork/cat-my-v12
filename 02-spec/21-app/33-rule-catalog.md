# 29 — Rule Catalog (v1)

**Status:** Locked (Plan 04 Step 29). Enumerates the v1 rule kinds evaluated by workers and authored in Rule Setup.

Anchors: 22 (`Rule`, `Judgment`), 23 (override cascade), 31 (Rule Setup screen), 32 (Shape Model), 34 (tolerance model — next), 36 (JSON instruction output), images 24–25.

## 1. Purpose

Define the closed set of `Rule.ruleKind` values v1 supports. Each kind fixes its inputs (which `Region` roles it may bind), its parameters, its computed outputs, and its `PASS` / `FAIL` / `ERROR` semantics. No screen, worker, or export is allowed to invent a rule kind outside this catalog, and disabled-in-v1 kinds may not be authored or evaluated as active rules.

## 2. Common Contract

Every rule, regardless of kind, obeys the same envelope:

| Field            | Rule                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| `ruleId`         | ULID assigned at create time; immutable.                                       |
| `ruleKind`       | One of the enum values in §3.                                                  |
| `boundRegionIds` | Ordered list of `Region.regionId`; count and roles constrained per kind.       |
| `paramsJson`     | PascalCase JSON object; schema per kind in §3.                                 |
| `toleranceRef`   | Reference to a tolerance profile (see 34).                                     |
| `verdict`        | `Pass` \| `Fail` \| `Error` (precedence locked in 22 §4).                      |
| `status`         | `Active` \| `Inactive` \| `Silent` (see §Rule Status).                         |
| `outputsJson`    | PascalCase JSON object emitted per evaluation; schema per kind in §3.          |
| `reasonCode`     | Machine reason code from §4 (PascalCase); required whenever `verdict != Pass`. |
| `reasonMessage`  | Human-readable message; never a raw exception string.                          |

Rule evaluation is pure: same inputs (image bytes + region geometry + params) must produce the same outputs. Workers must not read wall-clock, RNG, or network.

## 3. v1 Rule Kinds

The v1 `RuleKind` enum is closed. Adding a kind requires a new spec step and a forward-only migration (26 §Migrations).

### 3.1 `PresenceAbsence`

- Bound regions: 1 x `SearchRegion` (required), 0..N x `MaskRegion`.
- Params: `Mode` (`Present` \| `Absent`), `MinMatchPercent` (0-100), `PatternRegionId` (optional).
- Outputs: `MatchPercent` (0-100), `MatchedX`, `MatchedY`, `MatchedShapeKind`.
- Verdict: `Pass` when `Mode=Present` and `MatchPercent >= MinMatchPercent`, or `Mode=Absent` and `MatchPercent < MinMatchPercent`; else `Fail`.

### 3.2 `FlawDetect`

- Bound regions: 1 x `SearchRegion`, 0..N x `MaskRegion`.
- Params: `Sensitivity` (0-100), `MinFlawAreaPx` (int), `MaxAllowedFlawCount` (int).
- Outputs: `FlawCount`, `LargestFlawAreaPx`, `FlawCentroidsJson` (array of `{X,Y,AreaPx}`, capped at 128).
- Verdict: `Pass` when `FlawCount <= MaxAllowedFlawCount` and every flaw >= `MinFlawAreaPx`; else `Fail`.

### 3.3 `Count`

- Bound regions: 1 x `SearchRegion`, 1 x `PatternRegion`.
- Params: `MinCount`, `MaxCount`, `MinMatchPercent`.
- Outputs: `MatchCount`, `MatchesJson` (array of `{X,Y,MatchPercent}`, capped at 512).
- Verdict: `Pass` when `MinCount <= MatchCount <= MaxCount`; else `Fail`.

### 3.4 `OcrText` - declared, disabled in v1

**Q-05 resolution:** v1 ships no OCR engine binding. `OcrText` stays as a schema-forward placeholder.

- `disabledInV1 = true` in the code-side registry.
- Rule Setup MAY show `OcrText` as unavailable; saving one is `RuleDisabledInV1`.
- Workers reject `OcrText` bundles at load time with `RuleDisabledInV1`; the row still appears in `ruleSet.rules[]` with `status=Inactive`, `statusReason=DisabledInV1`.

Reserved v1.1 schema:

- Bound regions: 1 x `MeasurementRegion` (rectangle only).
- Params: `ExpectedText` OR `ExpectedPattern`, `MinConfidencePercent`, `NormalizeCase` (bool), `StripWhitespace` (bool).
- Outputs: `ReadText`, `ConfidencePercent`, `NormalizedText`.
- Verdict: `Pass` when normalized read matches expected AND `ConfidencePercent >= MinConfidencePercent`; else `Fail`.

### 3.5 `GraphicDisplayCheck`

- Bound regions: 1 x `ImageRegion`, 1 x `PatternRegion`.
- Params: `MinMatchPercent`, `AllowRotationDeg` (0, 90, 180, 270), `AllowMirror` (bool).
- Outputs: `MatchPercent`, `AppliedRotationDeg`, `AppliedMirror`.
- Verdict: `Pass` when `MatchPercent >= MinMatchPercent`; else `Fail`.

### 3.6 `MathExpression`

- Bound regions: 0.
- Params: `Expression` (safe arithmetic on `Rule.<ruleId>.<outputKey>`; operators `+ - * / min max abs round`), `MinValue`, `MaxValue`.
- Outputs: `Value`, `ResolvedInputsJson`.
- Verdict: `Pass` when `MinValue <= Value <= MaxValue`; else `Fail`.

## 3a. Rule Status (LOCKED)

Every rule in a bundle carries one of three statuses. Status is set at authoring time and MAY be overridden by the cascade (23).

| Status     | Meaning                                                                                                             | Evaluated? | Counts toward image verdict? | Appears in `ruleSet.rules[]`? |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------- | ----------------------------- |
| `Active`   | Normal - the default.                                                                                               | Yes        | Yes                          | Yes                           |
| `Inactive` | Skipped entirely (author disabled, region missing, disabled-in-v1, unresolved tolerance).                           | No         | No                           | Yes, with `statusReason`      |
| `Silent`   | Evaluated and logged, but result does NOT influence image verdict (soft-launch a new rule; A/B a threshold change). | Yes        | No                           | Yes, with `statusReason`      |

`statusReason` enum (PascalCase): `AuthorDisabled`, `RegionMissing`, `ToleranceUnresolved`, `DisabledInV1`, `SilentByAuthor`, `SilentByOverride`. Required whenever `status != Active`.

## 4. Reason Codes (PascalCase, LOCKED)

Every non-`Pass` verdict carries one of these codes. Workers never emit free-form strings. Legacy `E_RULE_*` names are removed; writers emitting them fail lint with `E_BUG_ENUM_LEGACY`.

| Code                     | Verdict | Meaning                                                                            |
| ------------------------ | ------- | ---------------------------------------------------------------------------------- |
| `RuleBelowThreshold`     | `Fail`  | Measured value crossed the configured threshold (normal Fail).                     |
| `RuleOutOfRange`         | `Fail`  | Value outside `[Min, Max]` for `Count` / `MathExpression`.                         |
| `RuleNoMatch`            | `Fail`  | Pattern-based rule found zero candidates.                                          |
| `RuleOutsideSafeZone`    | `Fail`  | Matched location is outside its `XyBox` safe zone (see 34 §3.3, 24 §4 `safeZone`). |
| `RuleTimeout`            | `Error` | Rule exceeded per-rule budget from 27 §Runtime.                                    |
| `RuleBadInput`           | `Error` | Bound region or param failed validation at load time.                              |
| `RuleUnsupported`        | `Error` | `RuleKind` unknown to this worker version.                                         |
| `RuleDisabledInV1`       | `Error` | `RuleKind` declared for schema compatibility but disabled for v1 (`OcrText`).      |
| `ReferenceMissingOnDisk` | `Error` | Referenced image absent from `refs/` (24 §9).                                      |
| `ToleranceUnresolved`    | `Error` | Tolerance profile cannot be resolved for this rule at evaluation time.             |

`Fail` = measured-but-failed outcomes. `Error` = evaluation could not produce a measurement. Silent rules follow the same taxonomy but their verdict is not aggregated.

## 5. Region-Role Binding Matrix

| RuleKind              | SearchRegion | PatternRegion | MaskRegion             | MeasurementRegion            | ImageRegion |
| --------------------- | ------------ | ------------- | ---------------------- | ---------------------------- | ----------- |
| `PresenceAbsence`     | 1            | 0..1          | 0..N (child of search) | 0                            | 0           |
| `FlawDetect`          | 1            | 0             | 0..N (child of search) | 0                            | 0           |
| `Count`               | 1            | 1             | 0..N (child of search) | 0                            | 0           |
| `OcrText`             | 0            | 0             | 0                      | 1 (reserved; disabled in v1) | 0           |
| `GraphicDisplayCheck` | 0            | 1             | 0                      | 0                            | 1           |
| `MathExpression`      | 0            | 0             | 0                      | 0                            | 0           |

Any other combination is `RuleBadInput` at load time.

## 6. Ordering & Determinism

- Rules within a Task evaluate in `Rule.orderIndex` ascending order.
- `MATH_EXPRESSION` may only reference `ruleId` values whose `orderIndex` is strictly lower.
- Workers must reject a rule set that violates ordering (`E_RULE_BAD_INPUT`); no runtime reordering.

## 7. Cross-References

- Persistence: 22 §Rule, `paramsJson`, `outputsJson`.
- Overrides: 23 — `RuleOverride` may replace `paramsJson` and `toleranceRef`, never `ruleKind` or `boundRegionIds`.
- Authoring UI: 31 §Rule Builder — one form per active `ruleKind`; disabled-in-v1 kinds render unavailable and cannot be saved.
- JSON instruction output: 36 (upcoming) — serializes exactly the fields defined here.

## Acceptance Checklist

- [ ] Every rule kind has input schema, output metric, and tolerance model reference.
- [ ] New rule kind requires bump + entry in spec 24 results schema.
- [ ] Silent rules explicitly flagged and excluded from image verdict per spec 16.
