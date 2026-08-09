# 68 - v2 Vendor SDK Contract (Pylon, Spinnaker, Vimba)

Status: locked for v2.0.2
Owner: `app/capture/vendor_device_io.py`
Baseline: v2.5.0 docs, v2.0.1 application

## Scope

This contract governs every vendor SDK adapter that lives under
`app/capture/*_device_io.py` and is normalized by
`app/capture/vendor_device_io.py`. It fixes three things:

1. The lifecycle state machine each adapter MUST implement.
2. The buffer-ownership rule for frames returned by `grab()`.
3. The full `E_CAP_*` failure taxonomy that `VendorDeviceIO` MUST raise.

Any adapter that violates one of these clauses is non-conformant and MUST NOT
ship in v2.0.2.

## 1. Lifecycle state machine

```text
Closed -> Opening -> Open -> Grabbing -> Open -> Closing -> Closed
```

Rules:

- `open(config)` transitions `Closed -> Opening -> Open`. On failure it
  transitions back to `Closed` and raises `CaptureAdapterError(E_CAP_OPEN_FAILED)`.
- `grab(timeout_ms)` transitions `Open -> Grabbing -> Open`. On timeout it
  returns to `Open` and raises `CaptureAdapterError(E_CAP_GRAB_TIMEOUT)`.
- `close()` transitions any state to `Closed`. It MUST be idempotent and MUST
  NOT raise on already-`Closed`.
- Concurrent `grab()` from two threads on the same device is undefined and
  MUST raise `CaptureAdapterError(E_CAP_UNKNOWN)` with a `detail` string
  identifying the concurrency violation.
- Adapters MUST NOT expose any state outside this machine (no partial
  `Opened` variants, no vendor-specific `Streaming` state).

## 2. Buffer ownership

- `grab()` returns `bytes` (or `memoryview` backed by a caller-owned buffer).
- The returned buffer MUST be a full copy of the SDK-owned frame; the adapter
  MUST NOT retain any reference to the vendor-thread frame after `grab()`
  returns.
- The adapter MUST release the SDK frame (Pylon `RetrieveResult.Release`,
  PySpin `image.Release`, Vimba `frame.queue_frame`) in a `finally` block
  even when the copy step raises.
- On `close()` the adapter MUST drop every cached SDK handle. Any surviving
  vendor-thread reference is `E_CAP_BUFFER_LEAK`.

## 3. `E_CAP_*` failure taxonomy

`VendorDeviceIO` raises `CaptureAdapterError(code, vendor, detail)` only.
Raw vendor exceptions (`pypylon.genicam.RuntimeException`,
`PySpin.SpinnakerException`, `vmbpy.VmbCameraError`) MUST NOT escape.

| Code                 | Meaning                                                   |
| -------------------- | --------------------------------------------------------- |
| `E_CAP_SDK_ABSENT`   | Vendor Python package not importable at runtime.          |
| `E_CAP_ENUM_FAILED`  | Enumeration/discovery call failed before `open()`.        |
| `E_CAP_OPEN_FAILED`  | `open()` transition failed; device unreachable or busy.   |
| `E_CAP_GRAB_TIMEOUT` | `grab()` exceeded `timeout_ms`.                           |
| `E_CAP_DISCONNECTED` | Device dropped mid-session (USB unplug, GigE link loss).  |
| `E_CAP_BUFFER_LEAK`  | Adapter retained an SDK-owned buffer after `close()`.     |
| `E_CAP_UNKNOWN`      | Any other unmapped vendor error, with `detail` populated. |

Structured log line for every raise:

```text
vendor_io.<op> code=<E_CAP_*> vendor=<pylon|spinnaker|vimba> detail="<short>"
```

## 4. Verification hooks

- `tests/unit/test_vendor_sdk_error_mapping.py` MUST assert one row per
  taxonomy entry per vendor.
- `tests/unit/test_vendor_buffer_ownership.py` MUST assert `id(returned)`
  differs from any SDK-frame `id` and that no SDK release call is skipped.
- `app/capture/perf_harness.py` MUST fail with a non-zero exit when
  `fps_p05 < 77` or `dropped_frames > 0`, unless `HARDWARE_ACCEPTANCE` is
  unset (in which case it prints `skipped: HARDWARE_ACCEPTANCE unset` and
  exits 0).

## 5. Non-goals

- No color-space normalization: adapters return raw bytes plus a
  `PixelFormat` string. Conversion lives in `app/pipeline/normalize.py`.
- No auto-reconnect: `E_CAP_DISCONNECTED` surfaces to the caller; retry
  policy lives in the SDK facade (`src/lib/sdk-facade.server.ts`).
- No hardware simulation inside adapters. Fake SDKs are test-only.

## References

- `spec/21-app/62-v2-execution-order.md:44-52` - v2.0.2 exit criteria.
- `spec/21-app/67-v2-discovery-contract.md` - v2.0.1 discovery contract.
- `.lovable/plans/pending/17-v2.0.2-vendor-sdk.md` - execution plan.

## Acceptance Checklist

- [ ] SDK contract lists open/close/capture/error hooks exhaustively.
- [ ] Every vendor spec (63/64/65) implements every hook or documents its N/A.
- [ ] Contract change requires bump + note in spec 98 changelog.
