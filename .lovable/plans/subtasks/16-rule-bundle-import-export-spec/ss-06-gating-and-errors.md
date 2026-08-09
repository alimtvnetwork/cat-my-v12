# SS-06 Feature Gating, Error Taxonomy, Ops Events

Backs `spec/21-app/70-rule-bundle-import-export.md` §70.11.

## Locked

- Feature gates run first: `RuleBundleExport` (export), `RuleBundleImport` (import), `CloudRuleCatalogDownload` (cloud fetch + signature verify).
- Denial returns `FeatureNotLicensedError` and emits `RuleBundleExportDenied` / `RuleBundleImportDenied`. No ZIP open, no DB transaction.
- Cloud origin bundles additionally require `CloudRuleCatalogDownload` at import.
- Typed errors: `FeatureNotLicensedError`, `BundleInvalidError`, `BundleChecksumMismatchError`, `BundleSignatureInvalidError`, `BundleSchemaUnsupportedError`, `BundleMergeConflictError`, `BundleReferentialIntegrityError`.
- Errors always carry `bundleId?`, `phase`, `correlationId`. Never log raw signatures, payload rows, image bytes, or tolerance JSON.

## Ops events (exhaustive)

Success: `RuleBundleExportRequested` + `RuleBundleExported`; `RuleBundleImportRequested` + `RuleBundleImported`.
Denial: `RuleBundleExportDenied` / `RuleBundleImportDenied`.
Failure: exactly one `RuleBundleExportFailed` / `RuleBundleImportFailed` per failed pipeline run, with `phase`, `errorType`, `reasonCode`.

Digest fields log only `payloadSha256Prefix8` (first 8 hex chars).

## Reason codes (stable PascalCase)

`ChecksumMismatch`, `SignatureMissing`, `SignatureInvalid`, `MergeConflict`, `MigrationMissing`, `SchemaTooNew`, `EntryCapExceeded`, `PathTraversal`, `ManifestInvalid`, `PayloadInvalid`, `FeatureDenied`.

## Cross-links

- `spec/21-app/60-licensing.md` §60.9 (feature flag catalog).
- `spec/21-app/70-rule-bundle-import-export.md` §70.7, §70.8, §70.10.
