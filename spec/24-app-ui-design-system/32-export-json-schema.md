# 32 - Export JSON Schema (Rule + RuleSet)

**Version:** 1.0
**Owner:** Plan 64 step 34
**Depends on:** `15-export-import.md`, `spec/23-app-db/01-root-db-schema.md` §4.

---

## Purpose

The canonical wire format for a single Rule and for a whole RuleSet, used by JSON exports, YAML exports (`33-export-yaml-schema.md`), and the SQLite Zip bundle. This is the source of truth; every other format is a lossless projection.

## Envelope

```jsonc
{
  "$schema": "https://control-automation.local/schemas/rule-set-v1.json",
  "kind": "RuleSet",
  "version": "1.0.0",
  "generatedAt": "2026-07-16T12:34:56Z",
  "generatedBy": "control-automation@3.250.0",
  "checksumSha256": "<hex over the sorted canonical form of `payload`>",
  "payload": {/* RuleSet | Rule */},
}
```

- `kind`: `RuleSet` or `Rule`. Standalone rule export is used by clipboard copy/paste.
- `checksumSha256` is computed over `JSON.stringify(payload, sortedKeysReplacer)` with UTF-8 encoding, matching `computeSha256` in `spec/23-app-db/01-root-db-schema.md`.

## RuleSet payload

```jsonc
{
  "id": "uuid",
  "name": "Bottle-Neck",
  "description": "Inspects bottle neck OCR + presence.",
  "version": "1.2.0",
  "parentSnapshotId": null,
  "categories": ["uuid", "..."],
  "rules": [/* Rule[] in `sequence` order */],
  "shapes": [/* Shape[] referenced by rules */],
  "jsFunctions": [/* JsFunction[] referenced by rules */],
}
```

## Rule payload

```jsonc
{
  "id": "uuid",
  "ruleSetId": "uuid",
  "parentRuleId": null,
  "name": "PresenceOfCap",
  "kind": "Presence",
  "sequence": 0,
  "enabled": true,
  "geometry": {
    "roiX": 120,
    "roiY": 40,
    "roiW": 80,
    "roiH": 60,
    "roiRadius": null,
    "roiShapeId": null,
    "roiRotation": 0,
  },
  "params": {
    "presenceThreshold": 0.75,
    /* kind-specific keys only, mirrors columns per SQLite Column Contract */
  },
  "children": [/* Rule[] for Group kinds only */],
  "checksumSha256": "...",
}
```

## Shape payload

```jsonc
{
  "id": "uuid",
  "name": "NeckRing",
  "svgPath": "M0,0 h10 v10 h-10 z",
  "holes": [],
  "viewBoxW": 100,
  "viewBoxH": 100,
  "checksumSha256": "...",
}
```

## JsFunction payload

```jsonc
{
  "id": "uuid",
  "name": "GradeCap",
  "source": "export default async function grade(input, ctx) { ... }",
  "sandboxProfile": "strict",
  "paramsSchema": {/* JSON Schema draft-2020-12 for the function's params */},
  "checksumSha256": "...",
}
```

## Validation

- Every export is validated against `schemas/rule-set-v1.json` (JSON Schema draft-2020-12) at write time. Failure aborts the export with `code: 'IntegrityError'`.
- Every import re-validates before touching the DB.
- Unknown top-level fields are rejected (`additionalProperties: false` at the envelope level). Unknown keys inside `params` are rejected per-kind because kind-specific schemas also set `additionalProperties: false`.

## Versioning

- `version` on the envelope is the schema version, currently `1.0.0`. Breaking changes bump the major; new optional fields bump the minor.
- Imports of older majors are refused with `code: 'SchemaVersionUnsupported'`; a migration tool (out of scope for v1) will be the upgrade path.

## Verification

- Contract test: round-trip a fixture RuleSet through Zod schema, JSON Schema validator, and back through the DB. Assert byte-identical `payload` and matching checksum.
- Contract test: mutate one params value, assert checksum changes and import rejects the tampered bundle.
