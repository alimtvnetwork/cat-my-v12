# Task 02 — Grayscale and luminance

Slug: pattern-search-and-ui-improvement - Task 02

Status: PENDING (spec done, fix not started).

## Spec

`02-spec/21-app/03-pattern-search-and-ui-improvement/02-grayscale-luminance-matcher-and-dispatch.md`
§1–§4, §10–§11.

## Scope

- One BT.601 luma function shared by frontend and backend; fix the numpy
  BGR fallback red/blue swap.
- True binary threshold preview (fix half-binarization).
- One threshold setting with a migration rule (replacing 170 / 35 / 22 /
  40); toleranceLuma becomes a real setting.
- Sample/reference symmetry in the backend score path; >12MP downsample
  must not break ROI coordinates.
- Run the §10 diagnostic FIRST to determine which grayscale path is
  reported broken (theme, mask, or pattern-match) — do not guess.

## File box (disjoint)

`BE/app/domain/vision_eval.py` (_to_grayscale only),
`src/lib/vision/white-box-marking.ts` (gray/threshold functions only),
threshold resolution in both pattern hooks and sim tolerances,
`BE/routes/score.py` (downsample/optical symmetry only),
`BE/app/domain/vision_preprocess.py`. No region geometry, no dispatch.

## Acceptance

- [ ] Same image through cv2 path and numpy path gives identical output
  (golden-image test).
- [ ] Threshold preview is binary; one threshold key resolves everywhere.
- [ ] Sample and reference receive identical treatment.
- [ ] Diagnostic result recorded (which grayscale was broken).
