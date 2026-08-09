---
Slug: import-pipeline
Parent: 16-rule-bundle-import-export-spec
Status: final
Created: 2026-07-13
---

# SS-05 - Import Pipeline

Parent plan: `.lovable/plans/pending/16-rule-bundle-import-export-spec.md`
Parent spec: `spec/21-app/70-rule-bundle-import-export.md` §70.8

Precondition: caller holds `RuleBundleImport`. Cloud-origin bundles additionally require `CloudRuleCatalogDownload`. Caller supplies `sourcePath` + `MergePolicy` (see Plan step 9) + optional `namespace` (required only for `MergePolicyNamespace`).

1. Authorize `RuleBundleImport`, open the ZIP read-only, and enforce §70.3 caps and path rules before extraction.
2. Read `/manifest.json` only, validate SS-01 fields, and derive the expected payload path from `manifest.format`.
3. Stream payload bytes and compare SHA-256 to `manifest.checksum.payloadHex`.
4. For `CloudCatalog`, require `CloudRuleCatalogDownload` and verify Ed25519 over canonical manifest bytes plus payload bytes.
5. Load SQLite or JSON into the same in-memory `RuleRecord` staging graph.
6. Validate schema version, run the future `MigrationLadder` for older supported versions, and enforce referential integrity.
7. Stage image assets by content hash and verify every reference has an asset and every asset is referenced.
8. Resolve conflicts in memory using the §70.9 `MergePolicy` matrix before any live write.
9. Commit the rule graph inside one live DB transaction. Content-addressed image promotion is idempotent, and DB rows become visible only after commit.
10. Emit `RuleBundleImported` with `correlationId`, bundle metadata, merge counts, and bundle SHA-256, then cleanup staging.

## Failure semantics

- Every failure is typed and PascalCase (Plan step 11).
- Failed imports emit `RuleBundleImportFailed` with `correlationId`, phase, and reason code.
- No partial writes: either the commit in step 9 succeeds or nothing changes in the live DB.
- Status: final for Plan 16 Step 8.
