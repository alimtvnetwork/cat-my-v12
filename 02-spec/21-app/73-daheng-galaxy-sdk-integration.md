# 70 - Daheng Galaxy SDK Integration (LOCKED)

**Status:** Locked (2026-07-21). Governs the Daheng Imaging **Galaxy SDK** (`GxIAPI` / `gxipy`) integration behind `BE.sdk_facade.CameraFacade`. This spec is the twin of `sdk/daheng-galaxy-sdk-manual.md` (AI integration reference distilled from the vendor PDF). If the two disagree on error mapping, **this spec wins** and the manual file must be updated to match.

**Anchors:** `52-sdk-facade-pattern.md` (facade seam rule), `68-v2-vendor-sdk-contract.md` (lifecycle + fault taxonomy for the v2 vendor adapters), `40-error-manage.md` (central `ErrorCode` registry).

## 1. Source of truth

| Artifact                                               | Role                                                                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk/daheng-galaxy-sdk-manual.pdf.asset.json`          | Externalized vendor PDF (266 pp). Never re-commit the binary.                                                                                            |
| `sdk/daheng-galaxy-sdk-manual.md`                      | AI-facing distilled reference; authoritative for facade method mapping.                                                                                  |
| `BE/sdk_facade/__init__.py`                            | `CameraFacade` Protocol, enums (`PixelFormat`, `TriggerMode/Source/Activation`), value objects (`DeviceInfo`, `Roi`, `Frame`), and `SDK_FACADE_VERSION`. |
| `BE/sdk_facade/camera.py`                              | `InMemoryCameraFacade` reference implementation (no vendor SDK).                                                                                         |
| `BE/errors/codes.py`                                   | Central `ErrorCode` enum. **Only** source that may declare `E_*` string literals.                                                                        |
| `BE/tests/test_camera_facade.py`, `test_sdk_facade.py` | Contract + validation tests (Plan 88 Step 21).                                                                                                           |

## 2. Naming rule (why we renamed)

Files under `sdk/` MUST identify **the vendor and the SDK product name** in the filename, not just the word "vendor". The prior `vendor-sdk-manual.*` naming was ambiguous:

- It hid which vendor (Daheng vs. Basler / FLIR / Allied Vision / Hikvision).
- It hid which SDK (Galaxy vs. Pylon / Spinnaker / Vimba / MVS).
- It made a future second vendor drop overwrite-collision-prone.

Naming convention (enforced in code review):

```
sdk/<vendor>-<sdk-product>-<artifact-kind>.<ext>
sdk/<vendor>-<sdk-product>-<artifact-kind>.<ext>.asset.json   # for externalized binaries
```

Applied here:

- `sdk/daheng-galaxy-sdk-manual.md`
- `sdk/daheng-galaxy-sdk-manual.pdf.asset.json`

Future drops (when they land) follow the same pattern: `sdk/basler-pylon-sdk-manual.*`, `sdk/flir-spinnaker-sdk-manual.*`, etc.

## 3. Facade Protocol lock

The `CameraFacade` Protocol in `BE/sdk_facade/__init__.py` mirrors §2 of the manual file. Any change to the Protocol MUST bump `SDK_FACADE_VERSION` (semver-like, dotted) and update the manual file's §11 change log in the same commit. Current wire value: **`0.3.0-protocol`**.

Value objects (`DeviceInfo`, `Roi`, `Frame`) are frozen dataclasses; vendor handles (device pointers, `gxipy.Device`, stream handles) MUST NOT appear in return types or field types anywhere outside `BE/sdk_facade/adapters/**`.

## 4. Error mapping (authoritative)

The manual file §8 lists the same table; if they diverge, this section wins. Every vendor exception caught inside a Daheng adapter is re-raised as `AppError(code=..., cause=original)`:

| Vendor condition                                                  | `ErrorCode`                                         | HTTP |
| ----------------------------------------------------------------- | --------------------------------------------------- | ---- |
| Device not found / unknown serial on `open`                       | `E_CAM_NOT_CONNECTED`                               | 503  |
| Second `open` while another serial held                           | `E_BE_CONFLICT`                                     | 409  |
| `get_image` timeout                                               | `E_CAM_TIMEOUT`                                     | 504  |
| Capture failed / bandwidth exceeded / dropped frame / stub `grab` | `E_CAM_CAPTURE_FAILED`                              | 502  |
| Parameter out of range                                            | `E_BE_BAD_REQUEST` (`{node, value, min, max, inc}`) | 400  |
| USB reset / cable unplug                                          | `E_CAM_NOT_CONNECTED` + reconnect backoff           | 503  |
| SDK init failure at boot                                          | `E_SDK_INIT_FAILED`                                 | 503  |
| Vendor type escaping facade                                       | `E_BUG_SDK_LEAK`                                    | 500  |

`E_BE_TIMEOUT` does not exist; use `E_CAM_TIMEOUT` or open an ADR to extend the registry.

## 5. Adapter registry (future)

When the real Daheng adapter lands (post-Plan 88 Step 130+), it registers as:

```python
# BE/sdk_facade/adapters/daheng_galaxy.py
class DahengGalaxyCameraFacade:  # satisfies CameraFacade Protocol
    """Real gxipy-backed adapter. Only place that may `import gxipy`."""
```

Registration is via DI, not module-level side effects; the launcher chooses between `InMemoryCameraFacade` (default: FE dev / CI / no hardware) and `DahengGalaxyCameraFacade` (when `CAT_CAMERA_ADAPTER=daheng-galaxy` is set and the SDK is importable).

## 6. Definition of done for a Daheng-related PR

- [ ] Facade Protocol unchanged, or Protocol change + `SDK_FACADE_VERSION` bump + manual §11 update.
- [ ] Error mapping uses only codes from `BE/errors/codes.py`.
- [ ] No `import gxipy` / `from GxIAPI import ...` outside `BE/sdk_facade/adapters/**`.
- [ ] `BE/tests/test_camera_facade.py` and `test_sdk_facade.py` pass.
- [ ] If the vendor PDF is updated, only the `.pdf.asset.json` pointer changes; the binary is re-uploaded via `lovable-assets`, never committed.

## 7. Change log

- **v1.3**: Documented landed adapter surface, provider selection (`daheng` vs `inmemory` vs `replay`), and hardware test suite (`test_daheng_smoke.py`). See `sdk/daheng-galaxy-sdk-manual.md` for full AI integration reference.
