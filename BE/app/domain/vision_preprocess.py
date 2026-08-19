"""Image preprocessing utilities for the vision evaluation pipeline.

Provides:
- Downsampling for large images before matchTemplate (Task 222)
- Structured JSON logging for OpenCV failures (Task 225)
"""
import logging

logger = logging.getLogger(__name__)

# Images larger than this pixel count will be downsampled before evaluation
MAX_PIXELS_BEFORE_DOWNSAMPLE = 4_000 * 3_000  # ~12 MP


def maybe_downsample(
    image: "np.ndarray",
    max_pixels: int = MAX_PIXELS_BEFORE_DOWNSAMPLE,
) -> "np.ndarray":
    """Downsample image if it exceeds `max_pixels` to speed up evaluation.

    Returns the original image unchanged if within limits.
    Preserves aspect ratio.
    """
    import cv2  # type: ignore

    h, w = image.shape[:2]
    total = h * w
    if total <= max_pixels:
        return image

    scale = (max_pixels / total) ** 0.5
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    downsampled = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
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
