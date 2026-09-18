# 61 — Sample Images, FOV Variants, and Spotlight Focus

**Status:** Draft. Adds the sample-image gallery, field-of-view (FOV) variants, and the spotlight visualization mode to the Rule Setup canvas.

Anchors: 31 (Rule Setup screen), 32 (Shape Model), 33 (Rule Catalog), 60 (Rule Acceptance Contract).

## 1. Purpose

Operators author rules against a representative image. v1 ships three sample categories so a program can be prototyped before the real camera is available:

- `pcb` — printed circuit boards (default shipped sample).
- `circuit` — reserved for through-hole and hybrid circuit references (future).
- `carrier-tape` — reel-fed component tapes; each variant declares the pocket count visible in the framing.

Carrier-tape variants exist because the camera field of view (FOV) determines how many pockets are simultaneously in frame. A wide-FOV camera sees 4 pockets; a standard-FOV camera sees 2 or 3. The gallery ships one thumbnail per pocket count so the operator picks the one that matches their optics.

## 2. Sample Descriptor

```json
{
  "SampleId": "carrier-tape-3",
  "Label": "Carrier tape, 3 pockets",
  "Category": "CarrierTape",
  "PocketCount": 3,
  "Fov": "Standard FOV",
  "Url": "/__l5e/assets-v1/.../carrier-tape-partial.jpg"
}
```

- `Category`: `Pcb` | `Circuit` | `CarrierTape`.
- `PocketCount`: required for `CarrierTape`; omit otherwise.
- `Fov`: free-text label shown to the operator; not consumed by the worker.
- `Url`: CDN-served asset. Workers never fetch this URL; it is a UI-only reference.

## 3. Spotlight Focus (visualization only)

When one or more rules are selected on the setup canvas, the viewport dims pixels outside the selection so the operator concentrates on the active region.

- Toggled by the `Focus: on/off` HUD button (default on).
- Dim overlay: `rgba(0,0,0,0.55)` with even-odd hole per selected rectangle.
- Visualization only. MUST NOT alter geometry, coordinates, or pixels sent to the worker.
- With zero selection the overlay is skipped even when the toggle is on.

## 4. Backend Contract

Workers receive the sample descriptor as metadata:

```json
"sample": {
  "sampleId": "carrier-tape-4",
  "category": "CarrierTape",
  "pocketCount": 4,
  "fov": "Wide FOV"
}
```

- Missing `sample` implies `Category=Pcb`, `PocketCount=null`.
- Workers MUST NOT resolve `Url`; strip it before hand-off.
- `sampleId` MAY be logged in per-image evaluation records.

## 5. Non-Goals

- No automatic pocket detection; `pocketCount` is authored, not measured.
- No perspective correction tied to FOV variants.
- Spotlight is not a mask; masks stay in `Region.geometryJson` per 32.

## Acceptance Checklist

- [ ] Sample picker in canvas HUD lists all `SAMPLE_LIBRARY` entries.
- [ ] Reference Image card shows the same gallery.
- [ ] Spotlight overlay dims non-selected area when toggle is on and a rule is selected.
- [ ] Ruleset export includes the selected sample descriptor.

## 6. Camera Capture (setup, POV, and SDK bridge)

The reference image can also come from the live camera. Operators tune the
camera on `/settings/camera` (route `settings.camera.tsx`, component
`CameraPreview`) and then press `Capture from camera` on the reference card.

Camera setup fields authored by the operator:

| Field        | Range       | Notes                                               |
| ------------ | ----------- | --------------------------------------------------- |
| `povId`      | preset id   | `top-down`, `tilt-30`, `tilt-45`, `side`, `custom`. |
| `brightness` | 0.5 - 2.0   | Multiplicative luminance.                           |
| `contrast`   | 0.5 - 2.0   | Around mid-gray.                                    |
| `exposure`   | -100 - +100 | Shift toward black at negative values.              |
| `enhance`    | 0 - 100     | Unsharp / edge boost.                               |
| `saturation` | 0 - 200     | Percentage.                                         |
| `gain`       | 0 - 100     | Sensor gain / ISO multiplier.                       |

Persisted client-side under `ca.settings.camera.controls`. When `Capture
from camera` is invoked, the UI calls `buildCaptureRequest()` from
`src/lib/camera/capture-bridge.ts` to snapshot the persisted controls,
then hands the merged request to `captureReferenceFromCamera(request)`.
Explicit fields on the caller's request override the persisted values
for that shot. The helper delegates to the Python worker via IPC:

```
capture.reference.snapshot
  request  { povId, brightness, contrast, exposure, gain, enhance, saturation }
  response { dataUrl, width, height }
```

The worker MUST apply every field on the request to the vendor SDK
(POV, brightness, contrast, exposure, gain, enhance, saturation) before
triggering the frame grab so the returned image matches what the
operator sees on the /settings/camera preview.

The worker owns the vendor SDK dialogue (Pylon, Spinnaker, Vimba). Until the
IPC endpoint is live, `captureReferenceFromCamera` throws
`CameraUnavailableError` so the UI stays operable against the shipped sample
gallery. Sample gallery contents (1 to 4 pocket variants for carrier tape, PCB
default) remain the fallback whenever no camera is attached.
