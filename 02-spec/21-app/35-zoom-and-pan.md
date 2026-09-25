# 31 — Zoom & Pan

**Status:** Locked (Plan 04 Step 31). Governs how the Rule Setup canvas (and any read-only viewport that shows the same image) zooms, pans, and fits — without ever mutating persisted geometry.

Anchors: 30 (UI overview — 40 px action header, no reflow), 31 (Rule Setup canvas), 32 (Shape Model — image-space integers), 33/34 (verdict math independent of view state).

## 1. Purpose

Zoom and pan are pure view transforms. They change `ImageToScreen` only; they never change `Region.geometryJson`. A shape drawn at 40 % zoom saves the same pixel coordinates as one drawn at 100 %.

## 2. View-State Model

The canvas holds an in-memory `ViewState` (never persisted to DB):

| Field          | Type                             | Rule                                               |
| -------------- | -------------------------------- | -------------------------------------------------- |
| `ZoomPercent`  | number                           | 5 ≤ z ≤ 800. Snap steps in §4.                     |
| `PanX`, `PanY` | number                           | Image-space pixels of the top-left visible corner. |
| `FitMode`      | `FIT` \| `ONE_HUNDRED` \| `FREE` | Set by the four viewport buttons in §5.            |

`ImageToScreen(p)` = `(p - Pan) * (ZoomPercent / 100)`. Its inverse is the only function allowed to translate pointer events into image space (32 §Coordinate System).

## 3. Layout Stability (non-negotiable)

- The canvas viewport is a fixed rectangle inside the Rule Setup center column (31 §Layout). Zoom/pan MUST NOT change the pixel size of the viewport, the Regions panel, the Rule Builder panel, the tool ribbon, or the action bar.
- Overflow is clipped inside the viewport; scrollbars are NOT rendered (pan replaces scrollbars).
- Reflowing sibling panels on zoom is a bug — file `E_UI_LAYOUT_REFLOW`.

## 4. Zoom Steps

- Discrete steps: `5, 10, 25, 40, 50, 75, 100, 150, 200, 300, 400, 600, 800` (percent).
- Wheel zoom snaps to the nearest step in the direction of the wheel.
- Pinch / Ctrl+wheel zooms about the pointer (image-space pixel under the cursor stays under the cursor).
- Keyboard: `+` / `-` step, `0` = `FIT`, `1` = `ONE_HUNDRED`.

## 5. Fit Modes

| Mode          | Definition                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `FIT`         | Largest zoom step that keeps the entire image inside the viewport, then center.                                 |
| `ONE_HUNDRED` | `ZoomPercent = 100`; one image pixel = one CSS pixel; center on last pan target.                                |
| `FREE`        | Any user pan or wheel-zoom transitions to `FREE`; the mode chip in the action header reflects this immediately. |

Switching modes MUST recompute `Pan` synchronously in the same frame — no animated tween is allowed to leave geometry hit-testing stale.

## 6. Panning

- Left-drag on empty canvas pans; left-drag on a shape edits geometry (32 §Hit-Testing Order).
- Space+drag pans regardless of what is under the cursor (matches image 34/35 operator habit).
- Middle-mouse drag pans.
- Pan is clamped so at least 32 image-space pixels of the image remain inside the viewport on every side (image can’t be scrolled fully off-screen).

## 7. High-DPI & Rendering

- Device pixel ratio is applied to the canvas backing store only; `ImageToScreen` continues to work in CSS pixels.
- Nearest-neighbor sampling at `ZoomPercent >= 400` so inspection pixels remain visually addressable; bilinear below.
- Rendering the image, ROIs, and handles happens in one composited pass per frame; partial repaints are forbidden (they cause handle-lag bugs at low zoom).

## 8. Observability

- Emit `canvas.view.changed { ZoomPercent, PanX, PanY, FitMode, cause }` on every commit; `cause ∈ { WHEEL, KEY, BUTTON, PROGRAMMATIC, WINDOW_RESIZE }`.
- Emit `canvas.view.rejected { requestedZoomPercent, reason }` when a request is clamped or refused (e.g., invalid zoom, would-hide-image pan). Reasons: `E_ZOOM_OUT_OF_RANGE`, `E_PAN_OUT_OF_BOUNDS`, `E_VIEW_DURING_RUN`.
- View state changes are debounced to at most 60 events/sec; the last event per debounce window is guaranteed to fire so telemetry never lies about the final state.

## 9. Interaction Guardrails

- Zoom and pan are ALLOWED while a RunSession is `RUNNING` in read-only viewers (Results, Run Monitor), but Rule Setup is nav-locked entirely per 30 §Nav Lock, so the question does not arise there.
- Fit-to-viewport MUST NOT trigger a `Region` bounds validation error; validation runs against image-space geometry, which zoom cannot change.
- Window resize preserves `ZoomPercent` and re-derives `Pan` to keep the same image-space center point visible.

## 10. Cross-References

- Canvas ownership: 31 §Canvas.
- Coordinate math: 32 §Coordinate System.
- Chrome heights that must not reflow: 30 §Global Chrome.
- Read-only reuse: 38 (Results screen, upcoming) and 37 (Run Monitor, upcoming) both consume this same view-state model.

## Acceptance Checklist

- [ ] Zoom bounds and step declared; UI clamps to them (`W_UI_ZOOM_CLAMPED`).
- [ ] Pan is bounded by image extent; no infinite scroll.
- [ ] Wheel/pinch bindings match `src/components/hmi/` handlers.
