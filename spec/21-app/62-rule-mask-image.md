# Rule shape mask (frontend -> Python worker)

Rules can carry a custom shape mask so their ROI is not limited to a
rectangle. The frontend uploads an image, thresholds it into a binary
mask, and stores three params. The Python worker MUST honor these when
building the actual pixel mask for the rule's rectangle.

## Params

All live on `rule.params` (see `src/lib/editor/types.ts`).

| Param key       | Type    | Range / values           | Default | Meaning                                                                           |
| --------------- | ------- | ------------------------ | ------- | --------------------------------------------------------------------------------- |
| `maskImageUrl`  | string  | data URL or absolute URL | `""`    | Source image. Empty means the ROI is the full rectangle.                          |
| `maskThreshold` | number  | 0..255                   | `128`   | Grayscale luminance threshold. Pixels at or above threshold are "inside" the ROI. |
| `maskInvert`    | boolean | true / false             | `false` | When true, pixels at or below the threshold are "inside" instead.                 |

Luminance is BT.601: `L = 0.299 R + 0.587 G + 0.114 B`. Fully-transparent
source pixels (alpha 0) are always "outside" regardless of threshold.

## Evaluation

The worker rescales the mask to the rule's rectangle (nearest neighbor
or bilinear, up to the worker), applies the threshold and invert flag,
and intersects the result with the rectangle. Every acceptance check
(presence, color, similarity) then operates on the intersected pixels
only, not on the full rectangle.

## Frontend

- UI: `src/components/editor/panels/MaskPanel.tsx`
- Render: `src/lib/editor/render/frame.ts` + `src/lib/editor/mask-store.ts`
- Spotlight focus uses the mask silhouette (not the rectangle) when the
  rule has a mask, so the operator sees exactly what the worker will
  analyze.

## Backwards compatibility

Older bundles without these keys behave as if `maskImageUrl` were empty:
full-rectangle ROI, no mask.
