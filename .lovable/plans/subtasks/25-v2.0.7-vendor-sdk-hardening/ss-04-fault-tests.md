# SS-04 Fault-mode integration tests (CI-lite)

Slug: fault-tests
Parent: 25-v2.0.7-vendor-sdk-hardening
Status: pending
Created: 2026-07-14

## Goal

Prove the three failure modes end-to-end for each adapter without requiring physical hardware in CI.

## Method

1. Provide a `FakeVendorSdk` per vendor that can be scripted to raise timeout, disconnect, and unknown errors.
2. Add pytest cases: `test_pylon_timeout_maps_to_E_HW_TIMEOUT`, `test_spinnaker_disconnect_maps_to_E_HW_DISCONNECTED`, `test_vimba_unknown_maps_to_E_HW_UNKNOWN` (and the full 3x3 matrix).
3. Assert each failure writes an audit row via the local SQLite sink (`sink_sqlite.py`).

## Output

New pytest module under the adapter tests directory + audit-row assertion helper. All 9 cases must be green before Step 7.
