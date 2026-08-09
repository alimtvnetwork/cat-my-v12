# v2 Execution Order

Status: locked
Owner: Plan 14 Step 5
Baseline: v1.63.0 (v1.42.1-full signed off, mean 95.5 / 100, 0 findings)
Inputs: `spec/21-app/61-v2-scope.md`, `.lovable/memory/v2/01-ranked-backlog.md`, `.lovable/memory/v2/02-status-audit.md`, `.lovable/memory/v2/03-effort-risk-scoring.md`

This spec locks the release order for the six in-scope v2 workstreams. Each release is one workstream; a release ships only when every listed exit criterion is met and evidence is linked from the release notes.

## Rationale (why this order)

Vendor discovery (rank 2) is sequenced before Vendor SDK integration (rank 1) because:

1. Discovery has no hardware dependency; SDK proving requires a physical camera.
2. Discovery emits the `{vendor, serial}` selection that SDK proving consumes; without a persisted selection, SDK acceptance cannot be observed end-to-end.
3. Denial tuning depends on the admin-write path exercised by discovery's `I_SEC_ADMIN_WRITE` emission.

Retention (rank 3), DB clarity (rank 5), and Design polish (rank 6) trail the security-adjacent work because they carry no runtime risk and gate no other workstream.

## Sequence

| Release | Workstream                                                               | Effort / Risk | Hardware                    | Depends on                   |
| ------- | ------------------------------------------------------------------------ | ------------- | --------------------------- | ---------------------------- |
| v2.0.1  | Vendor discovery service + Settings UI selection                         | M / Med       | No                          | v1.42.1                      |
| v2.0.2  | Vendor SDK integration (Pylon, Spinnaker, Vimba behind `VendorDeviceIO`) | L / High      | Yes (one camera per vendor) | v2.0.1 selection persistence |
| v2.0.3  | Denial-burst tuning from telemetry                                       | M / Med       | No                          | v2.0.1 admin-write path      |
| v2.0.4  | Audit retention scheduler tuning surface                                 | S / Low       | No                          | none                         |
| v2.0.5  | DB-conventions clarity pass (docs only)                                  | S / Low       | No                          | none                         |
| v2.0.6  | Design-system polish (token compliance sweep) - **shipped @ v2.62.0**    | M / Low       | No                          | none                         |

## Exit criteria per release

### v2.0.1 - Vendor discovery service + Settings UI selection

Contract: `spec/21-app/66-v2-vendor-discovery.md:7-33`. Seam: `app/capture/vendor_device_io.py:52,71`.

1. `list_devices()` returns `VendorDeviceDescriptor{vendor, serial, model, transport, display_name}` for each of Pylon, Spinnaker, Vimba; SDK-absent path returns `[]` and logs a structured warning, never raises.
2. Settings surface persists `{vendor, serial}` through `SettingsStore` under subject `settings.capture.device`.
3. Every persist emits `I_SEC_ADMIN_WRITE` with actor, subject, and prior/next values.
4. Non-admin caller receives `E_SEC_DENIED`; unknown selection raises `E_CFG_UNKNOWN_DEVICE`.
5. `/ops` shows the selection audit row within one refresh interval.
6. Tests: per-adapter `list_devices` empty-path unit test; store admin-write success; store non-admin denied; unknown-selection error.

### v2.0.2 - Vendor SDK integration

Anchors: `spec/21-app/63-v2-vendor-pylon.md`, `11-vendor-spinnaker.md`, `12-vendor-vimba.md`. Adapters: `app/capture/pylon_device_io.py:114`, `spinnaker_device_io.py:175`, `vimba_device_io.py:158`. Harness: `app/capture/perf_harness.py`.

1. `open() -> grab() -> close()` round-trip against real hardware for each vendor.
2. Perf harness sustains >= 77 fps for 60 seconds per vendor with zero dropped frames logged.
3. Frame buffer ownership matches `VendorDeviceIO` contract (no vendor-thread reference after `release`).
4. Failure taxonomy mapped to `E_CAP_*` codes; no raw vendor exceptions surface to callers.
5. Evidence: perf harness JSON output linked from release notes, one file per vendor.

### v2.0.3 - Denial-burst tuning

Seat: `app/core/config/settings_store.py:33,75,197` (`DenialRateLimiter`).

1. Rate limiter thresholds live in `SettingsStore` and are admin-writable via `I_SEC_ADMIN_WRITE`.
2. Defaults derived from `/ops` denial telemetry over the prior 24h window (documented derivation).
3. Non-admin write denied with `E_SEC_DENIED`.
4. Tests: threshold change is honored on the next request without process restart; burst above threshold produces `E_SEC_DENIAL_BURST`.

### v2.0.4 - Audit retention scheduler tuning surface

Present at `app/supervisor/boot.py:71-91`.

1. Retention window is admin-configurable via `SettingsStore` subject `audit.retention`.
2. Change emits `I_SEC_ADMIN_WRITE` and is applied on the next scheduler tick.
3. Test: scheduler honors updated window without restart.

### v2.0.5 - DB-conventions clarity pass

Source: `.lovable/memory/02-naming.md`.

1. `spec/22-db/` reflects current naming (snake_case tables, singular vs plural rule, timestamp columns, RLS grant order).
2. No `app/**` or `src/**` code changed.
3. Cross-links from `.lovable/memory/02-naming.md` to the refreshed spec sections.

### v2.0.6 - Design-system polish

1. Zero hardcoded color, spacing, or radius literals in `src/**` (lint rule or grep evidence in release notes).
2. All new components consume `--hmi-*` tokens defined in `src/styles.css`.
3. Visual regression: `/`, `/setup`, `/run`, `/settings/*` screenshots match baseline within tolerance.

## Non-goals for v2

- Mobile layouts.
- Third-party auth providers beyond the current surface.
- New inspection tool families (kept for v3 scoping).

## Change control

Any change to this sequence requires a new plan entry citing which exit criterion drove the reorder, and an update to `.lovable/memory/v2/03-effort-risk-scoring.md`.

## ExecutionOrderFacade

| Method                           | Input                                       | Output                                        | Error code                                                 |
| -------------------------------- | ------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `listReleaseSequence()`          | none                                        | Ordered release rows from §Sequence           | `E_SPEC_DRIFT` when a release row lacks exit criteria      |
| `assertWorkstreamReady(release)` | PascalCase release id                       | readiness verdict plus missing evidence paths | `E_ACCEPT_UNPROVEN` when evidence is absent                |
| `recordSequenceChange(change)`   | reason, prior row, next row, correlation id | append-only governance event                  | `E_SPEC_ANCHOR_DRIFT` when the target spec link is missing |

The facade is documentation-side only until a release dashboard consumes it. Any implementation must keep the table in this file as the source of truth.

## Contract back-links

| Release | Discovery contract                        | SDK contract                               | Other contract                                                                                                                 |
| ------- | ----------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| v2.0.1  | `spec/21-app/67-v2-discovery-contract.md` | n/a                                        | `spec/21-app/66-v2-vendor-discovery.md`                                                                                        |
| v2.0.2  | `spec/21-app/67-v2-discovery-contract.md` | `spec/21-app/68-v2-vendor-sdk-contract.md` | `spec/21-app/63-v2-vendor-pylon.md`, `64-v2-vendor-spinnaker.md`, `65-v2-vendor-vimba.md`                                      |
| v2.0.3  | n/a                                       | n/a                                        | `spec/21-app/69-v2-denial-tuning-contract.md` + evidence `spec/21-app/69a-v2-denial-tuning-evidence.md` (provisional, Plan 29) |
| v2.0.4  | n/a                                       | n/a                                        | `spec/21-app/71-audit-retention.md`                                                                                            |
| v2.0.5  | n/a                                       | n/a                                        | `spec/21-app/72-audit-persistence.md`                                                                                          |
| v2.0.6  | n/a                                       | n/a                                        | `spec/24-app-ui-design-system/00-overview.md`                                                                                  |

## Implementation checklist

- [ ] No release advances without all exit criteria marked with evidence paths.
- [ ] Vendor SDK evidence links to one hardware run per vendor.
- [ ] Security-adjacent releases include admin-write and denial-path tests.
- [ ] Audit retention and persistence releases include SQLite query evidence.
- [ ] Any sequence change updates this file and `.lovable/memory/v2/03-effort-risk-scoring.md` in the same change.

## Acceptance Checklist

- [ ] Dependency graph is a DAG; no forward references (`E_SPEC_ORDER_CYCLE`).
- [ ] Every node cites its owning plan file and target version.
- [ ] Parallel-safe steps are marked and match `.lovable/plans/` batching.
