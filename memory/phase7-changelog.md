# Phase 7 Changelog: Vision Processing & Backend Offload (Tasks 201-250)

**Date**: 2026-08-17
**Commits**: `9400105` through `fcd3192`

## Summary

Phase 7 delivered the full vision evaluation pipeline: from UI button click
through OpenCV algorithms to database persistence.

## Key Deliverables

### Backend Vision Evaluation (`BE/app/domain/vision_eval.py`)

- `evaluate_pattern_match()` — OpenCV `matchTemplate` normalized cross-correlation
- `evaluate_grayscale_tolerance()` — histogram comparison with tolerance slider
- `_track_shapes()` — contour detection via `findContours`
- `_check_color_area()` — color thresholding via `inRange`
- All wrapped in `asyncio.to_thread` to avoid blocking FastAPI event loop

### Image Preprocessing (`BE/app/domain/vision_preprocess.py`)

- Auto-downsampling for images > 12MP (configurable threshold)
- Structured JSON error logging for OpenCV failures

### Score Endpoints

- `POST /score` — single rule evaluation with threshold respect
- `POST /score/batch` — batch evaluation returning per-rule results
- Both registered in `BE/routes/api/router.py`

### Error Codes

- `E_VISION_FAULT` registered in BE `codes.py` + FE `api-codes.ts`
- `E_HW_LIGHTING` registered in both registries
- Both have HTTP status mappings

### Frontend Score UI

- `ScoreResultBadge.tsx` — PASS/FAIL + confidence with `is_pass` type
- `ConfidenceThresholdSlider.tsx` — 0-100% range with 40px touch target
- `BatchEvalProgress.tsx` — progress bar for Test All Rules workflow
- `GoldenBadge.tsx` — star badge for golden baseline images

### Auto-Evaluate (`src/hooks/useAutoEvaluate.ts`)

- Debounced 200ms, throttled to max 5fps
- Triggers `POST /score` after each capture when enabled
- `isAutoEvaluate` + `confidenceThreshold` added to `useVisionStore`

### Judgment Database

- Migration `0010_add_image_judgments.sql`
- `ImageHistory.JudgmentPass`, `.JudgmentConfidence`, `.IsGolden`
- `PUT /images/:id/golden` endpoint
- Golden image cleanup protection in `task_cleanup.py`

### Test Coverage

- `test_vision_eval.py` — grayscale tolerance unit tests
- `test_task_cleanup.py` — golden protection tests
- `batch-evaluation.spec.ts` — Playwright batch E2E test
- `test_phase7_audit.py` — integration import smoke tests

## Phase 7 Signoff

All 50 tasks (201-250) of Phase 7 have been executed.

**Status: PHASE 7 COMPLETE**
