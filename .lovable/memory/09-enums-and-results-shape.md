---
name: Enums, image sequence, results shape
description: PascalCase enum policy, 4-digit image sequence, per-image ruleSet block, safeZone metrics, PascalCase reason codes
type: feature
---

## Locked decisions (2026-07-13)

### Image sequence

- 4-digit zero-padded string per RunSession: `0001..9999`. New RunSession resets to `0001`. Not 9-digit. Update everywhere: 25 §2, 25 §4.1, 36 `SequenceNumber`, 24 `imageSequence`.

### Enum casing (project-wide)

- **Type Suffix**: All Enum names MUST end in `Type` or `Category` (e.g., `DockSlotType`, `PanelModeType`) to make them instantly recognizable as enums.
- **Namespace Equality Helpers**: Never check for equality using `=== EnumType.Value`. Always use the semantic namespace helpers (e.g., `DockSlotType.isHidden(state.dock)`).
- All enum VALUES are **PascalCase**. JSON keys stay camelCase; DB column names stay camelCase.
- No `SCREAMING_SNAKE_CASE` in any new emitter. Legacy values fail lint with `E_BUG_ENUM_LEGACY`.
- Boundary error codes (Tier codes `E_SEC_*`, `E_HW_*`, `E_BUG_*` in 40 §Appendix) are the ONLY exception - those are a separate contract for the error-tier envelope; they stay `E_AREA_CONDITION`.
- Rule reason codes are NOT boundary error codes. They are PascalCase (`RuleBelowThreshold`, `RuleOutsideSafeZone`, `ReferenceMissingOnDisk`, …). See 33 §4.

### PascalCase mapping (canonical)

- Verdict: `Pass` | `Fail` | `Error` (was OK/NG/ERROR).
- Image.status: `Pending` | `Inflight` | `Processed` | `Failed`.
- Region.shapeKind: `Rectangle` | `Ellipse` | `Polygon`.
- RegionRole: `SearchRegion` | `PatternRegion` | `MaskRegion` | `MeasurementRegion` | `ImageRegion`.
- DisplayColorRole: `Search` | `Pattern` | `Mask` | `Measurement` | `Active`.
- RuleKind: `PresenceAbsence` | `FlawDetect` | `Count` | `OcrText` | `GraphicDisplayCheck` | `MathExpression`.
- Rule.status: `Active` | `Inactive` | `Silent`.
- Rule.statusReason: `AuthorDisabled` | `RegionMissing` | `ToleranceUnresolved` | `DisabledInV1` | `SilentByAuthor` | `SilentByOverride`.
- Tolerance.kind: `ScalarRange` | `PercentRange` | `XyBox` | `MatchPercent`.
- Inclusive: `Both` | `MinOnly` | `MaxOnly` | `Neither`.
- OverrideLayerApplied: `Runtime` | `Task` | `None`.
- RunSession.status: `Completed` | `Cancelled` | `Crashed`.
- Presence mode: `Present` | `Absent`.

### Per-image `ruleSet` block in `.jsonl` (new)

Every result line carries a `ruleSet` object listing EVERY rule (Active, Inactive, Silent) with:

- `ruleId`, `ruleKind`, `orderIndex`
- `status`, `statusReason`
- `isEvaluated` (false for Inactive)
- `verdict` (null when not evaluated)
  Counters: `ruleCount`, `activeCount`, `inactiveCount`, `silentCount`, `passCount`, `failCount`, `errorCount`. Silent rules never contribute to the image verdict.

### `safeZone` in judgment metrics (new)

Every judgment where the bound region carries an `XyBox` link MUST include `metrics.safeZone` with `params`, `measured`, `deltaX`, `deltaY`, `isWithinSafeZone`, `marginPx`. Fail reason on out-of-zone is `RuleOutsideSafeZone`.

### `metrics.tolerance` inline copy

Every non-Pass judgment MUST inline the resolved tolerance profile (id, name, kind, params, inclusive). Readers must not re-open `rules.db`.

### Additional PascalCase enum locks (2026-07-14, Plan 22 Step 49 close-out)

- `LogLevel`: `LogLevelDebug` | `LogLevelInfo` | `LogLevelWarn` | `LogLevelError`.
- `Proc`: `ProcUi` | `ProcServer` | `ProcDispatcher` | `ProcWorker`.
- `FacadeCapability`: `Read` | `Write` | `Stream` | `Bulk`.
- `CaptureLifecycleState`: `Closed` | `Opened` | `Armed` | `Grabbing` | `Disarmed` | `Faulted`.
- `DenialTuningKey`: `Threshold` | `WindowMs` | `CoolDownMs`.
- `BundleMergePolicy`: `RejectOnConflict` | `PreferIncoming` | `PreferExisting` | `AppendVersion`.
- `RetentionBand`: `RetentionShort` | `RetentionStandard` | `RetentionLong` | `RetentionForensic`.
- `AuditStoreBackend`: `Sqlite` | `Jsonl` | `Memory`.
- `DiscoveryTransport`: `Usb` | `GigE` | `CameraLink` | `CoaXPress`.
- `DiscoveryVendor`: `Basler` | `Flir` | `AlliedVision`.
- `PylonPixelFormat`: `Mono8` | `Mono12` | `BayerRG8` | `BGR8`.
- `SpinnakerAcquisitionMode`: `Continuous` | `SingleFrame` | `MultiFrame`.
- `VimbaTriggerSource`: `Software` | `Line0` | `Line1` | `FixedRate`.
- `VendorTrack`: `Stable` | `Beta` | `Deprecated`.

Wire error codes (`E_*`, `W_*`, `I_*`) remain SCREAMING per 40 §Appendix A.3 taxonomy carve-out; each PascalCase exception class MUST expose a `code` attribute equal to exactly one row in that appendix.

### Booleans

Continue with `is`/`has`/`should` prefixes (mem 02). New: `isEvaluated`, `isSilent`, `isWithinSafeZone`, `isReferenceResolved`.

### SchemaVersion bumps

- Results JSONL: `2` (24 §3).
- Instruction bundle: `2` (36 §Envelope). Workers refuse v1 bundles.

## Pending sweep (not yet done)

Places still holding legacy enum values, to be cleaned in next audit pass:

- `app/dispatcher/instruction_bundle.py` (schema constant + tests)
- `app/worker/runner.py` (JudgmentCode `OK`)
- merged app DB and v2 schema tables under `spec/21-app/*`
- Rules DB migration + tests under `tests/contract/test_rules_engine.py`, `tests/contract/test_result_jsonl.py`
- UI verdict badges (`Pass`/`Fail`/`Error` copy + tokens)

### Query Result Pattern (2026-08-08)

All backend database queries MUST use the `safe_execute` wrapper on `_GuardedConnection` rather than raw `execute()`.

- **Result Object**: Queries return a `QueryResult` object with `is_success`, `is_failure`, `data`, and `error`.
- **Logging**: The `safe_execute` wrapper automatically logs any query failures, reducing repetitive logging blocks.
- **Enforcement**: Never check for existence manually using inverse logic (e.g., `isFailed = !exists`); explicitly check `result.is_failure`.
