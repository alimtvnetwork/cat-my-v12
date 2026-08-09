# 14 - Design Mode + Custom Shapes

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), steps 67-69
**Depends on:** `12-rules-editor-shell.md`, `13-rule-kinds-catalogue.md`

---

## Purpose

Give users a Photoshop-style drawing surface layered over the current test image, so they can compose a reusable region shape (rectangle, ellipse, polygon, freehand, boolean combinations) and compile it into a named `Shape` asset. Shape assets are stored, exported, and imported like any other rule asset.

## Entering Design Mode

- Toolbar button `Design Mode` in the Tools palette. Keyboard shortcut `D`.
- While Design Mode is active:
  - The canvas dims non-shape UI to 40% opacity.
  - Rule-layer clicks are suppressed; only shape editing is possible.
  - A "Compile Shape" and "Cancel" pair appears in the top-right of the canvas.

## Primitives

| Tool      | Shortcut  | Notes                                                     |
| --------- | --------- | --------------------------------------------------------- |
| Rectangle | R         | Click-drag. Shift constrains to square.                   |
| Ellipse   | O         | Click-drag. Shift constrains to circle.                   |
| Polygon   | P         | Click to place vertices, double-click or Enter to close.  |
| Freehand  | F         | Pointer-drag path; simplified with Ramer-Douglas-Peucker. |
| Bezier    | B         | Full path tool with handles.                              |
| Union     | Cmd+U     | Combine two selected shapes.                              |
| Subtract  | Cmd+Minus | Second-selected subtracts from first.                     |
| Intersect | Cmd+I     | Selected shapes intersect.                                |
| Exclude   | Cmd+E     | Symmetric difference.                                     |

## Compile

"Compile Shape" flattens the drawing to a single closed SVG path (or a group of paths for holes), normalised to a `1000x1000` viewBox with `preserveAspectRatio="xMidYMid meet"`. Metadata captured:

```json
{
  "id": "uuid",
  "name": "Serial Region",
  "svg_path_d": "M ...",
  "svg_holes": ["M ...", "..."],
  "bbox": { "x": 0, "y": 0, "w": 1000, "h": 1000 },
  "source_image_ref": "uuid|null",
  "created_at": "..."
}
```

Stored in `shapes` table (see `spec/23-app-db/05-user-assets.mmd`). After compile the user is returned to the standard editor with the new shape selected and referenced by `region_shape_id` on the active rule.

## Import / Export

- **Import SVG**: single-path or multi-path SVG. First moved to `1000x1000` viewBox. Multi-path files land as one shape with holes computed by even-odd rule.
- **Import Mask (raster)**: PNG/JPG. Threshold from `params_json.mask_threshold` (default 128). The largest connected component becomes the outer path; other components become holes when `params_json.mask_holes = true`.
- **Export SVG**: writes `<svg viewBox="0 0 1000 1000">` with a single `<path d="...">` and optional holes.
- **Export as reusable Shape asset**: JSON manifest above plus SVG file bundled in the rule-set export (see `15-export-import.md`).

## Reuse across projects

- Shapes are addressable by `id` and by `name` scoped to a rule set. During import, name collisions offer Skip / Overwrite / Rename (see `35-import-flow.md`).
- A Shape can be referenced by rules in different rule sets. Deleting a shape referenced anywhere is blocked; the UI lists all references before allowing a forced delete.

## Validation while drawing

- Self-intersecting polygons are highlighted red with a tooltip; Compile is disabled until resolved.
- Shapes with area under 4 px^2 are rejected on compile.
- Freehand paths auto-close when the last point is within 12 px of the first; otherwise the user must click Close.

## Verification

- Playwright: draw a rectangle, compile, assert the new shape appears in the Layers palette under the active rule and in the shape browser.
- Playwright: import a sample SVG (`tests/fixtures/star.svg`), assert compiled bbox equals viewBox.
- Manual: undo/redo work inside Design Mode without leaking history to the main editor stack.
