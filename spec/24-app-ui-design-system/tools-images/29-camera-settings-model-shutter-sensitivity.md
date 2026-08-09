---
Source: assets/tools-images/29-camera-settings-model-shutter-sensitivity.jpg
Screen: CAM 1 : Camera Settings (Camera Tab)
Related-Spec: 21-app/40-tools.md
---

# 29 — CAM 1 : Camera Settings (Camera Tab)

## 1. One-line purpose

A hardware configuration screen to define physical camera parameters like shutter speed, sensitivity, and camera model.

## 2. Full-frame layout

- **Header:** Title `CAM 1 : Camera Settings` and instructional text.
- **Tabs:** `Camera` (Selected), `Trigger`, `Lighting` horizontally above the settings pane.
- **Left Pane:** A large, live image feed (currently showing a black/empty frame with a yellow border). A toolbar sits above it with zoom/fit controls and image buffer selectors.
- **Right Pane:** The form for camera parameters.
  - Model selection (Auto-detect or dropdown).
  - Size/resolution selection.
  - Shutter Speed (dropdown and numeric ms equivalent).
  - Sensitivity slider and input.
  - Lighting Mode dropdown.
  - Polarization toggle and color filter dropdown.
- **Footer:** `Set Advanced`, `OK`, `Cancel` buttons.

## 3. Color palette and role

- **Backgrounds:** Dark UI theme. Right pane is light gray (#EAEAEA).
- **Tabs:** The active tab (`Camera`) is highlighted orange (#FFB300).
- **Image Feed:** Black background, yellow 1px border indicating the active region of interest or full sensor frame.

## 4. Text transcription (grouped by region)

**Header**
`Camera Settings`
`Sets the conditions such as model, image size, brightness etc. of the camera to use for capturing.`

**Image Viewer Toolbar**
`Current Image` | `Raw 2 [v]` | `Refresh Icon`, `Zoom In/Out`, `Fit`, `40%`, etc.

**Tabs**
`Camera` (Selected), `Trigger`, `Lighting`

**Settings Form**
`Camera Settings`
`Model` | `[Auto]` `CA-HX200M [v]` `2M pixels x16 speed mono- CCD`
`Size` | `1600x1200 (Progressive) [v]`
`Shutter Speed` | `1/2000 [v]` `0000.500 ms`
`Sensitivity` | `[Slider at 5.0]` `5.0`
`Mode` | `Standard Lighting Mode [v]`
`[ ] Polarization Attachment In Use`
`Lighting Color` | `R [v]` `[Select from Images]`

**Footer**
`Set Advanced` | `OK` `Cancel`

## 5. Interactive controls

- **Dropdowns & Sliders:** Direct manipulation of camera hardware registers.
- **Auto Button:** Likely probes the connected hardware to auto-fill the Model dropdown.
- **Select from Images Button:** Might analyze a buffer of images to recommend an optimal lighting color/filter if multi-spectral lighting is attached.

## 6. User expectation and workflow context

This is step 0 of any machine vision application: getting a clear, well-exposed image. The user adjusts shutter speed (to freeze motion) and sensitivity/gain (to compensate for lack of light) before configuring any software inspection tools.

## 7. Adjacent screens

- `30-trigger-settings-external-internal-signal.jpg`: The adjacent "Trigger" tab.

## 8. Data shown

- Connected camera hardware specifications (`2M pixels mono-CCD`).

## 9. Failure and edge states hinted

- If the model doesn't match the physical hardware, an error likely occurs (hence the Auto button).

## 10. AI-consumption notes

- **Mapping to our app:** Camera hardware abstraction. We need a `HardwareConfig` or `CameraDevice` domain model that handles these exact parameters (exposure time, gain/sensitivity, ROI size). The UI pattern of having a live feed side-by-side with hardware sliders is standard for tuning exposure.
