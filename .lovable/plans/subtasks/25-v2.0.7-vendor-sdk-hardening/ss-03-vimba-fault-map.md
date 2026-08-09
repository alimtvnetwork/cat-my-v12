# SS-03 Vimba fault-mapping

Slug: vimba-fault-map
Parent: 25-v2.0.7-vendor-sdk-hardening
Status: pending
Created: 2026-07-14

## Goal

Guarantee that every Vimba SDK exception surfaces as one of `E_HW_TIMEOUT`, `E_HW_DISCONNECTED`, or `E_HW_UNKNOWN` at the `VendorDeviceIO` boundary; no vendor exception may leak.

## Method

1. Enumerate Vimba error codes / exception classes actually caught in the adapter.
2. Build a `VMB_ERR_* -> E_HW_*` mapping table; anything unmapped defaults to `E_HW_UNKNOWN` with the vendor code preserved in the log payload.
3. Add unit tests that raise each Vimba error and assert the emitted app code.

## Output

Adapter change + test file + mapping table pinned in `.lovable/memory/v2/plan25/`.
