---
Source: assets/tools-images/38-shapetrax3-pattern-region-red-roi.jpg
Screen: Tool Edit — ShapeTrax3 (Pattern Region)
Related-Spec: 21-app/40-tools.md
---

# 38 — Tool Edit — ShapeTrax3 (Pattern Region)

## 1. One-line purpose

A canvas-based interactive screen where the user defines the inner template (Pattern Region) that the algorithm will memorize and search for.

## 2. Full-frame layout

- **Left Pane:** Image Viewer showing the target object. A red/magenta dashed rectangular box with corner handles is overlaid tightly around the specific feature to be learned (e.g., a central square mark on the chip).
- **Right Pane (Tool Settings):**
  - **Header:** Breadcrumb `ShapeTrax3 > Pattern Region`.
  - **Pattern Region:** Dropdown to select the boundary shape (`Rectangle`).
  - **Masking Tools:**
    - `[ ] Feature Drawing Tool` (button `Edit` disabled).
    - `[x] Eraser Tool` (button `Edit` enabled).
  - **Mask Region:** Dropdowns for `Mask Region 0` to `3` (all `None`).
- **Footer:** `OK`, `Cancel`.

## 3. Color palette and role

- **Backgrounds:** Right pane is light gray (#EAEAEA).
- **Image Overlays:** The Pattern Region ROI is drawn in bright red/magenta, distinguishing it from the green Search Region.

## 4. Text transcription (grouped by region)

**Right Pane**
`ShapeTrax3 > Pattern Region`

_(Pattern Region)_
`Pattern Region` | `Rectangle [v]` `[>>]`

_(Drawing/Masking)_
`[ ] Feature Drawing Tool`
`[Edit]` (Disabled)
`[x] Eraser Tool`
`[Edit]` (Enabled)

_(Mask Region)_
`Mask Region 0` | `None [v]`
`Mask Region 1` | `None [v]`
`Mask Region 2` | `None [v]`
`Mask Region 3` | `None [v]`

**Footer**
`OK` `Cancel`

## 5. Interactive controls

- **Canvas ROI:** The user drags the red bounding box tightly around the unique visual feature they want to teach the system.
- **Eraser Tool:** Checking this and clicking `Edit` likely enters a sub-mode where the user can paint over parts _inside_ the red rectangle that should be ignored during matching (e.g., ignoring a variable date code printed next to a static logo).

## 6. User expectation and workflow context

After setting the outer Search bounds, the user sets the inner Pattern bounds. The system will extract edges and contrast from _only_ the pixels inside this red box to form its reference model.

## 7. Adjacent screens

- `36-shapetrax3-search-region-yellow-roi.jpg`: The preceding Search Region step.
- `39-shapetrax3-pattern-region-red-mask-edit.jpg`: The state after saving this region.

## 8. Data shown

- Current ROI shape (`Rectangle`).
- Active tool (`Eraser Tool`).

## 9. Failure and edge states hinted

- If the feature drawing tool is unchecked, its corresponding Edit button is disabled.

## 10. AI-consumption notes

- **Mapping to our app:** This is the second half of the spatial definition for a pattern match node (`pattern_region`). The concept of an "Eraser Tool" to dynamically mask out irrelevant pixels within a bounding box is an advanced but common feature in machine vision apps.
