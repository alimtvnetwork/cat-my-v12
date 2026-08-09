# v2 Scope

Anchors the v2 track. v1.21 shipped READY with 0 blockers / 0 High / 0 Medium
findings; v2 hardens the seams that v1 stubbed or deferred.

## In-scope for v2

1. **Real vendor SDK integration behind `VendorDeviceIO`** - Pylon first, then Spinnaker and Vimba. Anchor: `spec/21-app/50-capture-modules.md`. Exit criteria: fault-mode integration tests pass against a physical camera in CI-lite.
2. **Audit log retention & rotation** - policy-based pruning of `audit_log`, itself auditable. Anchor: `spec/21-app/51-security-and-config-modules.md`. Implementation seam: `app/core/security/retention.py::AuditLogRetention` (stub landed at v1.22). Exit criteria: retention runs on schedule and emits `I_SEC_AUDIT_PRUNED`.
3. **Denial-burst threshold tuning from live telemetry** - replace hard-coded thresholds in `remediation.py::DenialRateLimiter` with settings-store-driven values, admin-writable and audited.
4. **Design-system polish** - raise Design area score above 90 (currently 87.5).
5. **DB-conventions clarity pass** - raise DB area score above 90 (currently 85.4).
6. **Vendor discovery service** - enumerate Pylon, Spinnaker, and Vimba devices before selecting a capture vendor. Anchor: `spec/21-app/66-v2-vendor-discovery.md`.

## Out-of-scope for v2

- Multi-tenant auth model (still single-operator).
- Cloud-hosted audit shipping (local SQLite only).
- Replacing SQLite with a networked DB.

## Governance

- Every v2 module MUST land with a `spec/21-app/**` anchor in the same change; no new orphan-anchor findings will be tolerated at the v2 audit.
- Error codes added by v2 MUST extend `spec/21-app/40-error-manage.md` Appendix A in the same change.
- Version scheme: v2 starts at **2.0.0** only after all in-scope items ship and a spec-vs-code re-audit records 0 High findings.

## Related

- Current audit signoff: `spec/25-app-audit/latest/40-signoff.md`
- Audit overview: `spec/25-app-audit/00-overview.md`

## Facade governance

| Workstream             | Required facade                                                               | Canonical spec                                |
| ---------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| Vendor SDK integration | `PylonCaptureSdkFacade`, `SpinnakerCaptureSdkFacade`, `VimbaCaptureSdkFacade` | `spec/21-app/68-v2-vendor-sdk-contract.md`    |
| Vendor discovery       | `VendorDiscoveryFacade`                                                       | `spec/21-app/67-v2-discovery-contract.md`     |
| Release sequencing     | `ExecutionOrderFacade`                                                        | `spec/21-app/62-v2-execution-order.md`        |
| Denial tuning          | `DenialTuningFacade`                                                          | `spec/21-app/69-v2-denial-tuning-contract.md` |
| Rule bundles           | `RuleBundleSqliteFacade`, `RuleBundleJsonFacade`                              | `spec/21-app/70-rule-bundle-import-export.md` |
| Audit retention        | `AuditRetentionFacade`                                                        | `spec/21-app/71-audit-retention.md`           |
| Audit persistence      | `AuditPersistenceFacade`                                                      | `spec/21-app/72-audit-persistence.md`         |

## Back-link map

| Scope item                       | Follow-up spec                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Vendor discovery service         | `spec/21-app/66-v2-vendor-discovery.md`, `spec/21-app/67-v2-discovery-contract.md`                                        |
| Vendor SDK integration           | `spec/21-app/63-v2-vendor-pylon.md`, `64-v2-vendor-spinnaker.md`, `65-v2-vendor-vimba.md`, `68-v2-vendor-sdk-contract.md` |
| Denial-burst threshold tuning    | `spec/21-app/69-v2-denial-tuning-contract.md`                                                                             |
| Audit log retention and rotation | `spec/21-app/71-audit-retention.md`                                                                                       |
| DB-conventions clarity pass      | `spec/21-app/72-audit-persistence.md`                                                                                     |
| Rule bundle import and export    | `spec/21-app/70-rule-bundle-import-export.md`                                                                             |

## Implementation checklist

- [ ] Each v2 module lands with a spec anchor and linked audit evidence.
- [ ] Each v2 error code is present in `spec/21-app/40-error-manage.md` Appendix A before code emits it.
- [ ] Each v2 enum value is PascalCase unless it is a wire `E_*`, `W_*`, or `I_*` code.
- [ ] Each SDK, discovery, audit, and bundle boundary uses the facade named in this file.
- [ ] Release notes include before and after verification signals for every shipped workstream.

## Acceptance Checklist

- [ ] Every v2 deliverable maps to a plan file under `.lovable/plans/`.
- [ ] Non-goals enumerated to prevent scope creep; drift raises `E_SPEC_SCOPE_DRIFT`.
- [ ] GA acceptance bullets cross-link to specs 63-72 owners.
