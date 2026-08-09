# Rule Bundle Import/Export Spec (SQLite + JSON, ZIP-wrapped)

Slug: rule-bundle-import-export-spec
Steps: 12
Status: in-progress (Steps 1-12 spec landed at v2.23.0; cross-link + close-out pending)
Created: 2026-07-13
Numbering correction: spec authored at `spec/21-app/70-rule-bundle-import-export.md` (slot 61 is occupied by `61-v2-scope.md`; 70 is the next free slot after `69-v2-denial-tuning-contract.md`). All later steps target file 70.

## Context

Author `spec/21-app/61-rule-bundle-import-export.md` defining how Rules (rule-based validations) are exported/imported in two first-layer formats (SQLite DB, JSON), both wrapped in a ZIP container, and how TierThree users later pull curated bundles from a Cloud Rule Catalog. Unblocks the `[TBD]` in `spec/21-app/60-licensing.md` §60.9 (features `RuleBundleImport`, `RuleBundleExport`, `CloudRuleCatalogDownload`) and the pointer in `spec/21-app/46-open-questions.md`. Spec-only turn; no code, no migrations. Naming stays PascalCase, no underscores in enums.

Prior pending: `.lovable/plans/pending/15-v2.0.1-vendor-discovery.md` (Plan 15, v2.0.1 vendor discovery) remains active and is not touched by this plan.

No new commands or issues captured this turn.

## Steps

1. Add file header + purpose to `spec/21-app/61-rule-bundle-import-export.md`: scope (Rules + tolerances + reference geometry, optionally reference Images), non-goals (no Results, no license, no capture config), and link back to `60-licensing.md` §60.9 and `22-task-db.md`.
2. Lock the two first-layer formats and the outer container: `BundleFormatSqlite` and `BundleFormatJson` (PascalCase enum, no underscores), both wrapped in a ZIP producing a `.catrules` file. Define file extension, MIME, magic bytes, and how the loader auto-detects format from `manifest.json.format`.
3. Define the ZIP layout: `/manifest.json`, `/payload.sqlite` OR `/payload.json`, `/assets/images/<sha256>.png`, `/signature.sig` (optional, TierThree cloud bundles). Fix path casing, forbid absolute paths and `..` traversal, cap total uncompressed size (`[TBD MB]`).
4. Specify `manifest.json` fields (all required unless noted): `schemaVersion` (int), `bundleId` (UUIDv4), `format` (`BundleFormatSqlite`|`BundleFormatJson`), `createdAt` (ISO8601), `producer` {`appVersion`,`machineHash?`}, `ruleCount`, `imageCount`, `checksum` {`algorithm`:`Sha256`, `payloadHex`}, `origin` (`Local`|`CloudCatalog`), `signature?` block for cloud bundles. See `./subtasks/16-rule-bundle-import-export-spec/ss-01-manifest.md`.
5. Define the SQLite payload contract: tables `Rules`, `RuleTolerances`, `RuleShapes`, `RuleImageRefs`, `BundleMeta`; PRAGMA `user_version` = `schemaVersion`; primary keys are stable UUIDs (not autoincrement); foreign keys ON; no attached DBs; no triggers; row-count must match `manifest.ruleCount`. See `./subtasks/16-rule-bundle-import-export-spec/ss-02-sqlite-payload.md`.
6. Define the JSON payload contract: a single `payload.json` with top-level `{ schemaVersion, rules: RuleRecord[] }`, each `RuleRecord` carrying `id`, `name`, `kind` (`Presence`|`Circle`|`Rectangle`|`Ocr`|`Barcode`|`DataMatrix`), `tolerances`, `shape`, `imageRefs[]`. Byte-for-byte equivalent to the SQLite payload for the same bundle. See `./subtasks/16-rule-bundle-import-export-spec/ss-03-json-payload.md`.
7. Specify the 10-step Export pipeline end-to-end (collect selected rule IDs -> snapshot rows in a read transaction -> normalize -> serialize to chosen format -> hash images and copy under `/assets/images/` -> compute payload SHA-256 -> write `manifest.json` -> optional sign -> ZIP with deterministic entry order and fixed mtime for reproducibility -> emit Ops event `RuleBundleExported`). See `./subtasks/16-rule-bundle-import-export-spec/ss-04-export-pipeline.md`.
8. Specify the 10-step Import pipeline end-to-end (open ZIP with size + entry cap -> parse manifest -> verify checksum -> if cloud, verify signature -> open payload in a temp/staging area -> validate schema and referential integrity -> resolve id collisions per merge policy -> stage image assets by sha256 -> commit atomically inside a single transaction -> emit Ops event `RuleBundleImported`). See `./subtasks/16-rule-bundle-import-export-spec/ss-05-import-pipeline.md`.
9. Lock the Merge Policy enum (PascalCase, no underscores): `MergePolicyReplace`, `MergePolicyMergeById`, `MergePolicySkipExisting`, `MergePolicyNamespace` (prefix imported rule names with a caller-supplied namespace). Define exact conflict resolution per policy for each of: same `ruleId`, same `name` different `ruleId`, orphan image asset, unknown `RuleKind`.
10. Define versioning + compatibility: `schemaVersion` starts at `1`; import accepts `schemaVersion <= currentSupported`; older versions run through an in-memory `MigrationLadder`; unknown newer versions produce a typed `BundleSchemaUnsupportedError` and abort with no partial write. Document how a new `schemaVersion` bump requires a matching migration entry.
11. Define feature gating + errors (ties to `60-licensing.md`): `RuleBundleExport` gates local export, `RuleBundleImport` gates local import, `CloudRuleCatalogDownload` gates cloud fetch + signature verification. Typed errors, PascalCase: `BundleInvalidError`, `BundleChecksumMismatchError`, `BundleSignatureInvalidError`, `BundleSchemaUnsupportedError`, `BundleMergeConflictError`, `FeatureNotLicensedError`. Every failure logs a structured Ops event with `bundleId` and reason code; never logs raw signatures.
12. Add a Cloud Rule Catalog section (forward-looking, all `[TBD]` items called out): endpoints sketch (`GET /v1/catalog`, `GET /v1/bundles/{bundleId}`, `POST /v1/bundles` for owner uploads), signing key rotation, TierThree-only client behavior, offline cache under `config/catalog-cache/`, and an explicit "Open Questions" block listing every unresolved decision (max bundle size, image asset dedup across bundles, whether Tolerances travel with Rules or are versioned separately, catalog auth model, owner-side review workflow).

## Verification

- File `spec/21-app/70-rule-bundle-import-export.md` exists and covers every step above with matching section numbers.
- Subtask files exist under `.lovable/plans/subtasks/16-rule-bundle-import-export-spec/`: `ss-01-manifest.md`, `ss-02-sqlite-payload.md`, `ss-03-json-payload.md`, `ss-04-export-pipeline.md`, `ss-05-import-pipeline.md`.
- All enums in the new spec are PascalCase with no underscores (grep confirms).
- `spec/21-app/60-licensing.md` §60.9 and `spec/21-app/46-open-questions.md` cross-link to the new file in a follow-up execution turn (not this planning turn).
- Open Questions block lists every `[TBD]` so nothing is silently assumed.

## Progress log

- v2.18.0: Steps 1-2 landed (§70.1 purpose/scope, §70.2 formats/container).
- v2.19.0: Steps 3-4 landed (§70.3 ZIP layout, §70.4 manifest contract).
- v2.20.0: Steps 5-6 landed (§70.5 SQLite payload, §70.6 JSON payload).
- v2.21.0: Steps 7-8 landed (§70.7 export pipeline, §70.8 import pipeline).
- v2.22.0: Steps 9-10 landed (§70.9 merge policy matrix, §70.10 schema versioning).

## Appended from prior pending tasks

- `.lovable/plans/pending/15-v2.0.1-vendor-discovery.md` (Plan 15) remains pending; not modified by this plan.
