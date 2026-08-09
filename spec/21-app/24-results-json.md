# 21 - Results JSON Shape

**Status:** Locked (Plan 04 Step 21, revised for PascalCase enums + per-rule status + safe-zone evidence). Governs `backend/db/tasks/<TaskId>/results/<RunSessionId>.jsonl` and the accompanying `<RunSessionId>.summary.json`.

Anchors: 15 (Dispatcher writes results), 22 (`Judgment`/`Result` DB rows are source of truth), 20 (append-only file contract), 33 (Rule Catalog reason codes), 34 (Tolerance Model).

## 1. Two Files per RunSession

| File                          | Owner      | Shape                                               | Write policy                         |
| ----------------------------- | ---------- | --------------------------------------------------- | ------------------------------------ |
| `<RunSessionId>.jsonl`        | Dispatcher | one JSON object per line = one `Result` (per-image) | Append-only, `fsync` after each line |
| `<RunSessionId>.summary.json` | Dispatcher | single JSON object                                  | Written once at RunSession close     |

Neither file is authoritative; `task.db` is. These files exist for export, offline replay, and AI-validation (43). They MUST be reproducible from `task.db`.

## 2. Enum Convention (LOCKED)

**All enum values in `.jsonl` and `.summary.json` are PascalCase.** No `SCREAMING_SNAKE_CASE`. This mirrors 22 §4, 33 §3, 34 §3, 36 §Envelope. Writers that emit legacy values (`OK`, `NG`, `PRESENT`, `SCALAR_RANGE`, `MIN_ONLY`, `E_RULE_BELOW_THRESHOLD`, …) fail lint with `E_BUG_ENUM_LEGACY` and are rejected by the results reader.

## 3. Per-Image Line Shape (`.jsonl`)

```json
{
  "schemaVersion": 2,
  "runSessionId": "01J8ZK...",
  "taskId": "01J8ZH...",
  "instructionId": "01J8ZI...",
  "resultId": "01J8ZL...",
  "imageId": "01J8ZM...",
  "imageSequence": "0042",
  "capturedAt": "2026-07-12T14:00:03.211Z",
  "persistedAt": "2026-07-12T14:00:03.298Z",
  "verdict": "Fail",
  "imageFilePath": "processed/0042.jpg",
  "ruleSet": {
    "ruleCount": 6,
    "activeCount": 5,
    "inactiveCount": 1,
    "silentCount": 0,
    "passCount": 4,
    "failCount": 1,
    "errorCount": 0,
    "rules": [
      {
        "ruleId": "01J8ZP...",
        "ruleKind": "PresenceAbsence",
        "orderIndex": 10,
        "status": "Active",
        "statusReason": null,
        "isEvaluated": true,
        "verdict": "Pass"
      },
      {
        "ruleId": "01J8ZS...",
        "ruleKind": "Count",
        "orderIndex": 20,
        "status": "Active",
        "statusReason": null,
        "isEvaluated": true,
        "verdict": "Fail"
      },
      {
        "ruleId": "01J8ZX...",
        "ruleKind": "GraphicDisplayCheck",
        "orderIndex": 30,
        "status": "Inactive",
        "statusReason": "AuthorDisabled",
        "isEvaluated": false,
        "verdict": null
      }
    ]
  },
  "judgments": [ ... see §4 ... ]
}
```

### Field rules

- `schemaVersion` - integer 2 (bump from 1: PascalCase enums, `ruleSet` block, `safeZone` in metrics, 4-digit `imageSequence`). Readers MUST reject unknown versions; readers MUST reject `schemaVersion=1` unless a compat flag is set.
- `imageSequence` - **4-digit zero-padded string** (per 25 §2). String, not integer, to preserve leading zeros in JSON.
- `verdict` - `Pass` | `Fail` | `Error`. Precedence per 22 §4.
- `ruleSet.rules[]` - one entry for EVERY rule in the instruction bundle, including `Inactive` and `Silent` ones. Ordered by `orderIndex` ascending.
- `ruleSet.rules[].status` - `Active` | `Inactive` | `Silent` (from 33 §Rule Status). `Inactive` = author disabled; `Silent` = evaluated but excluded from image verdict.
- `ruleSet.rules[].statusReason` - `AuthorDisabled` | `RegionMissing` | `ToleranceUnresolved` | `DisabledInV1` | `SilentByAuthor` | `SilentByOverride` | `null` when `status = Active`.
- `ruleSet.rules[].isEvaluated` - `false` for `Inactive` (skipped); `true` for `Active` and `Silent`.
- `ruleSet.rules[].verdict` - `null` when `isEvaluated = false`; else `Pass` | `Fail` | `Error`.
- `ruleSet.*Count` counters MUST sum consistently: `activeCount + inactiveCount + silentCount == ruleCount`; `passCount + failCount + errorCount == activeCount` (silent rules never contribute to image verdict).

## 4. Per-Judgment Shape (inside `judgments[]`)

One entry per rule where `isEvaluated = true` (Active + Silent). Skipped rules have NO judgment entry - they appear only in `ruleSet.rules[]`.

```json
{
  "judgmentId": "01J8ZN...",
  "ruleId": "01J8ZP...",
  "regionId": "01J8ZQ...",
  "ruleKind": "PresenceAbsence",
  "isSilent": false,
  "verdict": "Fail",
  "reasonCode": "RuleBelowThreshold",
  "reasonMessage": "Match percent below configured minimum.",
  "elapsedMs": 3.1,
  "metrics": {
    "measured": { "matchPercent": 41.0, "matchedX": 812, "matchedY": 476 },
    "expected": { "minMatchPercent": 80 },
    "tolerance": {
      "profileId": "01J8ZY...",
      "profileName": "PadPresence_Min80",
      "kind": "MatchPercent",
      "params": { "minPercent": 80 },
      "inclusive": "MinOnly"
    },
    "safeZone": {
      "kind": "XyBox",
      "profileId": "01J8ZZ...",
      "params": { "centerX": 800, "centerY": 480, "halfWidthPx": 20, "halfHeightPx": 20 },
      "measured": { "x": 812, "y": 476 },
      "deltaX": 12,
      "deltaY": -4,
      "isWithinSafeZone": true,
      "marginPx": { "x": 8, "y": 16 }
    },
    "reference": {
      "referenceHash": "b3a1...",
      "referenceRuleId": "01J...",
      "isReferenceResolved": true
    }
  }
}
```

### Field rules

- `isSilent` - mirrors `ruleSet.rules[].status == "Silent"`; workers evaluate the rule but the outer `verdict` MUST NOT count it.
- `reasonCode` - **PascalCase, from the closed set in 33 §4**. `null` when `verdict = Pass`.
- `reasonMessage` - human sentence; never a raw exception string; never contains PII.
- `metrics.measured` / `metrics.expected` - camelCase keys, rule-kind-specific per 33 §3. Every non-`Pass` verdict MUST populate both so a reader can reconstruct the failure without opening the image.
- `metrics.tolerance` - full inline copy of the resolved tolerance profile (per 34 §Profile). Never a bare ref; readers must not re-open `rules.db`.
- `metrics.safeZone` - present when the bound region carries an `XyBox` link (34 §3.3) OR when the rule kind naturally has a positional safe window. Fields:
  - `params` - the safe-zone box in image-space pixels.
  - `measured` - the observed `(x, y)`.
  - `deltaX` / `deltaY` - signed pixel offset from `center`.
  - `isWithinSafeZone` - `true` iff `|deltaX| <= halfWidthPx` AND `|deltaY| <= halfHeightPx`.
  - `marginPx` - remaining slack on each axis (`halfWidthPx - |deltaX|`, `halfHeightPx - |deltaY|`); negative when out of zone.
  - Omitted (not `null`) when the rule kind has no positional safe window.
- `metrics.reference` - present iff the rule uses a reference image; `isReferenceResolved = false` + `reasonCode = "ReferenceMissingOnDisk"` when the file is gone from `refs/`.

## 5. Summary File Shape (`.summary.json`)

```json
{
  "schemaVersion": 2,
  "runSessionId": "01J8ZK...",
  "taskId": "01J8ZH...",
  "startedAt": "2026-07-12T14:00:00.000Z",
  "endedAt": "2026-07-12T14:12:31.402Z",
  "status": "Completed",
  "counts": {
    "captured": 9999,
    "processed": 9999,
    "pass": 9527,
    "fail": 462,
    "error": 10
  },
  "throughput": {
    "capturedFpsAvg": 76.9,
    "processedFpsAvg": 76.5,
    "queueDepthMax": 187
  },
  "ruleSnapshotRef": "snapshots/01J8ZK....json",
  "ruleSnapshotSha256": "b3a1..."
}
```

- `status`: `Completed` | `Cancelled` | `Crashed`. Never `Running`.
- `counts` keys `pass`/`fail`/`error` mirror the PascalCase verdict values in lowercase JSON-key form (JSON keys are camelCase; enum VALUES are PascalCase - do not conflate).

## 6. Write Contract

```
1. Insert Judgment rows (task.db)
2. When every Active + Silent rule has landed:
   a. Insert Result row (task.db)
   b. Serialize Result + judgments + ruleSet block -> single JSON line
   c. Append to <RunSessionId>.jsonl
   d. fsync(file)
```

Every non-`Pass` judgment ALSO writes a structured log line at the same instant (41):

```
WARN [rule.eval] instructionId=... imageSequence=0042 ruleId=... ruleKind=PresenceAbsence
     status=Active isSilent=false verdict=Fail reasonCode=RuleBelowThreshold
     measured.matchPercent=41.0 expected.minMatchPercent=80
     tolerance.kind=MatchPercent tolerance.inclusive=MinOnly
     safeZone.isWithinSafeZone=true safeZone.deltaX=12 safeZone.deltaY=-4
     referenceHash=b3a1 elapsedMs=3.1
```

## 7. File Encoding & Line Format

- UTF-8, no BOM. One JSON object per line, `\n`-terminated. No pretty-print in `.jsonl`.
- Rotation: size-triggered at 256 MiB per part (24 §7 legacy) - unchanged.

## 8. Read Rules

- Reject unknown `schemaVersion`.
- Sort by `imageSequence` (string sort works because of zero-padding).
- Ignore unknown top-level keys; forbid unknown enum values.

## 9. Non-Goals

- No streaming to network in v1.
- No compression in v1.
- No image bytes / thumbnails in JSON.

## Acceptance Checklist

- [ ] JSONL v2 shape locked; adding fields requires a version bump documented here.
- [ ] `safeZone` block matches memory 09 `SafeZoneMetrics`.
- [ ] Every enum discriminant is PascalCase (`E_ENUM_CASE_DRIFT`).
