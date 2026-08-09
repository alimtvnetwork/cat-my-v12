# 30 - Blob Detection

**Version:** 1.0
**Owner:** Plan 64 step 32
**Depends on:** `13-rule-kinds-catalogue.md`, `spec/23-app-db/01-root-db-schema.md` §4.3 (`blobMinAreaPx`, `blobMaxAreaPx`, `blobConnectivity`).

---

## Purpose

`BlobDetection` counts connected regions inside an ROI whose area falls in `[blobMinAreaPx, blobMaxAreaPx]`, and grades against an expected count.

## Params

| Field              | Type | Default  | Notes                                                         |
| ------------------ | ---- | -------- | ------------------------------------------------------------- |
| `roi*`             | geom | required |                                                               |
| `blobMinAreaPx`    | int  | 25       | Inclusive.                                                    |
| `blobMaxAreaPx`    | int  | 100000   | Inclusive.                                                    |
| `blobConnectivity` | int  | 8        | 4 or 8.                                                       |
| `binarisation`     | enum | `Otsu`   | `Otsu`, `AdaptiveMean`, `AdaptiveGaussian`, `FixedThreshold`. |
| `fixedThreshold`   | int? | null     | Used only when `binarisation = FixedThreshold` (0-255).       |
| `polarity`         | enum | `Dark`   | `Dark` (blobs are darker than background), `Light`, `Either`. |
| `expectedCountMin` | int? | null     | Verdict = Pass when count within [min,max]; null = no lower.  |
| `expectedCountMax` | int? | null     | null = no upper bound.                                        |

## Algorithm

1. Crop ROI, apply optional mask.
2. Binarise per `binarisation` + `polarity`.
3. Connected components using `blobConnectivity`.
4. Filter by area.
5. Grade the remaining count against `[expectedCountMin, expectedCountMax]`.

## Result

```
verdict: Pass|Fail|Error
score:   1 when count in range, else 0
details: {
  count: n,
  blobs: [{ cx, cy, area_px, bbox: {x,y,w,h} }],
  binarisation_used: '...',
  threshold_used: number|null,
}
overlays: [
  { kind: 'roi', svg: '<rect/>' },
  { kind: 'annotation', svg: '<circle cx cy r=sqrt(area/PI)/> per blob' }
]
```

## UI

- Tools palette exposes area sliders (min, max), connectivity radio, binarisation dropdown with a live threshold histogram, polarity radio, expected-count range input.
- Preview overlays each accepted blob as a filled circle with its area label.

## Error paths

- Both expected counts null and no other pass criteria -> save is allowed; verdict always `Pass` and the UI shows an "Informational only" pill next to the rule name.
- `fixedThreshold` null while binarisation is `FixedThreshold` -> save-time validation error.

## Verification

- Fixtures: images with known blob counts (0, 1, 5, 20). Assert `details.count` matches ground truth.
- Playwright: set range `[3, 7]`, drop image with 5 blobs -> Pass; drop image with 10 blobs -> Fail with `details.count = 10`.
