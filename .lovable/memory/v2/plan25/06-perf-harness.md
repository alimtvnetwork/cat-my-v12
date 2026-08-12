# Plan 25 SS-07 — Perf harness (CI-lite)

Timestamp (UTC): 2026-08-12T13:26:52.178253+00:00
Backend: `FakeVendorSdk` → `VendorDeviceIO` → `ReferenceCaptureDriver` (no vendor SDK, no hardware).
Frames per run: 500. Target: median achieved_fps >= 77.

| Vendor | frames | achieved_fps | p50 ms | p95 ms | p99 ms | pass |
|---|---:|---:|---:|---:|---:|:---:|
| pylon | 500 | 908430.2 | 0.001 | 0.002 | 0.003 | ✅ |
| spinnaker | 500 | 831531.7 | 0.001 | 0.001 | 0.002 | ✅ |
| vimba | 500 | 939143.5 | 0.001 | 0.001 | 0.002 | ✅ |

Note: synthetic in-process grabs; the harness measures the `ReferenceCaptureDriver` → `VendorDeviceIO` seam, not raw silicon. Real-camera runs replace `FakeVendorSdk` with a vendor binding under `extras/vendors/*`.
