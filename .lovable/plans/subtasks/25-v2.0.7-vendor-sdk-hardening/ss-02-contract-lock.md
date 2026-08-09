# SS-02 VendorDeviceIO contract lock

Slug: contract-lock
Parent: 25-v2.0.7-vendor-sdk-hardening
Status: pending
Created: 2026-07-14

## Goal

Freeze the `VendorDeviceIO` seam so all three adapters conform to one contract before parity work begins.

## Method

1. Update `spec/21-app/50-capture-modules.md`: pin method signatures, lifecycle order (open -> configure -> stream -> stop -> close), and the fault-mapping table.
2. Add "Contract back-links" rows from `63-v2-vendor-sdk-pylon.md`, `64-...-spinnaker.md`, `65-...-vimba.md`, and `66-v2-vendor-discovery.md` back to `50-capture-modules.md`.
3. Include the fault-code table verbatim in `50-capture-modules.md` so blind readers do not need to open Appendix A.

## Output

Diff to spec 50 + back-link rows in 63/64/65/66. Rubric score for spec 50 stays >= 90 (verify with `/tmp/rescore.py`).
