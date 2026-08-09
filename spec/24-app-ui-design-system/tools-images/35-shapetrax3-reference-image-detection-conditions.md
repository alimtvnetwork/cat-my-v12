---
Source: assets/tools-images/35-shapetrax3-reference-image-detection-conditions.jpg
Screen: Tool Edit — ShapeTrax3 (Detection Conditions)
Related-Spec: 21-app/40-tools.md
---

# 35 — Tool Edit — ShapeTrax3 (Detection Conditions)

## 1. One-line purpose

The main configuration view for a ShapeTrax3 pattern matching tool, allowing the user to define the reference image, region ROIs, and algorithmic detection tolerances.

## 2. Full-frame layout

- **Left Pane:** Image Viewer showing a physical IC chip on a conveyor/tray. A red rectangular overlay indicates the "Pattern Region" (the template to search for). A top overlay displays live measurement data (`Count`, `Pos. X`, `Match %`).
- **Right Pane (Tool Settings):**
  - **Header:** `T100 Pin 1`, `[Icon] ShapeTrax3`.
  - **Reference Image Header:** Dropdown indicating `Reference Image 1 - 601`.
  - **Quick Action Icons (Top Block):** Four large buttons (`Search Region`, `Pattern Region`, `Extract Colors`, `Image Enhance`).
  - **Detection Conditions (Middle Block):** Inputs for `Angle Range` and `Detection Count`.
  - **Feature Extraction Conditions (Bottom Block):** Radio for `Display Feature` (`Coarse`/`Fine`) and dropdown for `Feat. Extraction Settings`.
- **Footer:** Sub-navigation `Origin/Point`, `Display`, and standard `OK`, `Cancel`.

## 3. Color palette and role

- **Backgrounds:** Right pane is light gray (#EAEAEA). Headers are dark blue/red denoting "Edit Mode" (unlike the gray of the dashboard).
- **Image Overlays:** Red box denotes the pattern template ROI. Yellow box denotes the outer search region boundaries.

## 4. Text transcription (grouped by region)

**Left Pane (Image Viewer Overlay)**
`Unit Time 4.0ms`
`Count 1`
`Judged Label`
`Pos. X 0.000`
`Pos. Y 0.000`
`Angle 0.000`
`Match % 0.000` (Red text, indicating failure)
`Scale 0.000`

**Right Pane (Tool Settings)**
`T100 Pin 1`
`ShapeTrax3`
`Reference Image` | `1 - 601`

_(Quick Actions)_
`[Icon] Search Region`
`[Icon] Pattern Region`
`[Icon] Extract Colors` (Disabled)
`[Icon] Image Enhance`

_(Detection Conditions)_ `[>>]`
`Angle Range` | `+/- [005]`
`Detection Count` | `[0001]`

_(Feature Extraction Conditions)_ `[>>]`
`Display Feature` | `(*) Coarse ( ) Fine`
`Feat. Extraction Settings` | `Automatic [v]`

**Footer**
`Origin/Point`, `Display` | `OK`, `Cancel` | `Run`

## 5. Interactive controls

- **Quick Action Buttons:** Launch sub-modals or interactive canvas modes to draw rectangles on the image.
- **Numeric Inputs:** Define the algorithmic flexibility (e.g., allow matching even if rotated +/- 5 degrees).

## 6. User expectation and workflow context

The user has entered Edit mode for a pattern matching tool. The immediate next steps are to define _where_ to look (Search Region) and _what_ to look for (Pattern Region) by clicking those large buttons and drawing on the image canvas.

## 7. Adjacent screens

- `34-shapetrax3-measurement-panel-t100-pin1.jpg`: The dashboard screen before clicking Edit.
- `36-shapetrax3-search-region-yellow-roi.jpg`: The state after clicking `Search Region`.

## 8. Data shown

- Live algorithm outputs overlaying the image. Match % is 0.000 (red) because the pattern hasn't been found/taught properly yet.

## 9. Failure and edge states hinted

- `Extract Colors` is disabled, likely because the connected camera (Image 29) was configured as a Mono-CCD.

## 10. AI-consumption notes

- **Mapping to our app:** This defines the `EditorNodeView` for a pattern match node. The grouping into "Regions" (spatial definition) vs "Detection Conditions" (algorithmic thresholds) is standard. We must implement interactive canvas overlays for drawing `Search Region` (outer bounds) and `Pattern Region` (inner template).
