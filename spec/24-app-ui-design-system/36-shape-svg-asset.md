# 36 - Shape SVG Asset

**Version:** 1.0
**Owner:** Plan 64 step 38
**Depends on:** `14-design-mode-custom-shapes.md`, `spec/23-app-db/02-rule-sets.mmd`, `32-export-json-schema.md`.

---

## Purpose

Define the internal SVG format used for every user-drawn or imported Shape. The stored SVG is a normalised path plus optional holes, in a fixed viewBox unit space, so the runtime can rasterise deterministically regardless of the source drawing tool.

## Storage

- Table: `Shape` per `02-rule-sets.mmd`.
- On disk: `rule-sets/<rs>/shapes/<Name>__<uuid>.svg` + `.sha256`.
- Persisted fields: `svgPath` (single normalised path in `d` attribute grammar), `holesJson` (array of paths cut out of `svgPath`), `viewBoxW`, `viewBoxH`, `checksumSha256`.

## Coordinate space

- viewBox is `0 0 <viewBoxW> <viewBoxH>` in abstract units. Units are shape-space, not pixels; the rule's `roiW/H` map to `viewBoxW/H` at runtime by uniform scale.
- No transforms: the persisted path has no `translate`, `rotate`, `scale`, or `matrix`. Any transform present on import is baked into the coordinates.
- Path grammar: absolute commands only (`M`, `L`, `H`, `V`, `C`, `Q`, `A`, `Z`). Relative commands are converted to absolute on save. Arc `A` allowed; `T`/`S` shorthand is expanded on save.
- Numeric precision: 3 decimal places; trailing zeros stripped. Coordinates outside `[0, viewBox*]` are rejected as `code: 'ShapeOutOfBounds'`.

## Holes

- `holesJson` is an array of path strings using the same grammar. Each hole must be fully inside `svgPath` (winding check on save); otherwise `code: 'HoleNotContained'`.
- Rendering: outer path fill-rule = `evenodd`; holes cut out naturally under evenodd. The serialised SVG file uses a single `<path fill-rule="evenodd" d="<outer> <holes...>"/>` for compatibility with vector viewers.

## Export SVG file shape

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"
     data-ca-name="NeckRing" data-ca-id="abc-...">
  <path fill-rule="evenodd" d="M ... Z M ... Z"/>
</svg>
```

- Only the elements above are allowed on export. On import, other elements (`<g>`, `<rect>`, `<circle>`, etc.) are flattened into a single path via a preprocessing pass; unsupported constructs (`<image>`, `<foreignObject>`, `<use>` targeting external resources) are rejected with `code: 'ShapeUnsupportedElement'`.

## Import from external tools

- Illustrator / Inkscape / Figma exports are accepted through the preprocessor:
  1. Parse with a DOM parser inside a sandboxed Worker.
  2. Reject scripts, `xlink:href` external references, and embedded raster `<image>`.
  3. Flatten transforms, expand shorthand commands, convert to absolute, resample to 3 decimals.
  4. Detect the outer path by winding (largest positive-signed area); the rest become holes if fully contained, else the import is refused.
- The pre-processed SVG is what is stored; the original file is NOT retained (out of scope for v1; users keep their source).

## Rendering at runtime

- The dispatcher receives the shape's `svgPath` + `holesJson` + `viewBoxW/H` + the rule's `roiX/Y/W/H/Rotation` and rasterises to a binary mask at the capture's resolution using an even-odd fill.
- Anti-aliased edges: the mask carries an alpha ramp of width `max(1, min(roiW, roiH) * 0.005)` on the boundary; internal grading uses the 0.5 threshold of the alpha ramp.

## Verification

- Contract test: import a fixture Illustrator SVG with transforms + shorthand commands; assert stored `svgPath` uses absolute commands only, no transforms, 3-decimal precision.
- Contract test: attempt to import an SVG with an embedded `<image>`; assert `code: 'ShapeUnsupportedElement'`.
- Playwright: draw a shape in Design Mode, save, close and re-open the rule, assert the shape re-renders pixel-identical.
