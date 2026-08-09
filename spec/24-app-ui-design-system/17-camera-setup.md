# 17 - Camera Setup

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), step 12, feeds step 77
**Depends on:** `16-project-lifecycle.md`, `spec/21-app/` (worker SDK bridges)

---

## Purpose

Define the CameraSetting record used by every Project. A Project references exactly one CameraSetting; a CameraSetting can be reused across Projects. Setup lives at `/setup/camera` and inside the Project detail Camera tab.

## Object model

```
CameraSetting
  id, name, vendor ('Pylon'|'Spinnaker'|'Vimba'|'GenericV4L2'),
  device_serial,
  fov_mm_w, fov_mm_h,             -- physical field of view at focal plane
  resolution_w, resolution_h,      -- pixels
  pixel_size_um,                   -- optional, derived if lens + FOV known
  exposure_us,                     -- shutter, microseconds
  gain_db,
  gamma,
  white_balance_kelvin,            -- 0 = auto
  focus_mode ('Manual'|'Auto'),
  focus_value,                     -- mm, when Manual
  trigger_mode ('Software'|'Hardware'|'Continuous'),
  frame_rate_hz,
  pockets                          -- INT >= 1, count of images per run
  roi_json,                        -- optional ROI {x,y,w,h} in pixels
  color_mode ('Mono8'|'Mono12'|'RGB8'|'Bayer_RG8'),
  notes
  created_at, updated_at
```

`pockets` is the "how many pockets we want to take the image" quantity from the user's brief. Each pocket = one capture per Run.

## UI form (Camera Setup)

Grouped into four collapsible sections, all use tokens from `01-foundations.md`:

1. **Identity** - name, vendor, device_serial (auto-fill from an "Enumerate Devices" button that calls `listCameraDevices()`).
2. **Optics** - fov_mm_w, fov_mm_h, resolution_w, resolution_h, pixel_size_um (auto-derived; user can override).
3. **Exposure** - exposure_us (slider + numeric, log scale 10..100000), gain_db (0..48), gamma (0.2..3.0), white_balance_kelvin (2000..10000, 0 = Auto), color_mode.
4. **Acquisition** - trigger_mode, frame_rate_hz, pockets (int stepper, default 1), focus_mode, focus_value, roi (opens a ROI selector on the current live preview).

Live preview: an `<img>` bound to a server-sent MJPEG stream at `/api/public/camera/stream/<setting_id>` (dev-only fallback: uploaded still). Preview reflects the current form values without saving them, via `previewCameraSetting(patch)` returning a signed short-lived stream URL.

## Interactions

| Action            | Server fn                          | Notes                                                   |
| ----------------- | ---------------------------------- | ------------------------------------------------------- |
| Enumerate devices | `listCameraDevices()`              | Returns `{ vendor, serial, model }[]`.                  |
| Test capture      | `captureTestFrame(id, patch)`      | Returns `{ image_url, meta }`. Registers a RunningOp.   |
| Save              | `saveCameraSetting(payload)`       | Upsert. Validates with Zod; unknown fields rejected.    |
| Delete            | `deleteCameraSetting(id)`          | Blocked when referenced by a Project; lists references. |
| Duplicate         | `duplicateCameraSetting(id)`       | Suffixes name with " Copy" and next 2-digit sequence.   |
| Attach to project | `setProjectCamera(project_id, id)` | See `16-project-lifecycle.md`.                          |

## Validation rules

- `resolution_w`, `resolution_h`, `pockets`, `frame_rate_hz` integers > 0.
- `exposure_us` integer in [1, 10_000_000].
- `gain_db` in [0, 60].
- `gamma` in [0.1, 5.0].
- `focus_value` required only when `focus_mode='Manual'`.
- `roi_json.x + w <= resolution_w`, same for y+h; otherwise reject with field-level error.

Server function rejects invalid inputs with a structured error (`code`, `path`, `message`). No silent coercion.

## Export / Import

Included in the Project Zip under `manifest.json.camera_setting`. Standalone export as JSON is available from the Camera Setup index (`Export`, `Import`).

## Verification

- Playwright: enumerate devices in dev mode returns at least the "MockCamera" entry; save a setting; assert it appears in the picker inside a Project.
- Playwright: attempt to save `exposure_us=0`; assert field-level error and no DB write.
- Manual: change exposure while live preview is running; preview reflects the new value within one frame.

## Open ambiguities

- None specific here. Q18 (worker spawning) is upstream and does not block this spec.
