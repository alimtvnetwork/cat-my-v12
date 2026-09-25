# 27 — Shape Model

**Status:** Locked (Plan 04 Step 27). Defines the persisted geometry contract used by Rule Setup, workers, Results overlays, and JSON instruction output.

Anchors: 22 (`Region.geometryJson`), 23 (override snapshots), 31 (Rule Setup canvas), 34 (tolerance model — next), 36 (JSON instruction output), images 34–39.

## 1. Purpose

The Shape Model is the single geometry source of truth for every inspection region. UI drawing, rule preview, worker evaluation, and result drill-in all consume the same `Region.geometryJson` payload; no screen is allowed to invent a second coordinate model.

## 2. Ground Truth From Images 34–39

Observed behaviors to preserve:

- Image 34 shows multiple blue reference rectangles over a dark image viewport and a right-side measurement panel.
- Images 35–36 show a Search Region rectangle with colored outline, corner handles, and image-space editing while zoom is 40%.
- Image 37 shows a green active Search Region with mask slots, proving mask regions are linked to a parent search region.
- Image 38 shows a Pattern Region with red/pink outline and mask controls.
- Image 39 shows a Pattern Region edit state with red box and feature extraction settings.

## 3. Coordinate System

| Property    | Rule                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Origin      | Top-left of the source image.                                                                        |
| Axis        | X increases right; Y increases down.                                                                 |
| Unit        | Integer image pixels.                                                                                |
| Persistence | Persist image-space coordinates only; never persist CSS pixels, zoom, pan, or device-pixel ratio.    |
| Bounds      | Every point must satisfy `0 <= X < ImageWidth` and `0 <= Y < ImageHeight`.                           |
| Transform   | UI owns a reversible `ImageToScreen` transform for zoom/pan; hit-testing uses the inverse transform. |

Zoom, pan, fit-to-viewport, and 100% pixel view must never mutate geometry. A shape dragged at 40% zoom saves the same image-space result as a shape dragged at 100% zoom.

## 4. Persisted Shape Kinds

The v1 persisted `Region.shapeKind` set is locked to 22 §4:

| `ShapeKind` | Geometry payload                           | Use                                                   |
| ----------- | ------------------------------------------ | ----------------------------------------------------- |
| `RECTANGLE` | `X`, `Y`, `Width`, `Height`, `RotationDeg` | Search Region, Pattern Region, fixed measurement box. |
| `ELLIPSE`   | `CenterX`, `CenterY`, `RadiusX`, `RadiusY` | Round holes, circular marks, blob presence.           |
| `POLYGON`   | `Points[]` (`X`, `Y`)                      | Irregular but bounded area; closed implicitly.        |

`FREEFORM` is not a persisted v1 `Region.shapeKind`. Freeform drawing/eraser behavior belongs to mask editing and stays deferred under AI-04 until the DB enum and worker evaluator are extended.

## 5. `geometryJson` Envelope

JSON keys and enum values are PascalCase per the project authoring rules.

```json
{
  "SchemaVersion": "1.0",
  "ShapeKind": "RECTANGLE",
  "RegionRole": "SEARCH_REGION",
  "ImageWidth": 1280,
  "ImageHeight": 960,
  "Geometry": {
    "X": 418,
    "Y": 301,
    "Width": 54,
    "Height": 62,
    "RotationDeg": 0
  },
  "Display": {
    "ColorRole": "SEARCH",
    "ZIndex": 20
  },
  "Link": null
}
```

Allowed `RegionRole` values:

- `SEARCH_REGION` — first-stage location / candidate search area.
- `PATTERN_REGION` — reference pattern area used for matching.
- `MASK_REGION` — exclusion/inclusion region linked to a parent search or pattern region.
- `IMAGE_REGION` — optional image-region constraint from 31 §2.3.
- `MEASUREMENT_REGION` — rule-owned region used directly by count, flaw, OCR, or graphic checks.

## 6. Shape-Specific Validation

### 6.1 Rectangle

- `Width` and `Height` must be at least 4 px.
- `RotationDeg` is allowed only for `RECTANGLE` in v1; normalize to `-180 <= RotationDeg < 180`.
- Axis-aligned rectangles use `RotationDeg = 0`.
- Rotated rectangle bounds are validated after rotation using all four corners.

### 6.2 Ellipse

- `RadiusX` and `RadiusY` must be at least 2 px.
- Ellipses are axis-aligned in v1.
- The bounding box derived from center/radius must fit within the image.

### 6.3 Polygon

- Minimum 3 points; maximum 64 points.
- Points are stored in clockwise order when possible.
- Self-intersecting polygons are invalid.
- The closing segment is implicit; do not duplicate the first point at the end.

## 7. Grouped Shapes

`Region.parentRegionId` creates logical groups. The parent is the inspection anchor; children are masks, pattern sub-regions, or measurement children.

Rules:

- Group depth hard cap = 2 (`Parent → Child`). No grandchild chains in v1.
- Parent move applies the same delta to all active children.
- Child move never moves the parent.
- Deleting a parent soft-deactivates children by setting `isActive=0`.
- Cycles are invalid and must be rejected before save.

## 8. XY-Linked Bounds

XY-linked regions support position-adjusted inspection where a child follows a parent but must remain within configured bounds.

`Link` payload:

```json
{
  "Mode": "XY_LINKED",
  "ParentRegionId": "01HZX4Q4W8B5Y4V1V2R6FJ9K0A",
  "OffsetX": 12,
  "OffsetY": -4,
  "Bounds": {
    "MinX": -20,
    "MaxX": 20,
    "MinY": -20,
    "MaxY": 20
  },
  "MatchPercentMin": 80.0
}
```

Evaluation rule:

- Worker first resolves the parent pose.
- Child expected position = parent pose + `OffsetX` / `OffsetY`.
- If observed child pose falls outside bounds, the linked rule returns `NG` with a metrics payload describing the exceeded axis.
- If matching confidence is below `MatchPercentMin`, verdict is `NG` unless the rule evaluator raises a typed error.

## 9. Display Roles

Display color is semantic, not arbitrary:

| `ColorRole` | Meaning                              |
| ----------- | ------------------------------------ |
| `SEARCH`    | Search region outline.               |
| `PATTERN`   | Pattern/reference region outline.    |
| `MASK`      | Mask/include/exclude region outline. |
| `SELECTED`  | Active edit selection.               |
| `ERROR`     | Invalid geometry or failed preview.  |

The UI maps roles to design tokens. The Shape Model stores the role only; it does not store hex colors.

## 10. Error Codes

| Code                     | Trigger                                                         | Surface                                          |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------ |
| `E_GEOMETRY_KIND`        | Unknown `ShapeKind` or role.                                    | Inline Region row error + task log.              |
| `E_GEOMETRY_BOUNDS`      | Geometry outside image bounds.                                  | Canvas outline turns error state; Save disabled. |
| `E_GEOMETRY_EMPTY`       | Rectangle/ellipse below minimum size or polygon under 3 points. | Draw operation discarded with status log entry.  |
| `E_GEOMETRY_POINTS`      | Polygon self-intersection or too many points.                   | Inline error near polygon editor.                |
| `E_GEOMETRY_LINK_CYCLE`  | Parent/child cycle.                                             | Blocking Save dialog.                            |
| `E_GEOMETRY_LINK_BOUNDS` | XY-linked child exceeds allowed bounds.                         | Preview `NG` with metrics.                       |

All errors must include `taskId`, `regionId`, `shapeKind`, `operation`, and `imageSize` context when logged.

## 11. Worker Contract

Workers receive geometry only through the immutable RunSession snapshot from 23 §6. Workers never open the UI state store and never infer geometry from rendered pixels.

Required worker steps:

1. Parse `geometryJson` into a typed shape.
2. Validate schema and bounds.
3. Crop or mask source pixels using image-space geometry.
4. Evaluate the rule.
5. Emit `Judgment.metricsJson` with measured pose, match percent, and exceeded bounds where applicable.

## 12. Non-Goals

- No 3D transforms.
- No Bézier paths.
- No persisted freehand mask in v1.
- No shape sharing across Tasks.
- No geometry migration at UI load; migrations belong to 26.

## Acceptance Checklist

- [ ] Shape kinds enumerated match memory 09 PascalCase enums.
- [ ] Coordinate frame documented (image pixels, top-left origin).
- [ ] Every shape serializable to spec 36 JSON instruction output.
