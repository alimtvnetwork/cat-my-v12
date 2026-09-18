# 30 — Tolerance Model

**Status:** Locked (Plan 04 Step 30). Defines how numeric tolerances are authored, persisted, resolved, and applied at evaluation time.

Anchors: 22 (`Rule.toleranceRef`), 23 (override cascade), 27 (`ToleranceDefaults` config layer), 31 (Rule Setup — tolerance sliders), 33 (Rule Catalog — verdict logic).

## 1. Purpose

Every rule verdict is a comparison of a measured scalar to a tolerance window. This spec locks the tolerance shape so that Rule Setup sliders, worker evaluation, and Results drill-in operate on identical numbers — never a UI-local copy.

## 2. Tolerance Profile

A `ToleranceProfile` is a named, reusable window persisted in `task.db`:

| Field                    | Rule                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| `profileId`              | ULID. Immutable.                                                           |
| `profileName`            | Human label; unique within a Task.                                         |
| `kind`                   | `ScalarRange` \| `PercentRange` \| `XyBox` \| `MatchPercent` (PascalCase). |
| `paramsJson`             | PascalCase JSON, schema per kind in §3.                                    |
| `createdAt`, `updatedAt` | ISO-8601 UTC.                                                              |

`Rule.toleranceRef` MUST reference a profile in the same Task. Cross-Task references are `E_RULE_BAD_INPUT`.

Inline (unnamed) tolerances are forbidden — this keeps the override cascade (23) able to swap a single profile and affect every rule that binds it.

## 3. Kinds

### 3.1 `ScalarRange`

- Params: `Min` (number), `Max` (number), `Inclusive` (`Both` \| `MinOnly` \| `MaxOnly` \| `Neither`, default `Both`).
- Applied by: `Count`, `MathExpression`, `FlawDetect.FlawCount`.
- Verdict: `Pass` when the measured scalar lies inside the window per `Inclusive`.
- Validation: `Min <= Max`. Else `ToleranceInvalid`.

### 3.2 `PercentRange`

- Params: `MinPercent` (0-100), `MaxPercent` (0-100), `Inclusive` (as above).
- Validation: `0 <= MinPercent <= MaxPercent <= 100`.

### 3.3 `XyBox` (Safe Zone)

- Params: `CenterX`, `CenterY`, `HalfWidthPx`, `HalfHeightPx` - integer image-space pixels (32 §Coordinate System).
- Applied by: grouped/linked shapes (32 §XY-Linked Bounds) to gate the allowed drift of a matched location. This is the **safe zone** surfaced in the results JSON (24 §4 `safeZone`).
- Verdict: `Pass` when `|X-CenterX| <= HalfWidthPx` AND `|Y-CenterY| <= HalfHeightPx`. Reason on fail: `RuleOutsideSafeZone`.
- Every judgment produced against an `XyBox`-linked region MUST include a `safeZone` metrics block (per 24 §4) with `deltaX`, `deltaY`, `isWithinSafeZone`, and `marginPx` so operators can see how close to the edge the run was.
- Validation: half-extents >= 1; box must lie inside the source image.

### 3.4 `MatchPercent`

- Params: `MinPercent` (0-100). Single-sided minimum.
- Applied by: `PresenceAbsence`, `Count` (per candidate), `GraphicDisplayCheck`.
- Verdict: `Pass` when measured `MatchPercent >= MinPercent`.
- Validation: `0 <= MinPercent <= 100`.

## 4. Rule-Kind -> Tolerance-Kind Compatibility

| RuleKind              | Allowed tolerance kinds                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `PresenceAbsence`     | `MatchPercent`                                                            |
| `FlawDetect`          | `ScalarRange` (on `FlawCount`)                                            |
| `Count`               | `ScalarRange` (on `MatchCount`) + optional `MatchPercent` (per candidate) |
| `OcrText`             | `MatchPercent` (as `MinConfidencePercent`)                                |
| `GraphicDisplayCheck` | `MatchPercent`                                                            |
| `MathExpression`      | `ScalarRange`                                                             |

`XyBox` binds to a Region link (32 §XY-Linked Bounds), not a `RuleKind`. Stored as `Region.xyToleranceRef`; every rule bound to that region evaluates it.

## 5. Defaults & Resolution Order

Tolerance defaults are seedable per 27 §ToleranceDefaults. Resolution order at evaluation time (highest wins):

1. `RulesDb.RuleOverride.toleranceRef` (23 §RUNTIME layer).
2. `RulesDb.RuleOverride.toleranceRef` (23 §TASK layer).
3. `TaskDb.Rule.toleranceRef` (author-committed base).
4. `AppConfig.ToleranceDefaults[ruleKind]` — used ONLY to seed the profile at rule creation; never consulted at evaluation time.

Evaluation-time resolution that fails to find a profile is `E_TOLERANCE_UNRESOLVED`, not a silent pass.

## 6. UI Semantics (Rule Setup)

- The tolerance panel in 31 §Rule Builder edits `paramsJson` of the referenced profile in place; changes flow through the atomic `saveRuleSet` RPC (31 §Save).
- Sliders bind to the same numeric domain as `paramsJson`. No rounding, quantization, or clamping happens client-side beyond what §3 mandates.
- The active override layer (23) is displayed via the override chip; the operator cannot mutate a `TASK` profile from a `RUNTIME` context without an explicit escalation.

## 7. Error Codes

| Code                    | Meaning                                        |
| ----------------------- | ---------------------------------------------- |
| `ToleranceInvalid`      | Profile params fail §3 validation.             |
| `ToleranceIncompatible` | Rule kind cannot use this tolerance kind (§4). |
| `ToleranceUnresolved`   | No profile found in the resolution chain (§5). |
| `ToleranceCrossTask`    | `toleranceRef` points outside the owning Task. |

All four are load-time errors that block `saveRuleSet`; none are permitted to surface for the first time at run time.

## 8. Cross-References

- Persistence: 22 §ToleranceProfile (to be added in migration `NNN_add_tolerance_profile.sql`).
- Overrides: 23 §RuleOverride — `toleranceRef` is a first-class overridable field.
- Config seeding: 27 §ToleranceDefaults.
- Rule verdict semantics: 33 §Common Contract, per-kind §3.
- Grouped/linked geometry: 32 §XY-Linked Bounds (consumes `XY_BOX`).

## Acceptance Checklist

- [ ] Tolerance operators (`Lt`, `Le`, `Gt`, `Ge`, `Between`, `Outside`) match memory 09.
- [ ] Every rule in spec 33 declares its tolerance kind.
- [ ] Numeric precision policy stated for float compares.
