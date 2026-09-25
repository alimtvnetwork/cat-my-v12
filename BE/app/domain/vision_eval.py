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
    verdict: str = "PASS"
    reason: str = ""
    trace: dict | None = None


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
    if len(image.shape) == 2:
        return image
    try:
        import cv2  # type: ignore
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    except ImportError:
        import numpy as np
        if image.shape[2] >= 3:
            return (0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2]).astype(np.uint8)
        return image[:, :, 0]


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
    is_pass = score >= threshold * 100.0
    verdict = "PASS" if is_pass else "FAIL"
    reason = (
        f"Pattern correlation {score:.1f}% meets threshold {threshold * 100.0:.0f}%"
        if is_pass
        else f"Pattern correlation {score:.1f}% is below threshold {threshold * 100.0:.0f}%"
    )
    trace = {
        "metric": "ncc_correlation",
        "measured": round(score, 2),
        "threshold_pct": round(threshold * 100.0, 1),
        "decision": verdict,
    }
    return ConfidenceResult(
        score=score,
        is_pass=is_pass,
        label="pattern_match",
        verdict=verdict,
        reason=reason,
        trace=trace,
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
    is_pass = score >= threshold * 100.0
    verdict = "PASS" if is_pass else "FAIL"
    reason = (
        f"Detected {count} shape contours (score {score:.1f}% meets threshold {threshold * 100.0:.0f}%)"
        if is_pass
        else f"Insufficient contours: found {count} (score {score:.1f}% below threshold {threshold * 100.0:.0f}%)"
    )
    trace = {
        "metric": "contour_count",
        "measured": count,
        "score_pct": round(score, 1),
        "threshold_pct": round(threshold * 100.0, 1),
        "decision": verdict,
    }
    return ConfidenceResult(
        score=score,
        is_pass=is_pass,
        label="shape_track",
        verdict=verdict,
        reason=reason,
        trace=trace,
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
    score = min(100.0, fraction * 100.0 / max(0.001, threshold))
    is_pass = fraction >= threshold
    verdict = "PASS" if is_pass else "FAIL"
    reason = (
        f"Active area fraction {fraction * 100.0:.1f}% meets threshold {threshold * 100.0:.1f}%"
        if is_pass
        else f"Active area fraction {fraction * 100.0:.1f}% below threshold {threshold * 100.0:.1f}%"
    )
    trace = {
        "metric": "color_area_fraction",
        "measured": round(fraction, 4),
        "threshold": round(threshold, 4),
        "decision": verdict,
    }
    return ConfidenceResult(
        score=score,
        is_pass=is_pass,
        label="color_area",
        verdict=verdict,
        reason=reason,
        trace=trace,
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
    import numpy as np

    def _run() -> ConfidenceResult:
        try:
            import cv2
            ref_arr = np.frombuffer(reference_bytes, dtype=np.uint8)
            ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_GRAYSCALE)
            smp_arr = np.frombuffer(sample_bytes, dtype=np.uint8)
            smp_img = cv2.imdecode(smp_arr, cv2.IMREAD_GRAYSCALE)
        except ImportError:
            ref_arr = np.frombuffer(reference_bytes, dtype=np.uint8)
            smp_arr = np.frombuffer(sample_bytes, dtype=np.uint8)
            ref_img = ref_arr
            smp_img = smp_arr

        if ref_img is None or smp_img is None:
            return ConfidenceResult(score=0.0, is_pass=False, label="decode_error")

        if roi is not None and hasattr(ref_img, "ndim") and ref_img.ndim >= 2:
            ref_clipped = _clip_to_roi(ref_img, roi)
            smp_clipped = _clip_to_roi(smp_img, roi)
        else:
            ref_clipped = ref_img
            smp_clipped = smp_img

        if hasattr(ref_clipped, "shape") and hasattr(smp_clipped, "shape"):
            import cv2
            ref_ar = ref_clipped.shape[1] / max(1, ref_clipped.shape[0])
            smp_ar = smp_clipped.shape[1] / max(1, smp_clipped.shape[0])
            k_pockets = max(1, round(smp_ar / max(0.01, ref_ar)))

            if k_pockets > 1:
                # Multi-pocket tape strip: evaluate best matching pocket in strip
                pocket_w = smp_clipped.shape[1] // k_pockets
                best_diff = 999.0
                for p_idx in range(k_pockets):
                    slice_img = smp_clipped[:, p_idx * pocket_w : (p_idx + 1) * pocket_w]
                    slice_resized = cv2.resize(slice_img, (ref_clipped.shape[1], ref_clipped.shape[0]))
                    try:
                        (dx, dy), _ = cv2.phaseCorrelate(ref_clipped.astype(np.float32), slice_resized.astype(np.float32))
                        if abs(dx) < 25 and abs(dy) < 25:
                            M = np.float32([[1, 0, -dx], [0, 1, -dy]])
                            slice_aligned = cv2.warpAffine(slice_resized, M, (ref_clipped.shape[1], ref_clipped.shape[0]))
                            my, mx = int(ref_clipped.shape[0] * 0.08), int(ref_clipped.shape[1] * 0.08)
                            d = float(np.mean(np.abs(ref_clipped[my:-my, mx:-mx].astype(np.float32) - slice_aligned[my:-my, mx:-mx].astype(np.float32))))
                        else:
                            d = float(np.mean(np.abs(ref_clipped.astype(np.float32) - slice_resized.astype(np.float32))))
                    except Exception:
                        d = float(np.mean(np.abs(ref_clipped.astype(np.float32) - slice_resized.astype(np.float32))))
                    if d < best_diff:
                        best_diff = d
                mean_diff = best_diff
            else:
                if ref_clipped.shape != smp_clipped.shape:
                    try:
                        smp_clipped = cv2.resize(smp_clipped, (ref_clipped.shape[1], ref_clipped.shape[0]))
                    except Exception:
                        pass
                # Optional phase correlation alignment for small conveyor shifts
                try:
                    (dx, dy), _ = cv2.phaseCorrelate(ref_clipped.astype(np.float32), smp_clipped.astype(np.float32))
                    if 0 < abs(dx) < 20 and 0 < abs(dy) < 20:
                        M = np.float32([[1, 0, -dx], [0, 1, -dy]])
                        smp_aligned = cv2.warpAffine(smp_clipped, M, (ref_clipped.shape[1], ref_clipped.shape[0]))
                        my, mx = int(ref_clipped.shape[0] * 0.08), int(ref_clipped.shape[1] * 0.08)
                        mean_diff = float(np.mean(np.abs(ref_clipped[my:-my, mx:-mx].astype(np.float32) - smp_aligned[my:-my, mx:-mx].astype(np.float32))))
                    else:
                        diff = np.abs(ref_clipped.astype(np.float32) - smp_clipped.astype(np.float32))
                        mean_diff = float(np.mean(diff))
                except Exception:
                    diff = np.abs(ref_clipped.astype(np.float32) - smp_clipped.astype(np.float32))
                    mean_diff = float(np.mean(diff))
        else:
            mean_diff = 0.0

        effective_tol = tolerance if tolerance > 0 else 40
        score = max(0.0, min(100.0, 100.0 - (mean_diff / effective_tol * 100.0)))
        is_pass = score >= threshold * 100.0
        verdict = "PASS" if is_pass else "FAIL"
        if is_pass:
            reason = f"Mean grayscale deviation {mean_diff:.1f} within tolerance {effective_tol} (match {score:.1f}% >= {threshold * 100.0:.0f}%)"
        else:
            reason = f"Mean grayscale deviation {mean_diff:.1f} exceeds tolerance {effective_tol} (match {score:.1f}% < {threshold * 100.0:.0f}%)"

        trace = {
            "metric": "mean_grayscale_diff",
            "measured": round(mean_diff, 2),
            "tolerance": effective_tol,
            "threshold_pct": round(threshold * 100.0, 1),
            "score_pct": round(score, 1),
            "pockets_detected": k_pockets if "k_pockets" in locals() else 1,
            "decision": verdict,
        }
        return ConfidenceResult(
            score=score,
            is_pass=is_pass,
            label="grayscale_tolerance",
            verdict=verdict,
            reason=reason,
            trace=trace,
        )

    return await asyncio.to_thread(_run)


def _measure_blob_area(
    image: np.ndarray,
    min_area_px: int = 100,
    max_area_px: int = 500000,
    calibration_factor: float = 0.05,
    unit: str = "mm",
) -> ConfidenceResult:
    """Measure blob areas inside image/ROI (Day 5/6 measurement kernel)."""
    import cv2
    import numpy as np

    gray = _to_grayscale(image)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    valid_areas = []
    for c in contours:
        area_px = cv2.contourArea(c)
        if area_px >= min_area_px and area_px <= max_area_px:
            valid_areas.append(area_px)

    total_blobs = len(valid_areas)
    primary_area_px = max(valid_areas) if valid_areas else 0.0
    primary_area_calibrated = round(primary_area_px * (calibration_factor ** 2), 4)

    is_pass = total_blobs > 0
    score = 95.0 if is_pass else 0.0
    verdict = "PASS" if is_pass else "FAIL"
    reason = (
        f"Blob detected: area {primary_area_px:.0f} px ({primary_area_calibrated} {unit}²)"
        if is_pass
        else "No valid blobs detected within area thresholds"
    )
    trace = {
        "metric": "blob_area",
        "blob_count": total_blobs,
        "measured_px": primary_area_px,
        "measured_calibrated": primary_area_calibrated,
        "unit": f"{unit}²",
        "calibration_factor": calibration_factor,
        "decision": verdict,
    }
    return ConfidenceResult(
        score=score,
        is_pass=is_pass,
        label="blob_area",
        verdict=verdict,
        reason=reason,
        trace=trace,
    )


def _measure_edge_width(
    image: np.ndarray,
    expected_width_px: float = 240.0,
    tolerance_px: float = 30.0,
    calibration_factor: float = 0.05,
    unit: str = "mm",
) -> ConfidenceResult:
    """Measure feature width across horizontal profile (Day 5/6 measurement kernel)."""
    import cv2
    import numpy as np

    gray = _to_grayscale(image)
    edges = cv2.Canny(gray, 50, 150)
    col_sums = np.sum(edges > 0, axis=0)
    indices = np.where(col_sums > 0)[0]

    if len(indices) >= 2:
        width_px = float(indices[-1] - indices[0])
    else:
        width_px = float(image.shape[1])

    delta_px = abs(width_px - expected_width_px)
    is_pass = delta_px <= tolerance_px
    calibrated_width = round(width_px * calibration_factor, 3)
    expected_calibrated = round(expected_width_px * calibration_factor, 3)
    tolerance_calibrated = round(tolerance_px * calibration_factor, 3)

    score = max(0.0, min(100.0, 100.0 - (delta_px / max(1.0, tolerance_px) * 50.0)))
    verdict = "PASS" if is_pass else "FAIL"
    reason = (
        f"Width {calibrated_width} {unit} ({width_px:.0f} px) within ±{tolerance_calibrated} {unit} of nominal {expected_calibrated} {unit}"
        if is_pass
        else f"Width {calibrated_width} {unit} ({width_px:.0f} px) deviates by {delta_px:.1f} px from nominal {expected_calibrated} {unit}"
    )
    trace = {
        "metric": "edge_width",
        "measured_px": width_px,
        "measured_calibrated": calibrated_width,
        "expected_calibrated": expected_calibrated,
        "tolerance_calibrated": tolerance_calibrated,
        "unit": unit,
        "calibration_factor": calibration_factor,
        "decision": verdict,
    }
    return ConfidenceResult(
        score=score,
        is_pass=is_pass,
        label="edge_width",
        verdict=verdict,
        reason=reason,
        trace=trace,
    )

