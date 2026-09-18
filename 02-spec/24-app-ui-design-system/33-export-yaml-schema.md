# 33 - Export YAML Schema (mirror of JSON)

**Version:** 1.0 (draft, BLOCKED by Q15 for tag conventions and float precision)
**Owner:** Plan 64 step 35
**Depends on:** `32-export-json-schema.md`.

---

## Purpose

YAML is a human-editable projection of the JSON schema in `32-export-json-schema.md`. It is NEVER the authoritative source: every YAML export carries the same `checksumSha256`, computed over the JSON canonical form, so tampering YAML by hand breaks the checksum.

## Rules

- Serialisation library: `js-yaml` with the following options: `noRefs: true`, `sortKeys: false` (preserve JSON key order), `lineWidth: 120`, `quotingType: '"'`, `forceQuotes: false`.
- The YAML MUST parse to a JS object that is `deepEqual` to the JSON payload. This is checked at import time (parse YAML -> serialise to canonical JSON -> compare against embedded `payload` field). Mismatch => `code: 'IntegrityError'`.
- Anchors and aliases are forbidden; every reference is inlined. This is enforced by `noRefs: true` on export and by a pre-parse scan on import (rejects `&anchor` and `*alias` outside string values).
- Custom tags are forbidden (`!type` prefixes). Only the standard `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, `!!map`, `!!seq` types are allowed; unknown tags cause a parse error.

## Envelope

```yaml
$schema: https://control-automation.local/schemas/rule-set-v1.json
kind: RuleSet
version: 1.0.0
generatedAt: "2026-07-16T12:34:56Z"
generatedBy: control-automation@3.250.0
checksumSha256: "<hex>"
payload:
  # RuleSet or Rule mirror of the JSON payload
```

## Numeric precision (BLOCKED by Q15)

- Working assumption: floats round-trip via `toFixed(6)` on export, and imports parse with the JS number path. Q15 will finalise whether we drop trailing zeros or standardise on always-6-decimals to keep textual diffs stable.

## Verification

- Contract test: export a fixture RuleSet as JSON and YAML. Parse YAML -> re-serialise as canonical JSON -> byte-equal to the JSON export.
- Contract test: hand-edit a numeric field in the YAML by one unit, import, assert `code: 'IntegrityError'` because the checksum no longer matches the payload.

## Open ambiguity

- Q15: float precision policy, whether comments are allowed (proposal: allowed on export but stripped before checksum recomputation, so comments never affect integrity).
