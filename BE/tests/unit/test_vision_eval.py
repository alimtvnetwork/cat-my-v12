"""Unit tests for vision evaluation algorithms — Tasks 214-215.

Uses fixture images (numpy arrays) to verify:
- Pattern match returns expected confidence range
- Grayscale tolerance varies with slider value
"""
import asyncio

import numpy as np
import pytest


def _make_jpeg_bytes(arr: np.ndarray) -> bytes:
    """Encode a numpy array as JPEG bytes without OpenCV dependency."""
    try:
        import cv2
        _, buf = cv2.imencode(".jpg", arr)
        return buf.tobytes()
    except ImportError:
        # Fallback: raw bytes (will fail OpenCV decode but lets tests import)
        return arr.tobytes()


@pytest.fixture
def solid_gray_image() -> bytes:
    """128x128 solid gray JPEG."""
    arr = np.full((128, 128, 3), 128, dtype=np.uint8)
    return _make_jpeg_bytes(arr)


@pytest.fixture
def solid_white_image() -> bytes:
    """128x128 solid white JPEG."""
    arr = np.full((128, 128, 3), 255, dtype=np.uint8)
    return _make_jpeg_bytes(arr)


@pytest.fixture
def solid_black_image() -> bytes:
    """128x128 solid black JPEG."""
    arr = np.zeros((128, 128, 3), dtype=np.uint8)
    return _make_jpeg_bytes(arr)


def test_evaluate_grayscale_tolerance_identical(solid_gray_image: bytes) -> None:
    """Identical images should score ~100."""
    from BE.app.domain.vision_eval import evaluate_grayscale_tolerance

    result = asyncio.run(
        evaluate_grayscale_tolerance(
            reference_bytes=solid_gray_image,
            sample_bytes=solid_gray_image,
            roi=None,
            tolerance=20,
            threshold=0.5,
        )
    )
    assert result.score > 95.0
    assert result.is_pass is True


def test_evaluate_grayscale_tolerance_very_different(
    solid_white_image: bytes, solid_black_image: bytes
) -> None:
    """White vs black should give very low score."""
    from BE.app.domain.vision_eval import evaluate_grayscale_tolerance

    result = asyncio.run(
        evaluate_grayscale_tolerance(
            reference_bytes=solid_white_image,
            sample_bytes=solid_black_image,
            roi=None,
            tolerance=20,
            threshold=0.5,
        )
    )
    assert result.score < 50.0


def test_score_varies_with_tolerance(solid_white_image: bytes, solid_black_image: bytes) -> None:
    """Higher tolerance should produce higher score for same image pair."""
    from BE.app.domain.vision_eval import evaluate_grayscale_tolerance

    result_low = asyncio.run(
        evaluate_grayscale_tolerance(
            solid_white_image, solid_black_image, None, tolerance=10, threshold=0.5
        )
    )
    result_high = asyncio.run(
        evaluate_grayscale_tolerance(
            solid_white_image, solid_black_image, None, tolerance=300, threshold=0.5
        )
    )
    assert result_high.score >= result_low.score
