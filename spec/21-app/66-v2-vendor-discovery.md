# 13 - Vendor Discovery Service

Fourth v2 capture seam behind `VendorDeviceIO`. The goal is to enumerate connected cameras before boot selects the active capture backend.

## Module contract

| Module                                        | Contract                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `app/capture/vendor_device_io.py`             | Defines `VendorDeviceDescriptor` and `VendorDeviceIO.list_devices()` as the common discovery row shape.          |
| `app/capture/pylon_device_io.py`              | `list_pylon_devices()` enumerates `TlFactory.EnumerateDevices()` rows without opening capture.                   |
| `app/capture/spinnaker_device_io.py`          | `list_spinnaker_devices()` enumerates `System.GetCameras()` rows and always releases the camera list and system. |
| `app/capture/vimba_device_io.py`              | `list_vimba_devices()` enters `VmbSystem`, reads `get_all_cameras()`, then exits the context.                    |
| `src/lib/capture.functions.ts`                | Exposes `getDiscoveredDevices` and `selectCaptureDevice` as server functions for the Settings UI.                |
| `src/components/hmi/DeviceDiscoveryPanel.tsx` | Shows discovered devices and lets the operator select one.                                                       |

## Descriptor fields

- `vendor`: one of `pylon`, `spinnaker`, `vimba`.
- `serial`: vendor reported camera serial or device id.
- `model`: vendor reported model string.
- `transport`: GigE, USB3, or vendor transport class.
- `display_name`: optional operator facing label.

## Operator selection contract

The wire-level request/response shapes, Zod validators, HTTP codes, and failure envelope live in `spec/21-app/67-v2-discovery-contract.md` (single source of truth). This section pins only what the module contract in §Module contract owes to that wire contract:

- `getDiscoveredDevices` reads the aggregate from `app/capture/vendor_discovery.py::discover_all_devices`. SDK-absent vendors return `[]` and MUST emit `W_DISCOVERY_PARTIAL` (spec 40) — silent skips are banned.
- `selectCaptureDevice` MUST call `app/capture/vendor_discovery.py::resolve_selection(vendor, serial)` BEFORE `SettingsStore.write_capture_device` persists. Unknown pairs raise `E_CFG_UNKNOWN_DEVICE` (spec 40 §Config/DB) and MUST audit on subject `settings.capture.device` (Plan 26 Step 4 wires this).
- Persistence path is `SettingsStore.write_capture_device` (`app/core/config/settings_store.py::write_capture_device`), which owns the `I_SEC_ADMIN_WRITE` emit with `{prior, next}` JSON detail.
- All three server-fn failure codes (`E_CFG_UNKNOWN_DEVICE`, `E_SEC_ROLE_DENIED`, `E_SEC_RATE_LIMITED`) are registered in `spec/21-app/40-error-manage.md`; no ad-hoc string codes may leak to the client envelope.

## Error and audit contract

- Unknown selected device ids raise `E_CFG_UNKNOWN_DEVICE`.
- Selecting a discovered device emits `I_SEC_ADMIN_WRITE` with subject `settings.capture.device`.
- Selecting a discovered device also updates the runtime `capture.vendor` mirror to the device vendor.

## Proving tests

- `tests/integration/test_vendor_discovery.py` covers per-vendor descriptor mapping.
- `tests/e2e/ops_vendor_smoke.py` locks the browser round-trip in 4 steps: `ops-live-bridge`, `vendor-toggle`, `ops-shows-admin-write`, and `discovery-pick`. The `discovery-pick` step selects a device from `DeviceDiscoveryPanel` and asserts an `I_SEC_ADMIN_WRITE` row with subject `settings.capture.device` in `/ops`. Landed at v1.42.1 to close audit L1, now consolidated in `spec/25-app-audit/latest/40-signoff.md`.

## VendorDiscoveryFacade binding

| Facade member                  | Source                                     | Output                                      | Error code                                         |
| ------------------------------ | ------------------------------------------ | ------------------------------------------- | -------------------------------------------------- |
| `ListDevices()`                | Pylon, Spinnaker, and Vimba list functions | `CatDeviceDescriptor[]`                     | `E_CAP_DISCOVERY_TIMEOUT`, `E_CAP_DISCOVERY_EMPTY` |
| `SelectDevice(vendor, serial)` | Settings store admin-write path            | persisted `CatCaptureDeviceSelection`       | `E_CFG_UNKNOWN_DEVICE`, `E_SEC_DENIED`             |
| `DescribeSelection()`          | Settings store read path                   | current `CatCaptureDeviceSelection` or null | `E_CONFIG_KEY_MISSING`                             |

The facade is the only module allowed to aggregate vendor descriptors. It returns the Zod shape from `spec/21-app/67-v2-discovery-contract.md` and never returns raw SDK descriptor objects.

## Contract back-links

| Target                                     | Required use                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `spec/21-app/52-sdk-facade-pattern.md`     | `VendorDiscoveryFacade`, `CatDeviceDescriptor`, and no raw SDK descriptor leaks past the facade seam. |
| `spec/21-app/67-v2-discovery-contract.md`  | `getDiscoveredDevices`, `selectCaptureDevice`, Zod schemas, and unknown-selection behavior.           |
| `spec/21-app/68-v2-vendor-sdk-contract.md` | Shared vendor names, lifecycle selection, and `CatDeviceDescriptor` vocabulary.                       |
| `spec/coding-guidelines/python.md`         | Runtime SDK guards and descriptor logging.                                                            |
| `spec/coding-guidelines/typescript.md`     | Server function validation and UI correlation ids.                                                    |

## Implementation checklist

- [ ] SDK-absent vendors return an empty descriptor set and structured warning.
- [ ] Descriptor values use PascalCase enum locks where applicable and preserve vendor serial exactly.
- [ ] Selection persists `{vendor, serial}` atomically.
- [ ] Admin writes emit `I_SEC_ADMIN_WRITE` with prior and next JSON.
- [ ] Non-admin writes return `E_SEC_DENIED`.
- [ ] Unknown selections return `E_CFG_UNKNOWN_DEVICE`.
- [ ] `/ops` shows the selection audit row within one refresh interval.

## Acceptance Checklist

- [ ] Discovery aggregator merges vendor results without duplicate `{vendor, serial}` keys.
- [ ] Timeout and partial-failure paths emit `W_DISCOVERY_PARTIAL` per spec 40.
- [ ] Persistence path resolves to local store per spec 27.
- [ ] `selectCaptureDevice` calls `resolve_selection` before `SettingsStore.write_capture_device` persists (Plan 26 Step 4).
- [ ] Unknown `{vendor, serial}` raises `E_CFG_UNKNOWN_DEVICE` and audits on subject `settings.capture.device` before returning to the client.
