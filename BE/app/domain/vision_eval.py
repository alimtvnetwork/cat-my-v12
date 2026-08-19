"""Vision evaluation algorithms for the score endpoint.

Implements:
- Grayscale conversion
- Safe-zone (ROI) clipping
- Pattern matching via normalized cross-correlation
- Shape tracking via contour detection
- Color area thresholding

Each algorithm returns a ConfidenceResult with a 0-100 score.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BoundingBox:
    x: int
    y: int
    width: int
    height: int


@dataclass
class ConfidenceResult:
    score: float  # 0.0 - 100.0
    is_pass: bool
    label: str


def _clip_to_roi(image: np.ndarray, roi: BoundingBox | None) -> np.ndarray:
    """Clip image to ROI bounding box. Returns full image if no ROI."""
    if roi is None:
        return image
    y1 = roi.y
    y2 = roi.y + roi.height
    x1 = roi.x
    x2 = roi.x + roi.width
    return image[y1:y2, x1:x2]


def _to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert BGR/RGB image to grayscale."""
    import cv2  # type: ignore
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def _match_pattern(
    reference: np.ndarray,
    template: np.ndarray,
    threshold: float = 0.5,
) -> ConfidenceResult:
    """Run normalized cross-correlation template matching."""
    import cv2

    ref_gray = _to_grayscale(reference)
    tmpl_gray = _to_grayscale(template)

    if tmpl_gray.shape[0] > ref_gray.shape[0] or tmpl_gray.shape[1] > ref_gray.shape[1]:
        return ConfidenceResult(score=0.0, is_pass=False, label="template_too_large")

    result = cv2.matchTemplate(ref_gray, tmpl_gray, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, _ = cv2.minMaxLoc(result)
    score = float(max_val) * 100.0
    return ConfidenceResult(
        score=score,
        is_pass=score >= threshold * 100.0,
        label="pattern_match",
    )


def _track_shapes(
    image: np.ndarray,
    threshold: float = 0.5,
) -> ConfidenceResult:
    """Detect contours and return a confidence based on contour presence."""
    import cv2

    gray = _to_grayscale(image)
    _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    count = len(contours)
    score = min(100.0, float(count) * 10.0)
    return ConfidenceResult(
        score=score,
        is_pass=score >= threshold * 100.0,
        label="shape_track",
    )


def _check_color_area(
    image: np.ndarray,
    lower_hsv: tuple,
    upper_hsv: tuple,
    threshold: float = 0.1,
) -> ConfidenceResult:
    """Check if a color area occupies >= threshold fraction of the image."""
    import cv2
    import numpy as np

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array(lower_hsv), np.array(upper_hsv))
    fraction = float(np.count_nonzero(mask)) / float(mask.size)
    score = min(100.0, fraction * 100.0 / threshold)
    return ConfidenceResult(
        score=score,
        is_pass=fraction >= threshold,
        label="color_area",
    )


async def evaluate_pattern_match(
    reference_bytes: bytes,
    template_bytes: bytes,
    roi: BoundingBox | None,
    threshold: float,
) -> ConfidenceResult:
    """Async wrapper: runs CV in thread pool to avoid blocking event loop."""
    import cv2
    import numpy as np

    def _run() -> ConfidenceResult:
        ref_arr = np.frombuffer(reference_bytes, dtype=np.uint8)
        ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)
        tmpl_arr = np.frombuffer(template_bytes, dtype=np.uint8)
        tmpl_img = cv2.imdecode(tmpl_arr, cv2.IMREAD_COLOR)

        if ref_img is None or tmpl_img is None:
            return ConfidenceResult(score=0.0, is_pass=False, label="decode_error")

        clipped = _clip_to_roi(ref_img, roi)
        return _match_pattern(clipped, tmpl_img, threshold)

    return await asyncio.to_thread(_run)


async def evaluate_grayscale_tolerance(
    reference_bytes: bytes,
    sample_bytes: bytes,
    roi: BoundingBox | None,
    tolerance: int,
    threshold: float,
) -> ConfidenceResult:
    """Compare grayscale histograms with tolerance."""
    import cv2
    import numpy as np

    def _run() -> ConfidenceResult:
        ref_arr = np.frombuffer(reference_bytes, dtype=np.uint8)
        ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_GRAYSCALE)
        smp_arr = np.frombuffer(sample_bytes, dtype=np.uint8)
        smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_GRAYSCALE)

        if ref_img is None or smp_img is None:
            return ConfidenceResult(score=0.0, is_pass=False, label="decode_error")

        ref_clipped = _clip_to_roi(ref_img, roi)
        smp_clipped = _clip_to_roi(smp_img, roi)

        diff = np.abs(ref_clipped.astype(np.float32) - smp_clipped.astype(np.float32))
        mean_diff = float(np.mean(diff))
        score = max(0.0, 100.0 - (mean_diff / tolerance * 100.0)) if tolerance > 0 else 100.0
        return ConfidenceResult(
            score=score,
            is_pass=score >= threshold * 100.0,
            label="grayscale_tolerance",
        )

    return await asyncio.to_thread(_run)
