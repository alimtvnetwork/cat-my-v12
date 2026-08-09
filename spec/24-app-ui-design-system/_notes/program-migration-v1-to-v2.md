# Program migration fixtures v1 -> v2 (plan 30 step 29)

**Version:** 1.0.0 (2026-07-14, v3.33.0)
**Owner spec:** `06-state-persistence.md`
**Consumer suite:** `tests/unit/migrate.test.ts` (created in step 61+).

## Contract

`programs/<id>.json` is versioned by a top-level `schema: number` field. The migration runner in `src/lib/program-migrate.ts` (step 36) is forward-only: `migrate(json)` walks `schema` from its stored value to the current version, applying one pure step per bump. Missing `schema` is treated as `1`.

## v1 -> v2 delta

| Field | v1 | v2 | Reason |
| -------------------- | ------------- | ---------------------------------------------------------------------------- | ----------------------------------- | ---------- | ---------------------------- | --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema` | absent or `1` | `2` | Version stamp. |
| `rules[].kind` | `"presence"   | "count"` | `"C"                                | "R"        | "K"                          | "S" | "E"` | Align with `04-rule-layers.md` C/R/K/S/E. Map: `presence -> C`, `count -> R`. Unknown kinds -> log `W_UI_MIGRATE_UNKNOWN_KIND` and drop the rule. |
| `rules[].shape.type` | `"rect"       | "poly"` | `"rectangle"                        | "polygon"` | Match canvas geometry names. |
| `rules[].params` | flat map | `{ ...flat, thresholds: { ok, ng } }` if `okThreshold`/`ngThreshold` existed | Group thresholds. Old keys deleted. |
| `meta.savedAt` | ISO string | ISO string, unchanged | Passthrough. |
| `meta.editorVersion` | absent | current app version | Stamped by migration. |

Anything not listed is copied verbatim.

## Fixture set (under `tests/fixtures/migrations/` when suite lands)

- **M-01 empty v1:** `{ rules: [] }` -> `{ schema: 2, rules: [], meta: { editorVersion } }`. Proves the runner works with no rules.
- **M-02 presence -> C:** one presence rule with rect shape and `okThreshold: 0.8`, `ngThreshold: 0.5`. Expected v2: `kind: "C"`, `shape.type: "rectangle"`, `params.thresholds: { ok: 0.8, ng: 0.5 }`, `okThreshold`/`ngThreshold` removed.
- **M-03 count -> R:** one count rule with poly shape. Expected v2: `kind: "R"`, `shape.type: "polygon"`.
- **M-04 unknown kind dropped:** rule with `kind: "legacy_blob"` is dropped; `W_UI_MIGRATE_UNKNOWN_KIND` log expected with `rule_id` field; other rules preserved.
- **M-05 idempotent:** running `migrate` on already-v2 JSON returns deep-equal input except `meta.editorVersion` is refreshed. `schema` stays `2`.
- **M-06 explicit schema:1 same as missing:** `{ schema: 1, rules: [...] }` migrates identically to the same shape without `schema`.

## Regression guards

- `migrate` MUST be pure: no `Date.now()` inside; take `nowIso` and `editorVersion` as parameters so fixtures are deterministic.
- `migrate` MUST throw `E_UI_MIGRATE_UNSUPPORTED` if `schema > current`. Never silently downgrade.
- Every fixture asserts full deep-equal on the v2 output AND that the log lines listed above fired (via the log shim contract).

## Unblocks

Step 36 store bootstrap: safe program load path (`load -> migrate -> validate -> hydrate`) can be implemented against fixtures. Without this, a real saved program from v1 would fail silently on first load in step 36.
