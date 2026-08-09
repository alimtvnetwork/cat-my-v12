# 29 - Barcode / QR

**Version:** 1.0 (draft, BLOCKED by Q10 for the final symbology list)
**Owner:** Plan 64 step 31
**Depends on:** `13-rule-kinds-catalogue.md`, `spec/23-app-db/01-root-db-schema.md` §4.3 (`barcodeSymbology`, `barcodeExpected`).

---

## Purpose

`BarcodeQr` decodes 1D and 2D codes inside an ROI and grades against an expected value or regex.

## Symbology enum (working assumption)

`Auto` (any supported, first hit wins), `QRCode`, `DataMatrix`, `Aztec`, `PDF417`, `Code128`, `Code39`, `Code93`, `EAN13`, `EAN8`, `UPCA`, `UPCE`, `ITF`, `Codabar`. Q10 will trim or extend this. Storage is a single TEXT column, not a bitmask; multi-symbology support is future work.

## Params

| Field              | Type    | Default  | Notes                                                             |
| ------------------ | ------- | -------- | ----------------------------------------------------------------- |
| `roi*`             | geom    | required | Rectangle recommended; `roiRotation` supported for tilted labels. |
| `barcodeSymbology` | enum    | `Auto`   | See list above.                                                   |
| `barcodeExpected`  | string? | null     | Literal, or `re:<regex>` for regex, or null to accept any decode. |
| `minQuality`       | 0..100  | 0        | Decoder-reported quality; below this scores as `Fail`.            |
| `maxCandidates`    | int     | 1        | When > 1, multiple codes are decoded and each is graded.          |
| `tryInvert`        | bool    | true     | Attempt inverted decode when the primary pass fails.              |

## Result

```
verdict: 'Pass'|'Fail'|'Error'
score:   quality/100 for the winning candidate, 0 for no decode
details: {
  candidates: [{ text, symbology, quality, corners: [{x,y}×4] }],
  matched:   { text, symbology } | null,
}
overlays: [
  { kind: 'roi', svg: '<rect/>' },
  { kind: 'annotation', svg: '<polygon class="barcode"/> per candidate + text label' }
]
```

Verdict rules:

- No decode -> `Fail`, `details.candidates = []`.
- `barcodeExpected` null -> `Pass` if any candidate has `quality >= minQuality`.
- `barcodeExpected = "..."` literal -> `Pass` iff a candidate matches exactly and passes quality.
- `barcodeExpected = "re:..."` -> `Pass` iff a candidate matches the regex and passes quality. Invalid regex fails at save time.

## UI

- Tools palette shows symbology dropdown, expected-value input with a small `re:` prefix pill toggle, quality slider.
- Preview overlays the decoded polygon and the decoded string above it.
- Validate loop follows `26-validate-single-image.md`.

## Error paths

- Zero candidates + `tryInvert = true` reported in `details.tried_invert = true` for debugging.
- Decoder timeout (5 s) -> `Error` with `code: 'DecoderTimeout'`.

## Verification

- Fixtures: 3 QR + 3 DataMatrix + 3 Code128 images, both matching and mismatching. Assert per-fixture verdict + `details.matched.symbology`.
- Playwright: create rule with `barcodeExpected = "re:^SN-\\d{6}$"`, drop matching + mismatching image, assert verdicts.

## Open ambiguity

- Q10: final symbology list and per-symbology quality thresholds.
