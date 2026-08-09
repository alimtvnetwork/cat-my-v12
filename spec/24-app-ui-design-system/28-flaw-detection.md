# 28 - Flaw Detection

**Version:** 1.0 (draft, BLOCKED by Q9 for the algorithm choice)
**Owner:** Plan 64 step 30
**Depends on:** `13-rule-kinds-catalogue.md`, `spec/23-app-db/01-root-db-schema.md` §4.3 (`flawSensitivity`, `flawMinAreaPx`).

---

## Purpose

`FlawDetection` finds unexpected local anomalies within an ROI (scratches, dents, particles) without training a per-shape template. It is the default "does this look wrong?" rule.

## Params

| Field                   | Type   | Default  | Notes                                                           |
| ----------------------- | ------ | -------- | --------------------------------------------------------------- |
| `roi*`                  | geom   | required | From shared geometry columns (rectangle or custom shape).       |
| `flawSensitivity`       | number | 0.5      | 0-1; higher = more flaws flagged.                               |
| `flawMinAreaPx`         | int    | 25       | Discard blobs smaller than this.                                |
| `blurKernel`            | int    | 3        | Pre-smoothing (odd, 1-9).                                       |
| `illuminationInvariant` | bool   | true     | Local mean subtraction before comparison.                       |
| `expectedTemplateRef`   | shape? | null     | Optional golden reference: subtracts template before threshold. |
| `maskRef`               | shape? | null     | Exclude these subregions from grading.                          |

## Algorithm (working assumption pending Q9)

1. Crop ROI, apply mask if present.
2. If `illuminationInvariant`, subtract local mean via box filter of radius max(15, blurKernel\*3).
3. Gaussian blur with `blurKernel`.
4. Absolute difference against `expectedTemplateRef` (if provided) or against the ROI's own mean.
5. Threshold at `T = base_threshold * (1 - flawSensitivity)`; adaptive `base_threshold` = 2 \* stddev of the ROI.
6. Morphological opening (kernel 3).
7. Connected-components; drop components with `area < flawMinAreaPx`.
8. `verdict = Pass` when 0 remaining components; `Fail` otherwise. `score` = 1 - min(1, total_area / roi_area).

Q9 will finalise: whether to swap step 4/5 for a learned "one-class" model (still deterministic per input, no user training required), and whether `flawSensitivity` maps linearly or via a piecewise curve.

## Result

```
details: {
  flaw_count: n,
  total_area_px: n,
  components: [{ x, y, w, h, area_px, score }],
}
overlays: [
  { kind: 'roi',  svg: '<rect ... class="roi"/>' },
  { kind: 'mask', svg: '<... class="excluded"/>' },     // when maskRef present
  { kind: 'annotation', svg: '<rect ... class="flaw"/> per component' },
]
```

## UI

- Preview palette overlays each component in red with the area label.
- Tools palette shows `flawSensitivity` as a slider with a live histogram of the ROI's blob-area distribution to help pick `flawMinAreaPx`.
- Buttons: `Set golden reference from current image` (writes `expectedTemplateRef` shape from the current ROI). `Clear reference`.

## Error paths

- Empty ROI -> `verdict: 'Error'`, `details: { code: 'RoiEmpty' }`.
- Template dimensions mismatch ROI -> autoresize with bilinear; log a warning line; if the ratio deviates > 20% throw `Error` with `code: 'TemplateShapeMismatch'`.

## Verification

- Fixture set: 10 pass images and 10 fail images with intentional scratches, run through `validateRule`, assert AUC >= 0.95 on the fixtures.
- Playwright: create rule with defaults, drop a fail image, assert red overlays and a `Fail` verdict.

## Open ambiguity

- Q9: algorithm choice (heuristic vs one-class model), sensitivity mapping.
