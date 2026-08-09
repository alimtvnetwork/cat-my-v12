# 48 - Color Condition

**Status:** Draft (Plan 42 Step 3). Anchors: 47 (rule condition model), 33 (rule catalog), 34 (tolerance model), 62 (rule mask image).

## 1. Purpose

Fix the contract for the `Color` condition introduced in 47. A Color condition asserts that the pixels inside the rule's ROI match an expected color within a Delta-E tolerance. The `Mode` field selects HOW the expected color is sourced.

Slot 48 was chosen because slots 40-46 in `spec/21-app/` are already occupied (see 47 s1). Plan 42's original text referenced slot 41; that number is re-mapped to 48.

## 2. Non-Goals

- No per-pixel color-difference heatmap output. Judgment reports a single verdict + reasonCode per condition.
- No colorspace picker in v3. All math runs in CIE Lab, converted from linear sRGB per s6.
- No multi-swatch OR. A Color condition asserts one expected color; use two Color conditions on the same rule to AND two colors.

## 3. Envelope Recap

```json
{
  "id": "cnd_01H...",
  "type": "color",
  "params": {
    "Mode": "Current" | "Dense2" | "Dense3" | "Picked",
    "ExpectedColor": "#RRGGBB",
    "DeltaE": 3.0
  }
}
```

`Mode` values are the closed enum `ColorMode` in `src/types/rules/ColorMode.ts`. String literals in `params` MUST equal the enum's serialized value; the runtime parser rejects any other string.

## 4. Mode Semantics

| Mode    | Meaning                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Current | Compare against `ExpectedColor` directly. This is the "eyedropper on the reference image" path; `ExpectedColor` is authored at rule save time. |
| Dense2  | Extract the 2 densest color clusters from the captured ROI and PASS iff any cluster centroid is within `DeltaE` of `ExpectedColor`.            |
| Dense3  | Same as Dense2 with k=3.                                                                                                                       |
| Picked  | Alias of Current with an editor affordance (eyedropper on the current image). Runner semantics are identical to Current.                       |

`ExpectedColor` is REQUIRED for every Mode. For Dense2 / Dense3, `ExpectedColor` is the reference the densest clusters are compared against; the ROI is not auto-accepted just because clusters exist.

## 5. Params Constraints

| Field         | Type   | Rule                                                                                       |
| ------------- | ------ | ------------------------------------------------------------------------------------------ |
| Mode          | enum   | Must be a `ColorMode` value. No free-text.                                                 |
| ExpectedColor | string | `/^#[0-9a-fA-F]{6}$/`. Alpha channel not supported in v3.                                  |
| DeltaE        | number | Finite, `>= 0`. `0` means exact match (still Lab-quantized). UI default `3.0`, cap `50.0`. |

Persist as-is on the rule (47 s8). No separate side table.

## 6. Evaluation Pipeline

1. Decode `ExpectedColor` as sRGB, gamma-linearize, convert to CIE Lab (D65).
2. Extract ROI pixels from the captured image (respect rule mask per 62).
3. Compute the comparison set:
   - Current / Picked: the mean Lab of the ROI (masked pixels only).
   - Dense2 / Dense3: k-means centroids in Lab space (k=2 or k=3, max 32 iterations, seed = first pixel, deterministic).
4. For each element of the comparison set, compute Delta-E 2000 (`ciede2000`) against the expected Lab.
5. Verdict:
   - Current / Picked: PASS iff mean deltaE `<= DeltaE`.
   - Dense2 / Dense3: PASS iff `min(deltaE_i) <= DeltaE`.
6. On PASS return `reasonCode = "OK"`. On FAIL return `reasonCode = "ColorDeltaE"` and `reasonMessage = "deltaE {value} exceeds threshold {DeltaE}"`.

Purity: same pixels + same params must yield the same verdict (47 s7).

## 7. Error Handling

- Malformed `ExpectedColor` (fails regex) or non-finite `DeltaE`: schema-level rejection at load time; migration coerces v2 rules to a default `Current` + expected color derived from the reference image if available, otherwise the condition is dropped and the rule falls back to a `SameImage` condition (47 s3).
- Runtime exception inside the evaluator: `AppError` with `ErrorCode.RuleConditionEval` (per 40 Error Manage). Never swallowed.
- Empty ROI after masking: verdict = `ERROR`, `reasonCode = "EmptyRoi"`.

## 8. UI Contract

Full spec in `50-rule-controller-ui.md`. Summary:

- Segmented control for `Mode`.
- Color swatch + hex input for `ExpectedColor`. Eyedropper button when Mode = `Picked`.
- Numeric input for `DeltaE` with a Delta-E preview strip (see 34 Tolerance Model conventions).
- Live preview badge shows the current ROI's mean Lab distance to `ExpectedColor` while the drawer is open.

## 9. Acceptance Checklist

- [ ] `ColorMode` values are the ONLY strings ever seen in `params.Mode` at runtime (typecheck + magic-string lint).
- [ ] Delta-E 2000 implementation is a single shared helper (`src/lib/color/deltaE.ts`); no duplicate copies.
- [ ] k-means centroid extraction is deterministic (seed = first pixel) and covered by a Vitest golden test.
- [ ] `reasonCode = "ColorDeltaE"` is asserted by a targeted runner test on a failing image.
- [ ] Empty ROI yields `reasonCode = "EmptyRoi"`, not a thrown exception (defensive test).
- [ ] v2 rules that had a `color` controller migrate to a single Color condition with the controller's stored hex + delta, preserving prior verdicts.
