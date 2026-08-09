# 37 - Mask from Raster Image

**Version:** 1.0
**Owner:** Plan 64 step 39
**Depends on:** `36-shape-svg-asset.md`, endpoint row 12 (`importMaskRaster`).

---

## Purpose

Users can drop a raster image (PNG/TIFF/JPEG) whose bright pixels represent the desired region. The importer thresholds it, extracts contours, and materialises a Shape stored per `36-shape-svg-asset.md`. This is the fast path for masks produced in Photoshop / Krita / any bitmap tool.

## Input requirements

- Formats: PNG, TIFF, JPEG. Alpha channel is honoured when present.
- Size: up to 4096 x 4096 px. Larger is rejected with `code: 'MaskTooLarge'`.
- Colour: greyscale expected; RGB inputs are converted to luma via ITU-R BT.601 (`0.299 R + 0.587 G + 0.114 B`) unless an alpha channel is present, in which case alpha is used directly.

## Parameters (from the import dialog)

| Field       | Type   | Default       | Notes                                                                             |
| ----------- | ------ | ------------- | --------------------------------------------------------------------------------- |
| `threshold` | 0..255 | `Otsu`        | Number or the string `"Otsu"` (default). If number, `>= threshold` = mask.        |
| `invert`    | bool   | false         | When true, `<= threshold` = mask.                                                 |
| `holes`     | bool   | true          | When true, contained inner contours become holes; when false, they are filled in. |
| `smoothing` | 0..5   | 1             | Chaikin subdivisions applied to each contour before path emission.                |
| `simplify`  | number | 0.5           | Douglas-Peucker epsilon in mask-space pixels; smaller = more path points.         |
| `minArea`   | int    | 25            | Contours with fewer pixels than this are discarded.                               |
| `name`      | string | filename stem | Display name; must be unique within the target RuleSet or the importer suffixes.  |

## Algorithm

1. Load image, convert to single-channel mask per the colour rule.
2. Binarise: Otsu, or fixed threshold, honouring `invert`.
3. Morphological open + close (kernel 3) to remove speckle.
4. Find contours: outer contours (RETR_EXTERNAL) for the shape; inner contours (RETR_CCOMP children) for holes when `holes = true`.
5. Filter by `minArea`.
6. Simplify with Douglas-Peucker (`simplify`), then smooth with `smoothing` Chaikin passes.
7. Choose the single largest outer contour as the primary path; any remaining outers become sibling shapes only when the user picked `Split into multiple shapes` on the dialog (default: single-shape mode; extra outers are dropped with a warning).
8. Emit `svgPath` (outer) + `holesJson` (contained inners).
9. Save through the standard Shape write path (validation, checksum, disk write).

## Preview

- The import dialog shows a live preview of the extracted contour overlaid on the source image, updating as the user tweaks parameters. All processing runs in a Worker, cancellable on parameter change.
- Metrics next to the preview: `contours`, `outer area (px)`, `holes`, `path points`.

## Error paths

- All contours filtered by `minArea` -> `code: 'MaskEmptyAfterFilter'`.
- Otsu returns a degenerate threshold on a constant image -> `code: 'MaskNoContrast'`.
- Emission of a path that fails the `36-` bounds check -> `code: 'ShapeOutOfBounds'` (rare; only happens if the source has content touching every edge and simplify collapses it).

## Verification

- Fixture: 3 masks (round, ring-with-hole, jagged). Import at defaults; assert produced Shape has expected `holesJson.length` and area within 5% of ground truth.
- Playwright: drop a fixture mask, tweak `simplify`, assert preview updates within 300 ms and final Save writes the Shape.
