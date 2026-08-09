# 10 — Vendor Adapter: Basler Pylon

First real-SDK backend behind `VendorDeviceIO` (`spec/21-app/50-capture-modules.md`).
Basler Pylon is chosen first because it has the most complete Python
binding (`pypylon`) and public trigger / grab semantics.

## Module

- **File:** `app/capture/pylon_device_io.py` (to be added)
- **Anchors under:** `VendorDeviceIO` (`app/capture/vendor_device_io.py`)
- **Never imported in tests:** vendor SDK stays behind a runtime factory to keep unit tests hermetic.

## Handle model

The vendor handle is an opened `pylon.InstantCamera`. The adapter must:

| Bridge call        | Pylon mapping                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `open()`           | `pylon.TlFactory.GetInstance().CreateFirstDevice()` → `InstantCamera(...)` → `Open()`           |
| `close()`          | `Close()` then release the device                                                               |
| `arm()`            | Set `TriggerMode=On`, `TriggerSource=Software`, `AcquisitionMode=Continuous`; `StartGrabbing()` |
| `disarm()`         | `StopGrabbing()`, restore `TriggerMode=Off`                                                     |
| `trigger(timeout)` | `ExecuteSoftwareTrigger()` → `RetrieveResult(timeout_ms, TimeoutHandling_ThrowException)`       |

## Exception mapping (required)

Pylon raises `pypylon.genicam.TimeoutException` and `RuntimeException`, plus
`pypylon.pylon.LogicalErrorException` on device loss. The adapter MUST map:

| Vendor exception               | `DeviceIO` error        |
| ------------------------------ | ----------------------- |
| `TimeoutException`             | `E_HW_TIMEOUT`          |
| `LogicalErrorException` (bus)  | `E_HW_DISCONNECTED`     |
| `RuntimeException` (grab fail) | `E_HW_TIMEOUT` (retry)  |
| Anything else                  | `E_HW_UNKNOWN` (raised) |

Mapping lives in a single `_translate(exc)` helper so the taxonomy in
`spec/21-app/40-error-manage.md` Appendix A stays authoritative.

## Fault-mode tests (required at v2)

- Extend `tests/integration/test_hardware_fault_modes.py` with a
  `FakePylonCamera` shaped like `pypylon.pylon.InstantCamera` (methods:
  `Open`, `Close`, `StartGrabbing`, `StopGrabbing`,
  `ExecuteSoftwareTrigger`, `RetrieveResult`, `IsGrabbing`).
- Cover: transient timeout recovery, budget exhaustion → `E_HW_TIMEOUT`,
  bus loss → `E_HW_DISCONNECTED` + auto-disarm, re-arm after disconnect.

## Configuration surface

Adds to `27-config-surface.md`:

- `capture.vendor` = `"pylon"` selects this adapter.
- `capture.pylon.serial` (optional) pins a specific camera.
- `capture.pylon.timeout_ms` per-trigger timeout budget (default `5000`).

## Out of scope for this anchor

- Multi-camera synchronization.
- Hardware trigger source (line-in) — software trigger only in v2 phase 1.
- Chunk-data / metadata payloads beyond raw frame bytes.

## Related

- Parent scope: `spec/21-app/61-v2-scope.md`
- Capture anchor: `spec/21-app/50-capture-modules.md`
- Error taxonomy: `spec/21-app/40-error-manage.md` Appendix A.2

## PylonCaptureSdkFacade binding

| Facade member     | Pylon SDK call                                                                     | Cat object returned         | Error code                                  |
| ----------------- | ---------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------- |
| `Open(serial)`    | `TlFactory.CreateFirstDevice` or serial-selected device, then `InstantCamera.Open` | `CatCaptureDevice`          | `E_CAP_OPEN_FAILED`                         |
| `Grab(timeoutMs)` | `ExecuteSoftwareTrigger`, `RetrieveResult`, caller-owned byte copy, SDK release    | `CatFrame`                  | `E_CAP_GRAB_FAILED`, `E_CAP_BUFFER_UNOWNED` |
| `Close()`         | `InstantCamera.Close` and handle release                                           | `CatCaptureLifecycleClosed` | `E_CAP_CLOSE_FAILED`                        |
| `ListDevices()`   | `TlFactory.EnumerateDevices`                                                       | `CatDeviceDescriptor[]`     | `E_CAP_DISCOVERY_TIMEOUT`                   |

No `pypylon` object may cross this facade. Raw grab results are copied to caller-owned bytes before the SDK result is released.

## Contract back-links

| Target                                     | Required use                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `spec/21-app/52-sdk-facade-pattern.md`     | Facade naming, `Cat*` boundary objects, SDK leak rules, and `E_BUG_SDK_LEAK` expectations. |
| `spec/21-app/67-v2-discovery-contract.md`  | Descriptor fields and `getDiscoveredDevices` output shape.                                 |
| `spec/21-app/68-v2-vendor-sdk-contract.md` | `Open`, `Grab`, `Close`, lifecycle states, and buffer ownership rules.                     |
| `spec/coding-guidelines/python.md`         | Python SDK guard, logging, and facade rules.                                               |

## Implementation checklist

- [ ] Runtime import guard returns unsupported-vendor errors without importing `pypylon` in tests.
- [ ] `Open` selects the configured serial when present.
- [ ] `Grab` copies bytes before SDK release.
- [ ] Timeouts map to retryable capture errors.
- [ ] Disconnects close or disarm the device before returning the typed error.
- [ ] Integration tests cover open, grab, close, timeout, disconnect, and buffer ownership.

## Acceptance Checklist

- [ ] Pylon adapter binds to `VendorDeviceIO` per spec 52.
- [ ] Every Basler-specific error maps to a `E_HW_*` code registered in spec 40.
- [ ] Discovery contract path resolves to spec 67.
