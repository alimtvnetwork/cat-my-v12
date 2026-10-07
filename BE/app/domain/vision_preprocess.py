"""Image preprocessing utilities for the vision evaluation pipeline.

Provides:
- Downsampling for large images before matchTemplate (Task 222)
- Structured JSON logging for OpenCV failures (Task 225)
- Optical acquisition simulation: exposure, analog gain, gamma, white balance,
  and light channel intensity / strobe pulse duration.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any

try:
    import cv2
except ImportError:
    cv2 = None

import numpy as np

logger = logging.getLogger(__name__)

# Baseline optical values matching default hardware calibration
DEFAULT_EXPOSURE_US = 20_000
DEFAULT_GAIN_DB = 0.0
DEFAULT_WHITE_BALANCE_KELVIN = 5000
DEFAULT_GAMMA = 1.0
DEFAULT_INTENSITY = 100.0
DEFAULT_STROBE_DURATION_US = 500

# Images larger than this pixel count will be downsampled before evaluation
MAX_PIXELS_BEFORE_DOWNSAMPLE = 4_000 * 3_000  # ~12 MP


def _to_dict_settings(settings: Any) -> dict[str, Any]:
    """Convert dataclass or dictionary settings object into a plain dict."""
    if settings is None:
        return {}

    if hasattr(settings, "__dataclass_fields__"):
        return asdict(settings)

    if isinstance(settings, dict):
        return settings

    return {}


def _calc_optical_luminance_multiplier(
    cam: dict[str, Any],
    light: dict[str, Any],
) -> float:
    """Compute overall exposure/gain/light multiplier against baseline."""
    exp_us = float(cam.get("ExposureUs", cam.get("exposureUs", DEFAULT_EXPOSURE_US)))
    gain_db = float(cam.get("GainDb", cam.get("gainDb", DEFAULT_GAIN_DB)))
    intensity = float(light.get("Intensity", light.get("intensity", DEFAULT_INTENSITY)))
    has_strobe = bool(light.get("HasStrobe", light.get("hasStrobe", False)))
    strobe_us = float(light.get("StrobeDurationUs", light.get("strobeDurationUs", DEFAULT_STROBE_DURATION_US)))

    exp_factor = max(0.01, exp_us / DEFAULT_EXPOSURE_US)
    gain_factor = 10.0 ** (gain_db / 20.0)
    light_factor = max(0.0, intensity / DEFAULT_INTENSITY)
    strobe_factor = max(0.2, min(3.0, (strobe_us / DEFAULT_STROBE_DURATION_US) * 1.5)) if has_strobe else 1.0

    return max(0.0, min(10.0, exp_factor * gain_factor * light_factor * strobe_factor))


def _apply_luminance_scale(image: np.ndarray, alpha: float) -> np.ndarray:
    """Scale pixel luminance using cv2 or numpy fallback."""
    if abs(alpha - 1.0) <= 1e-3:
        return image

    if cv2 is not None:
        return cv2.convertScaleAbs(image, alpha=alpha)

    return np.clip(image.astype(np.float32) * alpha, 0, 255).astype(np.uint8)


def _apply_gamma(image: np.ndarray, gamma: float) -> np.ndarray:
    """Apply power-law gamma correction curve using lookup table."""
    if gamma <= 0.0 or abs(gamma - 1.0) < 1e-3:
        return image

    inv_gamma = 1.0 / gamma
    lut = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)], dtype=np.uint8)

    if cv2 is not None:
        return cv2.LUT(image, lut)

    return lut[image]


def _apply_white_balance(image: np.ndarray, kelvin: int) -> np.ndarray:
    """Shift B/R channel balance based on correlated color temperature in Kelvin."""
    if kelvin <= 0 or kelvin == DEFAULT_WHITE_BALANCE_KELVIN or len(image.shape) < 3 or image.shape[2] < 3:
        return image

    ratio = kelvin / float(DEFAULT_WHITE_BALANCE_KELVIN)
    b_scale = min(2.0, max(0.5, ratio))
    r_scale = min(2.0, max(0.5, 1.0 / ratio))

    adjusted = image.astype(np.float32)
    adjusted[:, :, 0] = np.clip(adjusted[:, :, 0] * b_scale, 0, 255)
    adjusted[:, :, 2] = np.clip(adjusted[:, :, 2] * r_scale, 0, 255)

    return adjusted.astype(np.uint8)


def apply_optical_settings(
    image: np.ndarray,
    camera_settings: Any = None,
    light_settings: Any = None,
) -> np.ndarray:
    """Apply rule camera and lighting acquisition parameters to image."""
    if image is None or (not camera_settings and not light_settings):
        return image

    cam_dict = _to_dict_settings(camera_settings)
    light_dict = _to_dict_settings(light_settings)
    alpha = _calc_optical_luminance_multiplier(cam_dict, light_dict)
    res = _apply_luminance_scale(image, alpha)

    gamma = float(cam_dict.get("Gamma", cam_dict.get("gamma", DEFAULT_GAMMA)))
    res = _apply_gamma(res, gamma)
    wb = cam_dict.get("WhiteBalanceKelvin", cam_dict.get("whiteBalanceKelvin"))

    if wb is not None:
        res = _apply_white_balance(res, int(wb))

    return res


def maybe_downsample(
    image: np.ndarray,
    max_pixels: int = MAX_PIXELS_BEFORE_DOWNSAMPLE,
) -> np.ndarray:
    """Downsample image if it exceeds `max_pixels` to speed up evaluation."""
    if image is None:
        return image

    h, w = image.shape[:2]
    total = h * w

    if total <= max_pixels:
        return image

    scale = (max_pixels / total) ** 0.5
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    if cv2 is not None:
        downsampled = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        downsampled = image[:: int(1 / scale) or 1, :: int(1 / scale) or 1]

    logger.info(
        "vision_downsample",
        extra={
            "original_wh": (w, h),
            "downsampled_wh": (new_w, new_h),
            "scale": round(scale, 3),
        },
    )

    return downsampled


def log_opencv_error(
    exc: Exception,
    operation: str,
    image_shape: tuple | None = None,
    rule_type: str | None = None,
) -> None:
    """Structured JSON logging for OpenCV / algorithm errors (Task 225)."""
    logger.error(
        "vision_opencv_error",
        extra={
            "operation": operation,
            "error": repr(exc),
            "image_shape": image_shape,
            "rule_type": rule_type,
        },
    )
