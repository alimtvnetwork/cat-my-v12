# SS-01 Adapter parity audit

Slug: adapter-parity-audit
Parent: 25-v2.0.7-vendor-sdk-hardening
Status: pending
Created: 2026-07-14

## Goal

Establish a source-of-truth table showing which `VendorDeviceIO` behaviors each adapter (Pylon, Spinnaker, Vimba) implements today and where each diverges.

## Method

1. Locate each adapter module (grep `class .*SdkFacade` and `VendorDeviceIO`).
2. For each adapter, record: open, close, single_shot, start_stream, stop_stream, get_frame, discovery, exception mapping.
3. For exception mapping, list every raised code and confirm it lands as `E_HW_TIMEOUT` / `E_HW_DISCONNECTED` / `E_HW_UNKNOWN`.
4. Write results to `.lovable/memory/v2/plan25/00-adapter-parity-baseline.md` with `path:line` citations.

## Output

Markdown table with columns: capability, Pylon, Spinnaker, Vimba, gap (Y/N), note. No code changes.
