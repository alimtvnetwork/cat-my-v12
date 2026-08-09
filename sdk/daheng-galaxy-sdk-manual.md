# Daheng Galaxy SDK - AI Integration Reference

**SDK:** Daheng Imaging **Galaxy SDK** (`GxIAPI` C API / `gxipy` Python binding).
**Hardware:** MERCURY2 USB3 Vision area-scan cameras (`MER2-U3`, `ME2P-U3`, `ME2L-U3`, `ME2S-U3` incl. SWIR).
**Source PDF:** `sdk/daheng-galaxy-sdk-manual.pdf.asset.json` (Daheng, "MERCURY2 USB3 Vision Cameras User Manual" v2.0.19, 266 pages). Externalized via `lovable-assets`; **never re-commit the raw PDF**. Load from the `.asset.json` `url` only for §11 cases.

**Audience:** an AI coding agent implementing / extending the Galaxy adapter behind `BE.sdk_facade.CameraFacade` (`BE/sdk_facade/__init__.py`) at, or under, `BE/sdk_facade/adapters/daheng_galaxy.py`. **This file is authoritative for integration decisions.** The PDF is only for the escalation cases in §11.

**Spec anchors (spec wins on any disagreement):**

- `spec/21-app/52-sdk-facade-pattern.md` - the seam rule: business code never imports vendor types.
- `spec/21-app/68-v2-vendor-sdk-contract.md` - lifecycle state machine + fault taxonomy.
- `spec/21-app/73-daheng-galaxy-sdk-integration.md` - Daheng-specific mapping (this file's spec twin).
- `spec/21-app/40-error-manage.md` §5 - central `E_*` registry; OVERRIDES §9 below on any conflict.

---

## 0. How to use this document

1. Find the workflow you are implementing in §4-§8.
2. Check the workflow's **Prerequisites** row: without those, do not write code, escalate instead.
3. Follow **Steps** in order. Each step names the `CameraFacade` method (never a vendor call in business code).
4. Wire every failure mode listed in **Errors** to the exact `ErrorCode` from §9. No new codes without an ADR.
5. Enforce every **Guardrail** in code, not in prose.

If your task is not in §4-§8, first check whether it maps onto one of them by composition. If not, stop and open an ADR before extending the facade surface.

---

## 1. Scope

- **Family:** MERCURY2 USB3 Vision area-scan.
- **Sub-series:** `MER2-U3(-L)` (standard), `ME2P-U3` (plus), `ME2L-U3(-L)` (lite), `ME2S-U3` (super, incl. SWIR).
- **Interface:** USB 3.0, USB3 Vision, GenICam / GenTL transport.
- **Power:** USB 3.0 bus, or auxiliary I/O connector on higher-end SKUs.
- **OS:** Windows and Linux (x86_64 + ARM). macOS is not officially supported; do not add a macOS code path.

---

## 2. Prerequisites (once per host)

The adapter assumes the host is already prepared. It MUST NOT install drivers or edit udev rules at runtime.

| Prereq                                   | Windows                                             | Linux                             | Failure signal                                                                          |
| ---------------------------------------- | --------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| Galaxy SDK installed                     | `Galaxy_Windows_*.exe`                              | `Galaxy_Linux-*_Gige-U3_*.tar.gz` | `gxipy` import raises -> `E_SDK_INIT_FAILED`                                            |
| `gxipy` Python binding                   | `pip install gxipy` (bundled)                       | same                              | import fails -> `E_SDK_INIT_FAILED`                                                     |
| USB3 host controller                     | xHCI, USB 3.0+                                      | same                              | camera enumerates as USB 2.0 (`interface != "U3V"`) -> `E_CAM_CAPTURE_FAILED` on stream |
| `udev` rules for non-root access         | n/a                                                 | shipped with SDK                  | `open()` denies -> `E_SDK_INIT_FAILED`                                                  |
| Certified USB 3.0 cable, ≤ 5 m passive   | required                                            | required                          | intermittent dropped frames -> `E_CAM_CAPTURE_FAILED`                                   |
| Bandwidth budget when >1 camera per host | cap via `DeviceLinkThroughputLimit` (manual §8.5.4) | same                              | stream aborts mid-run -> `E_CAM_CAPTURE_FAILED`                                         |

If any row is missing, the adapter fails **loudly at construction time** with `E_SDK_INIT_FAILED`; it never silently degrades.

---

## 3. Facade mapping (authoritative)

Every method on `CameraFacade` (`BE/sdk_facade/__init__.py`, `SDK_FACADE_VERSION = 0.3.0-protocol`) maps to the following Galaxy SDK calls. **Business code never imports `gxipy` / `GxIAPI`** - violations are `E_BUG_SDK_LEAK` (`spec/21-app/52-sdk-facade-pattern.md`).

| Facade method                           | Galaxy SDK call                                                | Notes                                                                      |
| --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `list_devices() -> list[DeviceInfo]`    | `DeviceManager.update_device_list()`                           | Return `DeviceInfo(serial, model, vendor="Daheng", interface="U3V")`.      |
| `open(serial)`                          | `DeviceManager.open_device_by_sn(sn)`                          | One handle per serial; refcount if multiple callers.                       |
| `close()`                               | `device.close_device()`                                        | Idempotent; always called from `finally`.                                  |
| `start_stream()`                        | `device.stream_on()` + `data_stream.register_capture_callback` | Push frames into an async queue.                                           |
| `stop_stream()`                         | `device.stream_off()`                                          | Idempotent.                                                                |
| `grab(timeout_ms) -> Frame`             | `data_stream.get_image(timeout_ms)`                            | Return `Frame(data, width, height, pixel_format, timestamp_ns, frame_id)`. |
| `set_exposure(us)`                      | `ExposureTime` node                                            | Clamp to node `Min/Max/Inc`.                                               |
| `set_gain(db)`                          | `Gain` node                                                    | 0 dB default, per-SKU max (typ. 24 dB).                                    |
| `set_roi(Roi)`                          | `OffsetX/Y`, `Width`, `Height`                                 | Multiples of sensor `Inc`.                                                 |
| `set_pixel_format(fmt)`                 | `PixelFormat` enum node                                        | See table in §5.                                                           |
| `set_trigger(mode, source, activation)` | `TriggerMode`, `TriggerSource`, `TriggerActivation`            | See §7.                                                                    |
| `execute_software_trigger()`            | `TriggerSoftware.execute()`                                    | Only when `TriggerSource=Software`.                                        |
| `read_line_status(line)`                | `LineStatus` node                                              | Opto-isolated I/O.                                                         |
| `set_line_output(line, on)`             | `UserOutputValue` node                                         | `Line1` opto output; `Line2/3` GPIO.                                       |

Every wrapper method translates vendor exceptions to the central `E_*` registry (§9) at the seam. Raw `GxIAPI` exceptions never leave the adapter.

---

## 4. Workflow: enumerate and open a device

**Prerequisites:** §2 rows all green. No handle currently open on the target serial.

**Steps:**

1. `devices = facade.list_devices()` - refuse to proceed if list is empty (device not connected).
2. Choose the target `DeviceInfo` by `serial` (never by index; enumeration order is non-deterministic).
3. `facade.open(serial)` - the adapter stores the handle in an internal `serial -> (device, refcount)` map.
4. Query GenICam nodes (`ExposureTime.Min/Max/Inc`, `Width.Max`, sensor `PixelFormat` list) and expose them as `CameraCaps` to callers. **Never hardcode per-SKU numbers.**

**Errors:**

| Cause                                                          | Code                        |
| -------------------------------------------------------------- | --------------------------- |
| `list_devices` returns empty                                   | `E_CAM_NOT_CONNECTED` (503) |
| Serial not in enumeration                                      | `E_CAM_NOT_CONNECTED` (503) |
| Different serial already open and single-handle policy applies | `E_BE_CONFLICT` (409)       |
| SDK init / driver missing                                      | `E_SDK_INIT_FAILED` (503)   |

**Guardrails:** always `close()` in `finally`. Cache device caps for the duration of the open handle; invalidate on disconnect.

---

## 5. Workflow: configure the camera

**Prerequisites:** device open. Streaming stopped for parameters marked "streaming-locked" by the vendor (ROI, PixelFormat, Binning). Exposure/Gain are writable while streaming.

**Steps (any order except where noted):**

1. `facade.set_pixel_format(fmt)` **before** ROI on some SKUs; adapter enforces this internally.
2. `facade.set_roi(Roi(x, y, w, h))` - the adapter snaps to `Inc` and rejects out-of-range.
3. `facade.set_exposure(us)` and `facade.set_gain(db)`.
4. Optional: `facade.set_trigger(...)` per §7.
5. Optional: persist via `UserSetSave` on the vendor side (facade extension - not in v0.3.0-protocol; open ADR before adding).

**Normalized pixel formats:**

| App enum (`BE.sdk_facade.PixelFormat`) | Vendor `PixelFormat`           | Notes                                  |
| -------------------------------------- | ------------------------------ | -------------------------------------- |
| `MONO8`                                | `Mono8`                        | Universal, safe default.               |
| `MONO10` / `MONO12`                    | `Mono10Packed`, `Mono12Packed` | Packed to save USB bandwidth.          |
| `BAYER_RG8`                            | `BayerRG8`                     | Color SKUs; debayer in app or via SDK. |
| `RGB8`                                 | `RGB8`                         | Debayered by SDK; costs bandwidth.     |

POL / SWIR SKUs reuse the same pixel formats with sensor-specific channel semantics; document separately when enabling those SKUs.

**Errors:**

| Cause                                           | Code                                                         |
| ----------------------------------------------- | ------------------------------------------------------------ |
| Value outside node `Min/Max/Inc`                | `E_BE_BAD_REQUEST` with `{node, value, min, max, inc}` (400) |
| Streaming-locked parameter set while streaming  | `E_BE_CONFLICT` (409)                                        |
| Requested `PixelFormat` unsupported on this SKU | `E_BE_BAD_REQUEST` (400)                                     |
| Device dropped mid-write                        | `E_CAM_NOT_CONNECTED` (503)                                  |

**Guardrails:** validate against live GenICam ranges, not cached constants. Never silently clamp; return `E_BE_BAD_REQUEST` so the caller sees the bad value.

---

## 6. Workflow: free-run capture

**Prerequisites:** §4 done, §5 done, `TriggerMode.OFF`.

**Steps:**

1. `facade.start_stream()`.
2. Loop: `frame = facade.grab(timeout_ms=<budget>)`. Publish to the consumer queue.
3. Handle back-pressure in the consumer, not the adapter. The adapter never drops silently; if the queue is full, raise `E_CAM_CAPTURE_FAILED` with `{reason: "backpressure"}`.
4. `facade.stop_stream()` on shutdown or reconfigure.

**Errors:**

| Cause                                          | Code                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `grab` exceeds `timeout_ms`                    | `E_CAM_TIMEOUT` (504)                                             |
| Bandwidth exceeded / SDK reports dropped frame | `E_CAM_CAPTURE_FAILED` (502)                                      |
| USB reset or cable unplug detected             | `E_CAM_NOT_CONNECTED` (503) - trigger reconnect loop with backoff |
| `start_stream` called while already streaming  | `E_BE_CONFLICT` (409)                                             |

**Guardrails:** `stop_stream()` is idempotent; call it from a `finally`. Do not swallow `E_CAM_TIMEOUT`; expose it so the caller can decide (retry / raise).

---

## 7. Workflow: triggered capture

**Prerequisites:** §4 done. For hardware trigger: I/O wiring per §8 and manual §7.3.2.

**Modes:**

- `TriggerMode.OFF` -> free-run (§6).
- `TriggerMode.ON` with `TriggerSource ∈ {SOFTWARE, LINE0, LINE2, LINE3, COUNTER}`.
- `TriggerActivation`: `RISING_EDGE` (default), `FALLING_EDGE`, `ANY_EDGE`.
- Overlap: MERCURY2 supports overlapping and non-overlapping exposure (manual §8.2.11). **Assume non-overlap** unless the caller explicitly opts in via `set_trigger(..., overlap=True)`.
- `TriggerDelay` / `ExposureDelay` are µs, per-SKU max.
- `TriggerCache` (manual §8.2.10) buffers hardware triggers arriving during a busy exposure; enable when the vision pipeline can lag.

**Software-trigger single-shot steps:**

1. `facade.set_trigger(mode=ON, source=SOFTWARE, activation=RISING_EDGE)`.
2. `facade.start_stream()`.
3. `facade.execute_software_trigger()`.
4. `frame = facade.grab(timeout_ms=<exposure + guard>)`.
5. `facade.stop_stream()`.

**Hardware-trigger burst steps:**

1. `facade.set_trigger(mode=ON, source=LINE0, activation=RISING_EDGE)`; enable `TriggerCache` if the pipeline can lag.
2. `facade.start_stream()`.
3. Loop `facade.grab(timeout_ms=<inter-trigger interval + guard>)` on a worker thread.
4. `facade.stop_stream()` on stop.

**Errors:**

| Cause                                                        | Code                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `execute_software_trigger` while `TriggerSource != SOFTWARE` | `E_BE_CONFLICT` (409)                                               |
| No trigger observed within `timeout_ms`                      | `E_CAM_TIMEOUT` (504)                                               |
| Line0 wired incorrectly / no edges detected                  | `E_CAM_CAPTURE_FAILED` (502) with `{hint: "check Line0 wiring §8"}` |
| Trigger requested on unsupported source for the SKU          | `E_BE_BAD_REQUEST` (400)                                            |

**Guardrails:** always set `TriggerMode` before `TriggerSource`; the adapter enforces order regardless of caller sequence.

---

## 8. Workflow: I/O (opto-isolated + GPIO)

**Prerequisites:** device open. Understand the electrical constraints below - **wrong wiring damages the camera**.

**Lines:**

- `Line0`: opto-isolated input, active high, tolerates 5-24 V.
- `Line1`: opto-isolated output, open-collector, needs external pull-up.
- `Line2`, `Line3`: bidirectional GPIO, 3.3 V logic. Direction is set via `LineMode`.
- Do **not** drive `Line0/1` with GPIO logic levels directly; use the opto path.
- ME2S has a different connector pinout than MER2 / ME2P / ME2L. The facade resolves pins by `LineSelector` **name**, never by pin number.

**Steps:**

1. Read input: `facade.read_line_status("Line0")`.
2. Drive output: `facade.set_line_output("Line1", True)`.

**Errors:**

| Cause                                       | Code                        |
| ------------------------------------------- | --------------------------- |
| Unknown line name for this SKU              | `E_BE_BAD_REQUEST` (400)    |
| Attempt to write an input-configured line   | `E_BE_CONFLICT` (409)       |
| Line read fails because device disconnected | `E_CAM_NOT_CONNECTED` (503) |

**Guardrails:** the adapter maintains a per-SKU allow-list of line names loaded from GenICam at `open()`; never trust caller strings verbatim.

---

## 9. Error mapping (authoritative: `BE/errors/codes.py`)

Vendor exceptions raised inside the adapter MUST be re-raised as `AppError(..., cause=original)` with codes from the central `ErrorCode` enum (`spec/21-app/40-error-manage.md` §5). Prior drafts of this file cited `E_BE_*` codes for camera failures; that was **wrong** - `E_CAM_*` is reserved for facade errors and overrides any manual-side suggestion.

| Vendor condition                                                      | `ErrorCode`                                            | HTTP |
| --------------------------------------------------------------------- | ------------------------------------------------------ | ---- |
| Device not found on enumeration / unknown serial on `open`            | `E_CAM_NOT_CONNECTED`                                  | 503  |
| Another handle already open for a different serial                    | `E_BE_CONFLICT`                                        | 409  |
| `get_image` timed out                                                 | `E_CAM_TIMEOUT`                                        | 504  |
| Capture failed / bandwidth exceeded / dropped frame / stub `grab`     | `E_CAM_CAPTURE_FAILED`                                 | 502  |
| Parameter out of `Min/Max/Inc` (`ExposureTime`, `Gain`, `Width`, ...) | `E_BE_BAD_REQUEST` with `{node, value, min, max, inc}` | 400  |
| USB reset / cable unplug detected mid-stream                          | `E_CAM_NOT_CONNECTED` (trigger reconnect with backoff) | 503  |
| SDK init failed at startup (missing driver, wrong version)            | `E_SDK_INIT_FAILED`                                    | 503  |
| Vendor type escaping the facade boundary                              | `E_BUG_SDK_LEAK` (lint + runtime checked)              | 500  |

`E_BE_TIMEOUT` does **not** exist in the registry; anyone tempted to add it must use `E_CAM_TIMEOUT` here or open an ADR to extend the registry.

**Reconnect policy (adapter-owned):** on `E_CAM_NOT_CONNECTED` mid-stream, `stop_stream()` -> `close()` -> exponential backoff (200 ms, 400, 800, 1600, cap 3200) -> `list_devices` -> `open(serial)` -> `start_stream()`. After 5 failures, surface `E_CAM_NOT_CONNECTED` and stop retrying.

---

## 10. Feature roadmap (manual §8, wire in this order)

1. Exposure (auto + manual), Gain (auto + manual).
2. ROI, Binning, Decimation.
3. Pixel format + Sensor bit depth.
4. User Sets (device-side save/load: `UserSetSelector`, `UserSetSave`, `UserSetLoad`).
5. Test pattern (for automated FE fixtures).
6. Timestamp + Chunk data (frame ID, exposure, gain, line status).
7. LUT, Gamma, Sharpness, White Balance (color SKUs).
8. Defect pixel correction (§9.3) and Flat Field Correction (§9.2) - plugin-based; feature-detect via `IsAvailable` before exposing.
9. Events (§8.6) - subscribe for `ExposureEnd`, `FrameStart`, `FrameBurstStart` when building the diagnostic overlay.

Each new feature adds a facade method (bumping `SDK_FACADE_VERSION`), a Protocol update, and a spec entry in `73-daheng-galaxy-sdk-integration.md`. No feature ships without all three.

---

## 11. When to open the PDF

Open `sdk/daheng-galaxy-sdk-manual.pdf.asset.json` -> follow the `url` field only when:

- Adding a new SKU whose feature availability is unclear.
- Debugging an I/O circuit (manual §7.3.2 has the schematic).
- Implementing FFC / DPC plugins (manual §9.2 / §9.3).
- The GenICam node name reported by `IsAvailable` disagrees with §3.

Everything else is decided by this file and the spec anchors above.

---

## 12. Out of scope for this document

- Per-SKU sensor spectral curves, frame-rate ceilings, dimensional drawings (manual §4-§5). Query at open time; never hardcode.
- Lens / filter selection guides (manual §6) - belongs in the optics setup doc.
- Certification text (CE / FCC / KC / ICES) - belongs in the release / compliance doc.

---

## 13. Change log

- **v1.3**: landed real `DahengCameraFacade` adapter (Plan 90 Phase 12). Wired provider selection (`daheng`, `inmemory`, `replay`) in `worker-cli` and `processing-cli`. Added hardware smoke tests, offline `.npy` fixture replay, observability logging, and `metrics` integration.
- **v1.2.1** (rename notice, no content change): consolidated location + numbering aliases so integrators grepping the old paths land here.
  - This manual lives at `sdk/daheng-galaxy-sdk-manual.md` (was `docs/vendor-sdk-manual.md` prior to v1.1). The PDF sidecar is `sdk/daheng-galaxy-sdk-manual.pdf.asset.json`.
  - Companion spec moved from `spec/21-app/70-daheng-galaxy-sdk-integration.md` to `spec/21-app/73-daheng-galaxy-sdk-integration.md` (numbering collision with the rule bundle spec at 70). Content unchanged; update bookmarks and any `rg` patterns.
  - No API, facade signature, or error code changes. `SDK_FACADE_VERSION` remains at the value pinned in v1.1 (`0.3.0-protocol`), and all `E_CAM_*` / `E_BE_*` mappings in §8 are still authoritative.
  - Old paths intentionally left un-redirected in the repo: an `rg` for `vendor-sdk-manual` or `70-daheng-galaxy-sdk` will hit only this entry and immutable asset-manifest fields, both of which point here.
- **v1.2** (rewrite): reorganized around AI-actionable workflows (enumerate/open, configure, free-run, triggered, I/O) with explicit Prerequisites / Steps / Errors / Guardrails per workflow; added §0 usage guide, §2 host-prep matrix, §9 reconnect policy; kept §3 facade table and §9 error registry authoritative.
- **v1.1**: renamed from `vendor-sdk-manual.md` to `daheng-galaxy-sdk-manual.md`; added §8 authoritative error mapping (overrides earlier `E_BE_*` draft); typed the facade table with the concrete Protocol signatures shipped in `BE/sdk_facade/__init__.py` at `SDK_FACADE_VERSION = 0.3.0-protocol`.
- **v1.0**: initial distillation from the 266-page PDF.
