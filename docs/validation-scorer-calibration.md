# Validation scorer calibration

Step 3 of the current backlog. Measures the per-kind scorer output
against a labeled fixture set and proposes default pass/fail thresholds.

## How to reproduce

```
python worker/fixtures/build.py     # regenerate 30 synthetic fixtures
python worker/calibrate.py          # score them + sweep thresholds
```

Outputs `worker/calibration-report.json` (raw scores + per-kind best F1
cutoff + confusion counts) and prints a summary table to stdout.

## Fixture set (v1, synthetic)

30 images, 200x200, 6 per rule kind (3 pass, 3 fail):

- `C` colour presence: red target vs blue swatch.
- `R` reference match: matching swatch vs off-hue swatch.
- `K` edge density: dense checker vs flat swatch.
- `S` shape fill: ~0.5 random fill vs 0.05 / 0.9 fills.
- `E` empty: white vs cluttered checker.

Deterministic (`numpy.random.default_rng(42)`). Fixtures live under
`worker/fixtures/data/`; labels in `worker/fixtures/labels.json`.

## Results (v1)

| Kind | n   | Pass min | Fail max | Best F1 cutoff | F1  | Confusion (tp/fp/tn/fn) |
| ---- | --- | -------- | -------- | -------------- | --- | ----------------------- |
| C    | 6   | 1.000    | 0.000    | 0.01           | 1.0 | 3/0/3/0                 |
| R    | 6   | 0.989    | 0.000    | 0.01           | 1.0 | 3/0/3/0                 |
| K    | 6   | 0.879    | 0.000    | 0.01           | 1.0 | 3/0/3/0                 |
| S    | 6   | 0.966    | 0.202    | 0.21           | 1.0 | 3/0/3/0                 |
| E    | 6   | 1.000    | 0.500    | 0.51           | 1.0 | 3/0/3/0                 |

All kinds separate cleanly on synthetic data; F1 = 1.0 across the board.
That is expected: v1 fixtures were built to exercise the wire-up and
establish score direction, not to stress-test edge cases.

## Suggested default thresholds

The "best F1" cutoff sits at the low end of the score gap because the
sweep prefers the smallest passing threshold. For UI defaults we prefer
the midpoint between the worst pass and the worst fail, which leaves
headroom on both sides:

| Kind | Suggested default | Rationale                                                                                    |
| ---- | ----------------- | -------------------------------------------------------------------------------------------- |
| C    | 0.50              | Clean bimodal split; 0.5 is halfway between saturated match / non-match.                     |
| R    | 0.50              | Same shape as C; reference diff decays to 0 well before 0.5.                                 |
| K    | 0.45              | Edge fraction floors at ~0.88 for real checker patterns; 0.45 keeps noise-only ROIs failing. |
| S    | 0.60              | Fill-fraction scorer squeezes symmetrically; 0.6 keeps ~0.4/0.6 real fills passing.          |
| E    | 0.75              | Emptiness scorer already reports 1 - non_bg_fraction; 0.75 tolerates 25% clutter.            |

These land as the initial defaults for the threshold suggestion UI
(backlog step 4). Rule authors still override per rule; the calibration
report is the fallback hint.

## Known limits (v1 fixtures)

- Synthetic swatches only: no camera noise, no JPEG banding, no
  lighting gradients. Real captures will compress the pass/fail gap; a
  v2 fixture pass with actual images will move thresholds up (C, R,
  E) or add margin (K, S).
- No adversarial fixtures (near-miss colours, partial fills, low-contrast
  edges). Add them in v2 to expose real-world failure modes.
- Scorers are pure numpy/Pillow. Real OpenCV/Tesseract detectors will
  shift score distributions; re-run calibration when the scorer swaps.

## When to re-run

- Any change to `worker/scorer.py` (new detector, params tweak).
- New fixture kind or additional labeled captures.
- Before adjusting the threshold suggestion UI defaults.
