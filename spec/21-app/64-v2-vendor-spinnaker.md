# 11 — Vendor Adapter: FLIR Spinnaker

Second real-SDK backend behind `VendorDeviceIO` (`spec/21-app/50-capture-modules.md`).
Spinnaker (`PySpin`) targets FLIR/Teledyne machine-vision cameras and shares
enough of the acquire/trigger shape with Pylon that the same seam applies.

## Module

- **File:** `app/capture/spinnaker_device_io.py` (to be added)
- **Anchors under:** `VendorDeviceIO` (`app/capture/vendor_device_io.py`)
- **Never imported in tests:** vendor SDK stays behind a runtime factory
  (`make_spinnaker_device_io(config, camera_factory=...)`) so unit tests can
  wire a `FakeSpinCamera` without importing `PySpin`.

## Handle model

The vendor handle is an opened `PySpin.CameraPtr`. The adapter must:

| Bridge call        | Spinnaker mapping                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `open()`           | `System.GetInstance().GetCameras().GetByIndex(0)` → `Init()`                                                          |
| `close()`          | `DeInit()`, release camera, `System.ReleaseInstance()`                                                                |
| `arm()`            | Set `TriggerMode=Off`, `TriggerSource=Software`, `TriggerMode=On`; `AcquisitionMode=Continuous`; `BeginAcquisition()` |
| `disarm()`         | `EndAcquisition()`, restore `TriggerMode=Off`                                                                         |
| `trigger(timeout)` | `TriggerSoftware.Execute()` → `GetNextImage(timeout_ms)` → `Release()`                                                |

TriggerMode must be toggled Off → configure → On per Spinnaker requirement;
skipping this raises `SpinnakerException` and MUST NOT be silently swallowed.

## Exception mapping (required)

PySpin raises a single `PySpin.SpinnakerException` with a numeric `errorcode`.
The adapter MUST map by errorcode via a `_translate(exc)` helper so the
taxonomy in `spec/21-app/40-error-manage.md` Appendix A stays authoritative:

| Spinnaker errorcode                     | `DeviceIO` error        |
| --------------------------------------- | ----------------------- |
| `SPINNAKER_ERR_TIMEOUT` (-1011)         | `E_HW_TIMEOUT`          |
| `SPINNAKER_ERR_NOT_INITIALIZED` (-1002) | `E_HW_DISCONNECTED`     |
| `SPINNAKER_ERR_RESOURCE_IN_USE` (-1004) | `E_HW_BUSY`             |
| `GENICAM_ERR_ACCESS_DENIED` (-2006)     | `E_HW_DISCONNECTED`     |
| Anything else                           | `E_HW_UNKNOWN` (raised) |

Predicates (`_is_timeout`, `_is_disconnect`, `_is_busy`) inspect
`errorcode` first, then fall back to class-name matching for wrapper
exceptions that PySpin may raise under different builds.

## Fault-mode tests (required at v2)

Add `tests/integration/test_spinnaker_device_io.py` with a
`FakeSpinCamera` shaped like `PySpin.CameraPtr` (`Init`, `DeInit`,
`BeginAcquisition`, `EndAcquisition`, `TriggerSoftware.Execute`,
`GetNextImage`, `IsStreaming`). Cover, at parity with the Pylon suite:

- predicates: timeout / disconnect / busy errorcodes classified correctly
- translate: each mapped errorcode → the right `E_HW_*`
- arm-on-open, success trigger + image release
- timeout errorcode → `HardwareTimeoutError` (retryable)
- access-denied / not-initialized → `DeviceDisconnectedError` + auto-disarm
- re-arm after disconnect
- transient timeout then success (recovery)

## Configuration surface

Adds to `27-config-surface.md`:

- `capture.vendor` = `"spinnaker"` selects this adapter.
- `capture.spinnaker.serial` (optional) pins a specific camera.
- `capture.spinnaker.timeout_ms` per-trigger timeout budget (default `5000`).

## Out of scope for this anchor

- GigE bandwidth tuning (`DeviceLinkThroughputLimit`) — phase 2.
- Hardware trigger source (Line0/Line1) — software trigger only in v2 phase 1.
- Chunk data / GenICam node caching.

## Governance

This anchor MUST land before `spinnaker_device_io.py` per v2 governance
(`spec/21-app/61-v2-scope.md`). Shipping code without this anchor reopens the
orphan-anchor findings closed in the v1.20 audit.

## SpinnakerCaptureSdkFacade binding

| Facade member     | Spinnaker SDK call                                                               | Cat object returned         | Error code                                  |
| ----------------- | -------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------- |
| `Open(serial)`    | `System.GetInstance`, camera list selection, `CameraPtr.Init`                    | `CatCaptureDevice`          | `E_CAP_OPEN_FAILED`                         |
| `Grab(timeoutMs)` | `TriggerSoftware.Execute`, `GetNextImage`, caller-owned byte copy, image release | `CatFrame`                  | `E_CAP_GRAB_FAILED`, `E_CAP_BUFFER_UNOWNED` |
| `Close()`         | `EndAcquisition`, `DeInit`, camera list clear, system release                    | `CatCaptureLifecycleClosed` | `E_CAP_CLOSE_FAILED`                        |
| `ListDevices()`   | `System.GetCameras` with guaranteed release                                      | `CatDeviceDescriptor[]`     | `E_CAP_DISCOVERY_TIMEOUT`                   |

No `PySpin` object may cross this facade. The facade owns system release even when camera selection or trigger setup fails.

## Contract back-links

| Target                                     | Required use                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `spec/21-app/52-sdk-facade-pattern.md`     | Facade naming, `Cat*` boundary objects, SDK leak rules, and `E_BUG_SDK_LEAK` expectations. |
| `spec/21-app/67-v2-discovery-contract.md`  | Descriptor fields and `getDiscoveredDevices` output shape.                                 |
| `spec/21-app/68-v2-vendor-sdk-contract.md` | `Open`, `Grab`, `Close`, lifecycle states, and buffer ownership rules.                     |
| `spec/coding-guidelines/python.md`         | Python SDK guard, logging, and facade rules.                                               |

## Implementation checklist

- [ ] Runtime import guard returns unsupported-vendor errors without importing `PySpin` in tests.
- [ ] Trigger mode is toggled off before configuration and on before acquisition.
- [ ] `Grab` releases the image after creating caller-owned bytes.
- [ ] Timeout, disconnected, and busy error codes map to typed capture errors.
- [ ] `Close` releases camera list and system handles on all paths.
- [ ] Integration tests cover open, grab, close, busy, timeout, disconnect, and buffer ownership.

## Acceptance Checklist

- [ ] Spinnaker adapter binds to `VendorDeviceIO` per spec 52.
- [ ] FLIR-specific errors map to `E_HW_*` codes in spec 40.
- [ ] Adapter lifecycle matches spec 15 capture pipeline stages.
