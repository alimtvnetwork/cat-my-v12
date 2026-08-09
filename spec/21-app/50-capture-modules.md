# 50 — Capture Modules (post-v1 anchor)

Anchors post-v1 capture-side modules that ship with tests but previously
lacked a dedicated `spec/21-app/**` section. Complements `14-capture-pipeline.md`.

## Scope

| Module                   | File                                 | Contract                                                                                                                |
| ------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Hardware bridge protocol | `app/capture/hardware_bridge.py`     | Typed protocol boundary between orchestration and any device; `StubHardwareBridge` is the in-repo default.              |
| Reference capture driver | `app/capture/reference_driver.py`    | Implements `arm → trigger* → disarm` lifecycle over a `DeviceIO` seam.                                                  |
| Vendor DeviceIO adapter  | `app/capture/vendor_device_io.py`    | Bridges vendor SDK handles/callables (Pylon, Spinnaker, Vimba) to `DeviceIO` without importing vendor packages in-repo. |
| Perf harness runner      | `app/capture/perf_harness_runner.py` | Binds `driver.trigger` as timing source, enforces the 77 fps SLO, logs stats.                                           |

## Lifecycle & error contract

- `arm()` opens the device exactly once; re-arming after `disarm()` is legal.
- `trigger()` retries transient `E_HW_TIMEOUT` within a configured budget; once the budget is exhausted the error is raised.
- `E_HW_DISCONNECTED` is fatal — the driver auto-disarms and requires an explicit `arm()` to recover.
- Vendor exceptions are mapped in `vendor_device_io.py`: timeout-shaped → `E_HW_TIMEOUT`, bus-loss-shaped → `E_HW_DISCONNECTED`, everything else → `E_HW_UNKNOWN`.

## SLO

- `perf_harness_runner.py` MUST report median FPS ≥ 77 across the sample window or raise. Runner logs `I_PERF_HARNESS_OK` / `E_PERF_HARNESS_SLO`.

## VendorDeviceIO contract lock (v2.0.7 Plan 25 SS-02)

Frozen surface (source of truth: `app/capture/vendor_device_io.py:104-197`):

- `list_devices() -> list[VendorDeviceDescriptor]` (raises `CaptureAdapterError(E_CAP_ENUM_FAILED)`).
- `open() -> None` (raises `_normalize(op='open')`; timeouts -> `HardwareTimeoutError`, disconnects -> `DeviceDisconnectedError`, else `CaptureAdapterError(E_CAP_OPEN_FAILED)`).
- `close() -> None` (best-effort; clears `_open` before calling vendor; wraps unknown -> `CaptureAdapterError(E_CAP_UNKNOWN)`).
- `connected: bool` property (never raises; returns False when probe throws).
- `grab(deadline_ms: int) -> bytes` (single-shot AND streaming collapsed; returns caller-owned copy; on disconnect flips `_open=False`).

Gap decisions from SS-01 baseline (`.lovable/memory/v2/plan25/00-adapter-parity-baseline.md`):

- G-1 Stream arm/stop stays per-vendor internal (`_arm`, `start_streaming`), NOT on the protocol. Rationale: `grab(deadline_ms)` is the only cross-vendor timing surface; forcing arm/stop into the contract would leak Vimba's push-mode callback semantics onto Pylon/Spinnaker pull-mode SDKs.
- G-2 Shutdown ordering codified: `close()` MUST (a) set `_open=False`, (b) stop any active stream (Vimba `stop_streaming`), (c) release the vendor camera handle, (d) log `close OK` or raise `E_CAP_UNKNOWN`. Pylon/Spinnaker satisfy (b) via SDK auto-stop on close; Vimba does it explicitly (`vimba_device_io.py:85-105`).
- G-3 `_is_busy` is OPTIONAL, not on the protocol. Spinnaker/Vimba raise a `HardwareBusyError` subclass of `DeviceDisconnectedError` (`spinnaker_device_io.py:50`); busy is mapped to disconnect at the contract level. Pylon may add a predicate later without breaking parity.
- G-4 Naming lock: `E_CAP_*` are adapter-level wire codes (`vendor_device_io.py:33-39`). `E_HW_*` are the higher `hardware_bridge` re-mappings surfaced to orchestration. The mapping table `E_CAP_GRAB_TIMEOUT -> E_HW_TIMEOUT`, `E_CAP_DISCONNECTED -> E_HW_DISCONNECTED`, other `E_CAP_*` -> `E_HW_UNKNOWN` is authoritative and lives in spec 40 Appendix A. Adapter tests assert `E_CAP_*`; bridge tests assert `E_HW_*`.

Any change to this surface REQUIRES a spec revision in this section plus a Blind-AI rescore of `spec/21-app/50,63,64,65,68`.

## Proving tests

- `tests/unit/test_hardware_bridge.py`
- `tests/unit/test_reference_driver.py`
- `tests/unit/test_vendor_device_io.py`
- `tests/unit/test_perf_harness_runner.py`
- `tests/integration/test_hardware_fault_modes.py`

## Facade Binding

Per spec 52 (SDK Facade Pattern), every capture module in this anchor binds to hardware exclusively through a `VendorDeviceIO` facade. No `app/capture/**` module outside `app/capture/facades/` and `vendor_device_io.py` may import a vendor SDK package (`pypylon`, `PySpin`, `vmbpy`) or reference a vendor-returned type in a signature, return, field, or `isinstance` check.

| Business module                      | Bound facade                                                           | Domain object crossing the seam                      |
| ------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `app/capture/hardware_bridge.py`     | `VendorDeviceIO` (protocol)                                            | `CatFrame`, `CatDeviceDescriptor`                    |
| `app/capture/reference_driver.py`    | `VendorDeviceIO` (protocol)                                            | `CatFrame`                                           |
| `app/capture/vendor_device_io.py`    | Concrete `<Vendor>CaptureSdkFacade` (Pylon 63, Spinnaker 64, Vimba 65) | `CatFrame`, `CatDeviceDescriptor`, `CatTriggerPulse` |
| `app/capture/perf_harness_runner.py` | `VendorDeviceIO` (protocol) via `reference_driver`                     | `CatFrame` timing samples                            |

Enforcement: any vendor-SDK import outside the allow-listed facade modules is `E_BUG_SDK_LEAK` at lint time (spec 52 §2). Exception translation happens inside the facade only: timeout-shaped → `E_HW_TIMEOUT`, bus-loss-shaped → `E_HW_DISCONNECTED`, other → `E_HW_UNKNOWN` (spec 40 Appendix A).

## Acceptance Checklist

- [ ] Every capture module imports only from the `VendorDeviceIO` facade per spec 52.
- [ ] Module list matches folders under `app/capture/` (or drift = `E_MOD_LAYOUT_DRIFT`).
- [ ] Backpressure and timeout paths cite `E_CAP_*` codes from spec 40.
