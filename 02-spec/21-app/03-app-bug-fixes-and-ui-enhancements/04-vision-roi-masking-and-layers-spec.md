# Vision ROI, Masking & Layer Management Specification
# Directory: 02-spec/21-app/03-app-bug-fixes-and-ui-enhancements/04-vision-roi-masking-and-layers-spec.md
# Status: draft

## 1. Interactive Region of Interest (ROI) & Corner Drag Anchors
- The canvas ROI box must render dedicated corner handles for resizing and positioning.
- To prevent accidental selection or drag disruption when drawing new shapes, dragging is restricted strictly to corner handles (`nw`, `ne`, `sw`, `se`) and an explicit move header.
- Persistent state: The `(x, y, width, height)` coordinates must be persisted in `localStorage` and the database store so reopening the project immediately restores configured inspection regions.

## 2. Multi-Shape Masking Primitives
- Support 3 geometry modes:
  - **Rectangle**: Standard `(x, y, width, height)`.
  - **Square**: Constrained 1:1 aspect ratio.
  - **Circle**: Radial center `(cx, cy)` with radius `r`.

## 3. Layer Ordering & Locking System
- In the left-hand hierarchy tree under each ruleset, rules act as distinct visual layers.
- **Layer Locking**: Add a lock toggle (`Lock` / `Unlock`) next to the eye toggle icon. Locked layers ignore canvas clicks and pointer events, preventing accidental movement while tuning adjacent rules.
- **Context Menu (Right-Click)**:
  - `Bring to Front` (sets layer index to top).
  - `Send to Back` (sets layer index to 0).
  - `Move Up` / `Move Down`.
  - `Lock Layer` / `Unlock Layer`.

## 4. Parameter Controls Parity in Right-Hand Toolbar
- Ensure both **Pin 1 Orientation** and **Greyscale Pattern Matching** tools render their complete configuration controls in the right sidebar:
  - Luminance Threshold (slider: 0 - 255)
  - Position Tolerance (slider: 1 - 50 px)
  - Expected Hole Diameter (slider: 5 - 100 px)
  - Minimum Circularity % (slider: 10% - 100%)
  - Search Margin (slider: 0 - 50 px)
