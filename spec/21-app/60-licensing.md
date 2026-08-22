# 60 - Licensing and Feature Entitlements

Status: Draft (v0.1). Owner: platform. Locked decisions marked `[LOCKED]`, deferred items marked `[TBD]`.

## 60.1 Purpose

Gate product functionality behind a license issued by an external Licensing Server. The client does not decide what it is allowed to do by inspecting its own tier string; it asks a **feature policy engine** whether a named feature is enabled for the currently validated license. This mirrors Casbin's model of checking `enforce(subject, object, action)` rather than hardcoding role checks.

References (external, non-binding):

- Casbin (Go): https://github.com/apache/casbin
- PyCasbin: https://github.com/apache/casbin-pycasbin

We do not depend on Casbin at this time. The policy shape below is Casbin-compatible so we can adopt PyCasbin later without a schema change.

## 60.2 Tiers `[LOCKED]`

Three tiers, PascalCase, no underscores:

- `TierOne` - baseline inspection: local Rules, local Results, single vendor camera, no cloud sync.
- `TierTwo` - adds multi-vendor SDK selection, extended OCR engines, Results export.
- `TierThree` - adds Cloud Rule Catalog download, Rule Import/Export bundles, remote diagnostics.

Tier is not checked directly in code. Tier maps to a set of feature flags (60.4).

## 60.3 License Object `[LOCKED shape]`

Issued and signed by the Licensing Server. Stored locally under `config/license.lic` (opaque, signed payload).

```
LicenseRecord {
  licenseId:        string    // UUIDv4
  tier:             Tier      // TierOne | TierTwo | TierThree
  serialNumber:     string    // product serial bound to this license
  machineHash:      string    // hash of stable machine identifiers, see 60.6
  issuedAt:         ISO8601
  expiresAt:        ISO8601 | null
  features:         string[]  // explicit allow list, PascalCase names, see 60.4
  signature:        string    // server signature over the canonical JSON above
  signatureAlg:     "Ed25519" // [LOCKED]
}
```

The client trusts `features[]` only after `signature` verifies against the pinned server public key shipped in the build.

## 60.4 Feature Flags `[LOCKED naming rule, list is partial]`

Feature names are PascalCase, no underscores, no dots. They describe capabilities, not tiers.

Initial catalog:

| Feature | TierOne | TierTwo | TierThree |
| -------------------------- | :-----: | :-----: | :-------: | ------------------------------------------------------------------ |
| RunInspection | Y | Y | Y |
| ConfigureRules | Y | Y | Y |
| ExportResultsJson | Y | Y | Y |
| MultiVendorCameraSelection | - | Y | Y |
| ExtendedOcrEngines | - | Y | Y |
| CloudRuleCatalogDownload | - | - | Y |
| RuleBundleImport | - | - | Y | Locked in `spec/21-app/70-rule-bundle-import-export.md` (Plan 16). |
| RuleBundleExport | - | - | Y | Locked in `spec/21-app/70-rule-bundle-import-export.md` (Plan 16). |
| AuditBundleExport | - | Y | Y | Locked in `spec/21-app/71-audit-retention.md` §71.5.7. |
| AuditBundleExportSigned | - | - | Y | Signed download URL gate for private audit bundles. |
| AuditBundleExportAdmin | - | - | Y | Allows admin-write rows in audit bundle exports. |
| RemoteDiagnostics | - | - | Y |

New features are added by:

1. Appending a PascalCase name here.
2. Updating the Licensing Server tier map.
3. Wrapping the call site with `requireFeature("Name")`.

Do not gate code on `tier === "TierThree"`. Gate on the feature name.

## 60.5 Enforcement API `[LOCKED shape]`

Two surfaces, one policy engine.

TypeScript (Worker / UI):

```ts
type FeatureName =
  | "RunInspection"
  | "ConfigureRules"
  | "ExportResultsJson"
  | "MultiVendorCameraSelection"
  | "ExtendedOcrEngines"
  | "CloudRuleCatalogDownload"
  | "RuleBundleImport"
  | "RuleBundleExport"
  | "AuditBundleExport"
  | "AuditBundleExportSigned"
  | "AuditBundleExportAdmin"
  | "RemoteDiagnostics";

interface LicensePolicy {
  isFeatureEnabled(feature: FeatureName): boolean;
  requireFeature(feature: FeatureName): void; // throws FeatureNotLicensedError
  currentTier(): "TierOne" | "TierTwo" | "TierThree";
  licenseStatus(): "Valid" | "Expired" | "Invalid" | "Missing" | "Offline";
}
```

Python (capture / processing):

```py
class LicensePolicy:
    def is_feature_enabled(self, feature: str) -> bool: ...
    def require_feature(self, feature: str) -> None: ...  # raises FeatureNotLicensedError
    def current_tier(self) -> str: ...
    def license_status(self) -> str: ...
```

Errors are typed, PascalCase: `FeatureNotLicensedError`, `LicenseExpiredError`, `LicenseInvalidError`, `LicenseMissingError`.

## 60.6 Machine Binding `[LOCKED intent, inputs TBD]`

`machineHash` is a stable, non-reversible digest of hardware identifiers collected at first activation. Inputs [TBD]: candidates are primary NIC MAC, motherboard UUID, and Windows machine GUID. Hash: SHA-256 over the canonical concatenation. The server binds one license to one `machineHash`; rebinding requires a server-side re-issue.

## 60.7 Licensing Server `[TBD - user will specify]`

Placeholder contract, subject to change:

- `POST /v1/activate  { serialNumber, machineHash }  -> LicenseRecord`
- `POST /v1/validate  { licenseId, machineHash }     -> { status, features[], expiresAt }`
- `POST /v1/refresh   { licenseId, machineHash }     -> LicenseRecord`

Transport, authentication, rate limits, and offline grace period are [TBD]. Until specified, the client treats a missing server as `Offline` and honours the last cached signed `LicenseRecord` until `expiresAt`.

## 60.8 Startup Sequence `[LOCKED]`

1. Load `config/license.lic`. If missing -> `LicenseMissing`, only `TierOne` baseline features are exposed.
2. Verify signature against pinned public key. If invalid -> `LicenseInvalid`, block all non-baseline features.
3. Compare `machineHash` to locally computed hash. If mismatch -> `LicenseInvalid`.
4. If `expiresAt` in the past -> `LicenseExpired`.
5. On success, build the in-memory feature set from `features[]`. Emit an Ops event `LicenseValidated` with tier and feature count (never with the raw signature).
6. UI reads `licenseStatus()` and renders a banner for any non-`Valid` state.

Online re-validation cadence, retry, and grace window: [TBD].

## 60.9 Rule Bundle Import / Export `[LOCKED - see spec 70]`

Contract is fully defined in `spec/21-app/70-rule-bundle-import-export.md` (Plan 16, landed at v2.23.0). Summary of resolved items:

- Bundle container: `.catrules` ZIP wrapping either `BundleFormatSqlite` or `BundleFormatJson` payload plus `manifest.json`, `assets/images/<sha256>.<ext>`, and optional `signature.sig` (see §70.2, §70.3).
- Schema versioning: `schemaVersion` starts at `1`; older versions run through `MigrationLadder`; unknown newer versions raise `BundleSchemaUnsupportedError` (see §70.10).
- Cloud Rule Catalog signing: TierThree-only, pinned trust set, boundary described in §70.12 (rotation cadence still `[TBD]` and tracked in `spec/21-app/46-open-questions.md`).
- Conflict policy on import: `MergePolicyReplace`, `MergePolicyMergeById`, `MergePolicySkipExisting`, `MergePolicyNamespace` (see §70.9).
- Table set that travels: `Rules`, `RuleTolerances`, `RuleShapes`, `RuleImageRefs`, `BundleMeta`. Reference images travel as content-addressed sidecars; Results and license state never travel (see §70.1, §70.5).

Remaining `[TBD]` items (cloud transport, signing key rotation, image dedup across bundles, catalog auth model, review workflow, cache eviction) are mirrored into `spec/21-app/46-open-questions.md` §7 (Rule Bundle Follow-ups).

## 60.10 Non-Goals

- No per-user roles. This is a per-machine license. User roles remain the `public.user_roles` model in the backend and are unrelated to licensing.
- No client-side generation or mutation of the feature list. The client only reads what the server signed.
- No hardcoded tier comparisons in feature code paths.

## 60.11 Follow-ups

- Confirm Licensing Server contract (60.7).
- Confirm `machineHash` inputs (60.6).
- Decide Rule Bundle format (60.9).
- Evaluate PyCasbin adoption once the feature list grows past ~20 entries or gains conditional attributes (ABAC).

## Acceptance Checklist

- [ ] License validation runs at boot and on hot-reload; failure emits `E_LIC_INVALID`.
- [ ] Feature gates enumerated match `src/lib/license.ts` flags.
- [ ] Activation UI at `/settings/license` cited; admin-only per spec 44.
