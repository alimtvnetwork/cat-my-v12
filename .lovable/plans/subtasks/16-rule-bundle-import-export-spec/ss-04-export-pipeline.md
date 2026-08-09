---
Slug: export-pipeline
Parent: 16-rule-bundle-import-export-spec
Status: final
Created: 2026-07-13
---

# SS-04 - Export Pipeline

Parent plan: `.lovable/plans/pending/16-rule-bundle-import-export-spec.md`
Parent spec: `spec/21-app/70-rule-bundle-import-export.md` §70.7

Precondition: caller holds `RuleBundleExport` feature (see `spec/21-app/60-licensing.md`). Format is chosen by caller: `BundleFormatSqlite` or `BundleFormatJson`.

1. Resolve request: validate non-empty `ruleIds[]`, `format`, destination `.catrules`, and origin.
2. Snapshot `Rules`, `RuleTolerances`, `RuleShapes`, and `RuleImageRefs` in one read transaction, then close it before file I/O.
3. Validate the snapshot graph and reject missing selected rules or broken child references.
4. Normalize rows: stable sort, canonical JSON in geometry/tolerances, lowercase SHA-256, strip runtime-only cache fields.
5. Materialize `/payload.sqlite` per SS-02 or `/payload.json` per SS-03 in a staging directory.
6. Stage PNG assets under `/assets/images/<sha256>.png` and verify filename == SHA-256 bytes.
7. Compute `checksum.payloadHex`, build canonical `manifest.json`, and optionally write catalog signature metadata plus `/signature.sig`.
8. Assemble deterministic ZIP: manifest, payload, images sorted by filename, signature last, mtime `1980-01-01T00:00:00Z`, permissions `0644`.
9. Commit file atomically via `<destination>.tmp`, fsync where supported, then rename.
10. Emit `RuleBundleExported` with `correlationId`, `bundleId`, format, counts, origin, and bundle SHA-256.

## Failure semantics

- Any step failure aborts and removes the staging dir and any partial `.tmp` file.
- Failed exports emit `RuleBundleExportFailed` with `correlationId`, phase, and reason code.
- All typed errors are PascalCase (see Plan step 11).
- Status: final for Plan 16 Step 7.
