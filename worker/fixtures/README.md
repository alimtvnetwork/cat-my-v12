# Calibration fixtures

Generated synthetic labeled set for the validation scorer. Each fixture
is a 200x200 RGB image plus a rule spec (kind + params + ROI) and an
expected label (`pass` or `fail`). Deterministic: regenerate with
`python worker/fixtures/build.py`.

Sets:

- `colour_pass_*` - ROI filled with target red; expected pass.
- `colour_fail_*` - ROI filled with off-target blue; expected fail.
- `reference_pass_*` / `reference_fail_*` - swatch match / mismatch.
- `edges_pass_*` - dense checker pattern; edges expected.
- `edges_fail_*` - flat swatch; no edges expected.
- `shape_pass_*` / `shape_fail_*` - fill fraction near / far from expected.
- `empty_pass_*` / `empty_fail_*` - blank vs cluttered ROI.

Labels live in `labels.json`.
