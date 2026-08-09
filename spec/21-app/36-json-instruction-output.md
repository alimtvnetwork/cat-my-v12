# 32 — JSON Instruction Output

**Status:** Locked (Plan 04 Step 32). Defines the canonical JSON payload emitted by Rule Setup and consumed unchanged by workers and results. This document is the single source of truth for the on-the-wire rule-set shape.

Anchors: 22 (Task DB tables), 23 (override cascade snapshot), 24 (results JSONL), 25 (file naming), 31 (`saveRuleSet`), 32 (Shape Model), 33 (Rule Catalog), 34 (Tolerance Model).

## 1. Purpose

Workers must never read `task.db` or `rules.db` directly at evaluation time. Instead, the Dispatcher hands each worker an **Instruction Bundle** — a fully resolved, immutable JSON document produced by folding the base rule set with the active override cascade. This spec locks that document.

## 2. Envelope

```json
{
  "SchemaVersion": 2,
  "InstructionId": "01J...ULID",
  "TaskId": "01J...ULID",
  "RunSessionId": "01J...ULID",
  "GeneratedAt": "2026-07-12T00:00:00Z",
  "OverrideLayerApplied": "Runtime | Task | None",
  "SourceHash": "sha256-hex",
  "Image": { ... },
  "Regions": [ ... ],
  "ToleranceProfiles": [ ... ],
  "Rules": [ ... ]
}
```

Rules:

- All keys are PascalCase (per `.lovable/memory/02-naming.md`). All enum VALUES are PascalCase (24 §2).
- `SchemaVersion` is an integer (2 = PascalCase enums + `Status` per rule); workers refuse unknown versions with `InstructionSchema` - no best-effort parse.
- `InstructionId` is a ULID and is the correlation ID in every log line and every `Result` row produced from this bundle.
- `SourceHash` is SHA-256 of the canonical (sorted-key, no-whitespace) serialization of `Regions + ToleranceProfiles + Rules`. Workers recompute and compare; mismatch is `InstructionTampered`.
- `OverrideLayerApplied` records which cascade layer (23) produced the merged snapshot (`Runtime` | `Task` | `None`).

## 3. `Image` Block

```json
"Image": {
  "ImageId": "01J...ULID",
  "SequenceNumber": "0042",
  "PathRelative": "images/inflight/0042.png",
  "WidthPx": 4096,
  "HeightPx": 3072,
  "CapturedAt": "2026-07-12T00:00:00.013Z"
}
```

`SequenceNumber` is the **4-digit zero-padded string** (25 §2). `PathRelative` is relative to the Task root (20). Absolute paths are `InstructionBadInput`.

## 4. `Regions` Block

Array; each entry mirrors 32 §Persisted Shape exactly:

```json
{
  "RegionId": "01J...ULID",
  "RegionRole": "SearchRegion | PatternRegion | MaskRegion | MeasurementRegion | ImageRegion",
  "ParentRegionId": "01J...ULID | null",
  "ShapeKind": "Rectangle | Ellipse | Polygon",
  "GeometryJson": { ... shape payload per 32 §4 ... },
  "XyToleranceRef": "profileId | null",
  "DisplayColorRole": "Search | Pattern | Mask | Measurement | Active"
}
```

Region ordering in the array is authoring order; workers evaluate rules in `Rules[].OrderIndex` order, not region order.

## 5. `ToleranceProfiles` Block

Every profile referenced by any `Rule.ToleranceRef` or `Region.XyToleranceRef` MUST appear inline; workers do not resolve profiles from a DB.

```json
{
  "ProfileId": "01J...ULID",
  "ProfileName": "PadPresence_Min80",
  "Kind": "ScalarRange | PercentRange | XyBox | MatchPercent",
  "ParamsJson": { ... per 34 §3 ... }
}
```

`Inclusive` values inside `ParamsJson` are `Both` | `MinOnly` | `MaxOnly` | `Neither` (PascalCase per 34 §3.1).

Unreferenced profiles MUST be pruned. Missing referenced profiles are `ToleranceUnresolved` at instruction load, before any pixel is read.

## 6. `Rules` Block

```json
{
  "RuleId": "01J...ULID",
  "RuleKind": "PresenceAbsence | FlawDetect | Count | OcrText | GraphicDisplayCheck | MathExpression",
  "OrderIndex": 10,
  "Status": "Active | Inactive | Silent",
  "StatusReason": "AuthorDisabled | RegionMissing | ToleranceUnresolved | DisabledInV1 | SilentByAuthor | SilentByOverride | null",
  "BoundRegionIds": ["01J...ULID", "..."],
  "ParamsJson": { ... per 33 §3 ... },
  "ToleranceRef": "profileId",
  "SecondaryToleranceRef": "profileId | null",
  "TimeoutMs": 150
}
```

Rules:

- `Status` mirrors 33 §Rule Status. `Inactive` rules are shipped in the bundle (so the results `ruleSet` block can render them) but never evaluated.
- `StatusReason` is required when `Status != Active`.
- `OrderIndex` is unique within the bundle and strictly increasing when sorted.
- `TimeoutMs` is resolved from 27 §Runtime; per-rule budget, never omitted.
- Any `ParamsJson` field that the rule kind does not recognize is `RuleBadInput` - workers do NOT silently drop unknown keys.

## 7. Canonicalization Rules

- Object keys sorted lexicographically before hashing.
- Numbers: integers as integers, floats with at most 6 decimal places and no trailing zeros beyond what round-tripping requires.
- Strings: UTF-8, no BOM, `\u` escaping only for control characters (< 0x20).
- Line endings: `\n` only in any file persisted to disk.

These rules exist so the `SourceHash` is stable across machines and OS. A worker that computes a different hash from the same bundle is broken; fix the canonicalizer, not the check.

## 8. Persistence & Handoff

- The bundle is written to `tasks/<TaskId>/instructions/<InstructionId>.json` via the atomic `.part → final` rename (14 §Atomic Rename).
- The Dispatcher passes only `InstructionId` + `ImageId` to workers over IPC (11 §Runtime Processes); workers open the file themselves. Passing the whole JSON over IPC is forbidden — it defeats the hash check and inflates the JSON-lines IPC.
- Bundles are retained per 27 §Retention alongside the `Result` rows they produced; a `Result` without its bundle on disk is `E_RESULT_ORPHAN` at export time.

## 9. Failure Taxonomy

| Code                  | When                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `InstructionSchema`   | Unknown `SchemaVersion`.                                                                  |
| `InstructionTampered` | `SourceHash` mismatch.                                                                    |
| `InstructionBadInput` | Absolute paths, missing required fields, non-PascalCase keys or values.                   |
| `InstructionMissing`  | Bundle file absent when worker opens it.                                                  |
| `InstructionStale`    | `OverrideLayerApplied` no longer matches the current cascade snapshot for the RunSession. |

All five are refusal-to-run errors: the worker rejects the image to `failed/` with the code and never guesses.

## 10. Cross-References

- Producer: 31 §Save (`saveRuleSet` writes the base bundle; Dispatcher folds overrides at RunSession start).
- Consumer: 11 §Worker.
- Result correlation: 24 §Results JSONL — every result row carries the same `InstructionId`.
- File paths and naming: 25 §File Naming.

## Acceptance Checklist

- [ ] Instruction JSON shape versioned; version field required (`E_INSTR_VERSION_MISSING`).
- [ ] Every shape/rule referenced exists in specs 32/33.
- [ ] Round-trip stable: parse → serialize → parse produces identical bytes.
