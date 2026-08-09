---
Source: assets/tools-images/36-shapetrax3-search-region-yellow-roi.jpg
Screen: Tool Edit — ShapeTrax3 (Search Region)
Related-Spec: 21-app/40-tools.md
---

# 36 — Tool Edit — ShapeTrax3 (Search Region)

## 1. One-line purpose

A canvas-based interactive screen where the user defines the outer boundary (Search Region) in which the algorithm will look for the pattern.

## 2. Full-frame layout

- **Left Pane:** Image Viewer showing the target object. A green dashed rectangular box with square corner/edge handles is overlaid on the image. A mouse cursor is shown interacting with the right edge handle.
- **Right Pane (Tool Settings):**
  - **Header:** Breadcrumb `ShapeTrax3 > Search Region`.
  - **Search Region (Top):** Dropdown to select the boundary shape (`Rectangle`).
  - **Mask Region (Middle):** Dropdowns for `Mask Region 0` to `3` (all `None`). Masks are used to exclude parts of the search area.
  - **Image Region (Bottom):** Checkbox `Use Image Region` (unchecked) and related disabled settings (Reference Tool, Detection Color).
- **Footer:** `OK`, `Cancel`.

## 3. Color palette and role

- **Backgrounds:** Right pane is light gray (#EAEAEA).
- **Image Overlays:** The Search Region ROI is drawn in bright green with yellow/green control handles.

## 4. Text transcription (grouped by region)

**Right Pane**
`ShapeTrax3 > Search Region`

_(Search Region)_
`Search Region` | `Rectangle [v]` `[>>]`

_(Mask Region)_
`Mask Region 0` | `None [v]`
`Mask Region 1` | `None [v]`
`Mask Region 2` | `None [v]`
`Mask Region 3` | `None [v]`

_(Image Region)_
`[ ] Use Image Region`
`Reference Tool` | `[None]`
`Detection Color` | `(*) White  ( ) Black`
`[Preview]`

**Footer**
`OK` `Cancel`

## 5. Interactive controls

- **Canvas ROI:** The user can click and drag the green handles on the image to resize the search area, or drag the center to move it.
- **Shape Dropdown:** Changes the bounding box from a Rectangle to a Circle, Polygon, etc.

## 6. User expectation and workflow context

The user clicked "Search Region" from the main tool edit screen. They are now defining the spatial limits of the inspection. A larger search region takes more processing time but handles more part variation/movement. A tighter region is faster and less prone to false positives.

## 7. Adjacent screens

- `35-shapetrax3-reference-image-detection-conditions.jpg`: The parent screen.
- `37-shapetrax3-search-region-green-roi-mask-config.jpg`: Alternate photo of this same screen.

## 8. Data shown

- Current ROI shape (`Rectangle`).

## 9. Failure and edge states hinted

- `Use Image Region` allows dynamic search boundaries based on the output of a _previous_ tool (e.g., first find the part, then search relative to it). It is disabled because no reference tool is selected.

## 10. AI-consumption notes

- **Mapping to our app:** This translates to a modal or full-screen canvas view dedicated to a specific node parameter (`search_region`). The UI must support interactive vector graphics (SVG/Canvas) overlaid on a raster image.
