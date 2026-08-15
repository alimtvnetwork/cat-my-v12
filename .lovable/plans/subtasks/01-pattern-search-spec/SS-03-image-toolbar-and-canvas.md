# SS-03-image-toolbar-and-canvas

## 1. Goal
Implement the Image Toolbar and the Canvas with region overlays as specified in Sections 4 and 5 of `.lovable/plans/pending/01-pattern-search-spec.md`.

## 2. Instructions
1. Review Sections 4 and 5.
2. Build the `StandardImageToolbar` component containing the Image Source dropdown, Rendering dropdown, Refresh icon, Zoom in/out/fit buttons, Zoom % readout, and the 3 view-mode icons.
3. Build the `StandardCanvas` component to display the image.
4. Implement the region overlays on the canvas:
   - Yellow rectangle: image region
   - Blue rectangle: search region
   - Green rectangle: pattern region
   - Magenta/pink square handles for the selected region
5. Wire up the drag and resize engine for the regions.
   - It MUST share logic with the Modern UI (do not write a duplicate drag engine).
   - Geometry must be stored in image pixel coordinates and converted through the zoom/pan transform.
   - Enforce minimum size and clamp to image bounds.
6. Implement cursor-anchored, delta-normalised wheel/pinch zoom via a non-passive `wheel` listener so the page does not scroll.

## 3. Strict Rules
- Movement and resize must update the shared settings live (throttled to animation frames).
- Panning via middle-drag or space-drag is required.
