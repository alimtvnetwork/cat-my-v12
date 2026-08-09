# SS-01: Vendor Facade Binding Tables

Slug: facade-vendor-tables
Status: pending
Created: 2026-07-14
Parent: 23-blind-ai-remediation

## Scope

Add `## Facade Binding` sections to specs 63/64/65 (Pylon, Spinnaker, Vimba). Each section must contain:

1. Facade class name: `<Vendor>CaptureSdkFacade`.
2. Domain object table mapping vendor SDK types to `Cat`-prefixed domain objects (e.g. `pypylon.pylon.InstantCamera` -> `CatCaptureDevice`, `PySpin.ImagePtr` -> `CatCaptureFrame`).
3. Lifecycle method table: `open() / grab() / close()` with vendor call site and error normalization target (`E_CAP_*` from spec 40 Appendix A).
4. Buffer ownership note: caller-owned copy semantics per spec 68.
5. Back-link row to `spec/21-app/68-v2-vendor-sdk-contract.md` and `spec/21-app/52-sdk-facade-pattern.md`.

## Files touched

- `spec/21-app/63-v2-vendor-pylon.md`
- `spec/21-app/64-v2-vendor-spinnaker.md`
- `spec/21-app/65-v2-vendor-vimba.md`

## Verification

`grep -c "## Facade Binding" spec/21-app/6{3,4,5}-*.md` returns 1 for each file. Domain object table row count >= 4 per facade.
