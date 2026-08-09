# 12 — Vendor Adapter: Allied Vision Vimba

Third real-SDK backend behind `VendorDeviceIO` (`spec/21-app/50-capture-modules.md`).
Vimba (`vmbpy`, formerly VimbaPython) targets Allied Vision GigE / USB3 cameras
and mirrors the acquire/trigger seam already proven for Pylon
(`spec/21-app/63-v2-vendor-pylon.md`) and Spinnaker (`spec/21-app/64-v2-vendor-spinnaker.md`).

## Module

- **File:** `app/capture/vimba_device_io.py` (to be added)
- **Anchors under:** `VendorDeviceIO` (`app/capture/vendor_device_io.py`)
- **Never imported in tests:** vendor SDK stays behind a runtime factory
  `make_vimba_device_io(config, camera_factory=...)` so unit tests wire a
  `FakeVimbaCamera` without importing `vmbpy`.

## Handle model

The vendor handle is an opened `vmbpy.Camera` obtained from a live
`vmbpy.VmbSystem` context. The adapter must:

| Bridge call        | Vimba mapping                                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open()`           | `VmbSystem.get_instance().__enter__()` → `get_all_cameras()[0]` (or `get_camera_by_id(serial)`) → `cam.__enter__()`                                                                |
| `close()`          | `cam.__exit__(None, None, None)`, then `VmbSystem.__exit__(None, None, None)`                                                                                                      |
| `arm()`            | `cam.TriggerSelector.set("FrameStart")`; `cam.TriggerSource.set("Software")`; `cam.TriggerMode.set("On")`; `cam.AcquisitionMode.set("Continuous")`; `cam.start_streaming(handler)` |
| `disarm()`         | `cam.stop_streaming()`; `cam.TriggerMode.set("Off")`                                                                                                                               |
| `trigger(timeout)` | `cam.TriggerSoftware.run()` → `cam.get_frame(timeout_ms)` → `frame.as_numpy_ndarray().tobytes()`                                                                                   |

`VmbSystem` and `Camera` are context managers in `vmbpy`; the adapter MUST
enter/exit both in order and MUST NOT leave `VmbSystem` open across a close
call, otherwise a second `open()` deadlocks on the internal transport-layer
handle. Skipping the `TriggerSelector` write is a common footgun: Vimba
defaults `TriggerSelector=AcquisitionStart` on some models, so `TriggerMode=On`
silently disables frame delivery. Set it explicitly.

## Exception mapping (required)

`vmbpy` raises typed exceptions from `vmbpy.error`. The adapter MUST map by
exception class via a `_translate(exc)` helper so `spec/21-app/40-error-manage.md`
Appendix A stays authoritative:

| `vmbpy` exception               | `DeviceIO` error        |
| ------------------------------- | ----------------------- |
| `VmbTimeout`                    | `E_HW_TIMEOUT`          |
| `VmbCameraError`                | `E_HW_DISCONNECTED`     |
| `VmbFeatureError`               | `E_HW_DISCONNECTED`     |
| `VmbSystemError`                | `E_HW_DISCONNECTED`     |
| `VmbTransportLayerError` (busy) | `E_HW_BUSY`             |
| Anything else                   | `E_HW_UNKNOWN` (raised) |

Predicates (`_is_timeout`, `_is_disconnect`, `_is_busy`) inspect the MRO
class-name chain so wrapper classes in future `vmbpy` builds still match.
`HardwareBusyError` from `app/capture/spinnaker_device_io.py` is reused - do
not fork a second class.

## Fault-mode tests (required at v2)

Add `tests/integration/test_vimba_device_io.py` with a `FakeVimbaCamera`
shaped like `vmbpy.Camera` (`__enter__` / `__exit__`, `TriggerSelector`,
`TriggerSource`, `TriggerMode`, `AcquisitionMode`, `TriggerSoftware.run`,
`get_frame`, `start_streaming`, `stop_streaming`). Cover, at parity with the
Spinnaker suite (10 cases):

- predicates: timeout / disconnect / busy classes classified correctly
- translate: each mapped class → the right `E_HW_*`
- arm sequence writes `TriggerSelector` before `TriggerMode` (order-sensitive)
- success trigger + frame bytes released
- `VmbTimeout` → `HardwareTimeoutError` (retryable, adapter stays open)
- `VmbCameraError` → `DeviceDisconnectedError` + auto-disarm
- `VmbTransportLayerError` (busy) → `HardwareBusyError` at seam
- re-arm after disconnect recovers
- transient timeout then success
- unknown exception re-raised untyped

## Configuration surface

Adds to `27-config-surface.md`:

- `capture.vendor` = `"vimba"` selects this adapter.
- `capture.vimba.serial` (optional) pins a specific camera by device ID.
- `capture.vimba.timeout_ms` per-trigger timeout budget (default `5000`).

## Out of scope for this anchor

- Action Commands / PTP scheduled trigger - phase 2.
- Hardware trigger source (Line0/Line1) - software trigger only in v2 phase 2.
- Chunk data / user-set persistence.

## Governance

This anchor MUST land before `vimba_device_io.py` per v2 governance
(`spec/21-app/61-v2-scope.md`). Shipping code without this anchor reopens the
orphan-anchor findings closed in the v1.20 and v1.30 audits.

## VimbaCaptureSdkFacade binding

| Facade member     | Vimba SDK call                                                         | Cat object returned         | Error code                                  |
| ----------------- | ---------------------------------------------------------------------- | --------------------------- | ------------------------------------------- |
| `Open(serial)`    | `VmbSystem.get_instance`, system enter, camera selection, camera enter | `CatCaptureDevice`          | `E_CAP_OPEN_FAILED`                         |
| `Grab(timeoutMs)` | `TriggerSoftware.run`, `get_frame`, caller-owned byte copy             | `CatFrame`                  | `E_CAP_GRAB_FAILED`, `E_CAP_BUFFER_UNOWNED` |
| `Close()`         | camera exit, system exit                                               | `CatCaptureLifecycleClosed` | `E_CAP_CLOSE_FAILED`                        |
| `ListDevices()`   | `VmbSystem.get_all_cameras` inside a closed context                    | `CatDeviceDescriptor[]`     | `E_CAP_DISCOVERY_TIMEOUT`                   |

No `vmbpy` object may cross this facade. The system and camera context managers are entered and exited in strict order.

## Contract back-links

| Target                                     | Required use                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `spec/21-app/52-sdk-facade-pattern.md`     | Facade naming, `Cat*` boundary objects, SDK leak rules, and `E_BUG_SDK_LEAK` expectations. |
| `spec/21-app/67-v2-discovery-contract.md`  | Descriptor fields and `getDiscoveredDevices` output shape.                                 |
| `spec/21-app/68-v2-vendor-sdk-contract.md` | `Open`, `Grab`, `Close`, lifecycle states, and buffer ownership rules.                     |
| `spec/coding-guidelines/python.md`         | Python SDK guard, logging, and facade rules.                                               |

## Implementation checklist

- [ ] Runtime import guard returns unsupported-vendor errors without importing `vmbpy` in tests.
- [ ] `TriggerSelector` is written before `TriggerMode`.
- [ ] `Grab` converts the frame to caller-owned bytes before returning.
- [ ] Timeout, disconnected, and busy classes map to typed capture errors.
- [ ] `Close` exits camera and system contexts on all paths.
- [ ] Integration tests cover open, grab, close, busy, timeout, disconnect, and buffer ownership.

## Acceptance Checklist

- [ ] Vimba adapter binds to `VendorDeviceIO` per spec 52.
- [ ] Allied Vision-specific errors map to `E_HW_*` codes in spec 40.
- [ ] Discovery output shape matches spec 67 `{vendor, serial}` contract.
