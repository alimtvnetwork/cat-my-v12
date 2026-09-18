# 80 - Ruleset Draft-Save Contract

## Purpose

Formalize the two-tier persistence path for rule authoring:

1. **Quick edits (per keystroke, per drag)** land in the browser's
   **IndexedDB** under `store: "rule_drafts"`. No network round-trip.
2. **User-committed save (explicit Save button)** POSTs the same JSON
   envelope to the backend, which validates it and upserts into the
   SQLite **rules** table (see `22-task-db.md` / `23-rules-db-overrides.md`).

The JSON schema is identical in both tiers so the FE never re-shapes the
payload between draft and commit. This is the single contract that all
subsequent steps (FE IndexedDB store, BE POST/PUT route, idempotent upsert,
draft-vs-committed reconciliation) must target.

## Wire schema (`RuleSetEnvelope`)

```json
{
  "SchemaVersion": 1,
  "RuleSetId": 42,
  "Name": "MERCURY2 - Housing v3",
  "Version": 7,
  "Enabled": true,
  "Rules": [
    {
      "Id": 1,
      "Kind": "presence" | "absence" | "match" | "measure",
      "Enabled": true,
      "Shape": { "Type": "rect", "X": 120, "Y": 80, "W": 240, "H": 160 },
      "Tolerance": { "Kind": "pct", "Value": 5.0 },
      "Params": { }
    }
  ],
  "DraftMeta": {
    "ClientId": "uuid-v4",
    "UpdatedAt": "2026-07-21T12:34:56Z",
    "Origin": "indexeddb" | "server"
  }
}
```

PascalCase on the wire, matches the Universal Response Envelope. The FE
mirrors this exact shape into IndexedDB with no field renaming.

## Flow

```text
[user drags shape]
      |
      v
IndexedDB.put({RuleSetId, ...})   <- Origin: "indexeddb"
      |
[user clicks Save]
      |
      v
PUT /rules/{RuleSetId} + Envelope   <- BE validates, upserts SQLite,
      |                                returns canonical row
      v
IndexedDB.put(response)             <- Origin: "server", DraftMeta refreshed
```

## Error codes reused

- `E_BE_BAD_REQUEST` (400): schema violation on PUT payload.
- `E_BE_NOT_FOUND` (404): PUT to an unknown `RuleSetId` without create intent.
- `E_BE_CONFLICT` (409): stale `Version` on optimistic-concurrency check.
- `E_BE_INTERNAL` (500): SQLite write failure.

No new error codes are introduced by this contract.

## Implementation steps that consume this contract

- **131 (this step)**: pure `RuleSetEnvelope` dataclass + validator.
- **132**: FE `src/lib/rules/draftStore.ts` IndexedDB wrapper.
- **133**: BE `PUT /rules/{id}` route + facade `save_rule_set()`.
- **134**: Optimistic-concurrency guard + conflict resolution UI.
- **135**: Draft-vs-committed reconciliation on app boot.

Out of scope for this spec: rule bundle import/export (see
`70-rule-bundle-import-export.md`); shape rendering (`32-shape-model.md`).
