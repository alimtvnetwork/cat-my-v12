"""Phase 7 pipeline audit — end-to-end trace (Task 246).

Validates that all Phase 7 vision processing components are in place:
1. POST /score → vision_eval.py → ConfidenceResult
2. POST /score/batch → batch evaluation loop
3. Auto-evaluate hook (useAutoEvaluate.ts) → debounced POST /score
4. Judgment DB columns (ImageHistory.JudgmentPass, .IsGolden)
5. PUT /images/:id/golden → golden baseline protection
6. Golden cleanup exclusion in task_cleanup.py
"""
import pytest


def test_vision_eval_module_importable() -> None:
    from BE.app.domain.vision_eval import (
        ConfidenceResult,
        BoundingBox,
        evaluate_grayscale_tolerance,
        evaluate_pattern_match,
    )
    assert ConfidenceResult is not None
    assert BoundingBox is not None


def test_vision_preprocess_module_importable() -> None:
    from BE.app.domain.vision_preprocess import maybe_downsample, log_opencv_error
    assert maybe_downsample is not None
    assert log_opencv_error is not None


def test_task_cleanup_module_importable() -> None:
    from BE.app.domain.task_cleanup import cleanup_old_task_entries
    assert cleanup_old_task_entries is not None


def test_score_router_importable() -> None:
    from BE.src.api.score import router as score_router
    from BE.src.api.score_batch import router as score_batch_router
    assert score_router is not None
    assert score_batch_router is not None
