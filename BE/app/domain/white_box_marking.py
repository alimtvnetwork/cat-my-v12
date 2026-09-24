"""2-bit grayscale conversion and white-region box marking."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Final

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

MIN_PIXEL_INTENSITY: Final[int] = 0
MAX_PIXEL_INTENSITY: Final[int] = 255
WHITE_PIXEL_VALUE: Final[int] = 255
BYTES_PER_RGBA_PIXEL: Final[int] = 4

RED_COLOR_RGBA: Final[tuple[int, int, int, int]] = (255, 0, 0, 255)
WHITE_COLOR_RGBA: Final[tuple[int, int, int, int]] = (255, 255, 255, 255)
BLACK_COLOR_RGBA: Final[tuple[int, int, int, int]] = (0, 0, 0, 255)


@dataclass(frozen=True)
class SearchRegion:
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class MarkingOptions:
    white_threshold: int | None = None
    min_area_px: int | None = None
    search_region: SearchRegion | None = None


@dataclass(frozen=True)
class MarkedBox:
    number: int
    x: int
    y: int
    width: int
    height: int
    area: int


@dataclass(frozen=True)
class MarkingResult:
    width: int
    height: int
    rgba_base64: str
    boxes: tuple[MarkedBox, ...]


_DIGITS: dict[str, tuple[str, ...]] = {
    "0": ("111", "101", "101", "101", "111"),
    "1": ("010", "110", "010", "010", "111"),
    "2": ("111", "001", "111", "100", "111"),
    "3": ("111", "001", "111", "001", "111"),
    "4": ("101", "101", "111", "001", "001"),
    "5": ("111", "100", "111", "001", "111"),
    "6": ("111", "100", "111", "101", "111"),
    "7": ("111", "001", "010", "010", "010"),
    "8": ("111", "101", "111", "101", "111"),
    "9": ("111", "101", "111", "001", "111"),
}


def mark_white_boxes(
    *,
    width: int,
    height: int,
    rgba_base64: str,
    options: MarkingOptions | None = None,
) -> MarkingResult:
    opts = options or MarkingOptions()
    rgba = _decode_rgba(width, height, rgba_base64)
    gray = _to_continuous_gray(rgba) if opts.white_threshold is not None else _to_two_bit_gray(rgba)
    boxes = _find_white_boxes(gray, width, height, opts)
    preview = _threshold_preview(gray, opts.white_threshold) if opts.white_threshold is not None else gray
    marked = bytearray(_gray_to_rgba(preview))
    _draw_boxes(marked, width, height, boxes)
    encoded = base64.b64encode(bytes(marked)).decode("ascii")
    return MarkingResult(width=width, height=height, rgba_base64=encoded, boxes=tuple(boxes))


def _decode_rgba(width: int, height: int, rgba_base64: str) -> bytes:
    if width <= 0 or height <= 0:
        _bad("width and height must be positive", {"Width": width, "Height": height})
    try:
        raw = base64.b64decode(rgba_base64, validate=True)
    except ValueError as exc:
        _bad("RgbaBase64 must be valid base64", {"Cause": str(exc)})
    expected = width * height * 4
    if len(raw) != expected:
        _bad("RgbaBase64 length does not match dimensions", {"Expected": expected, "Actual": len(raw)})
    return raw


def _bad(message: str, details: dict[str, object]) -> None:
    raise AppError(ErrorCode.E_BE_BAD_REQUEST, message, details)


def _to_continuous_gray(rgba: bytes) -> bytearray:
    out = bytearray(len(rgba) // BYTES_PER_RGBA_PIXEL)
    for idx in range(0, len(rgba), BYTES_PER_RGBA_PIXEL):
        lum = int(round(0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2]))
        out[idx // BYTES_PER_RGBA_PIXEL] = max(MIN_PIXEL_INTENSITY, min(MAX_PIXEL_INTENSITY, lum))
    return out


def _to_two_bit_gray(rgba: bytes) -> bytearray:
    out = bytearray(len(rgba) // BYTES_PER_RGBA_PIXEL)
    for idx in range(0, len(rgba), BYTES_PER_RGBA_PIXEL):
        lum = int(0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2])
        out[idx // BYTES_PER_RGBA_PIXEL] = _quantize(lum)
    return out


def _quantize(value: int) -> int:
    if value < 64:
        return 0
    if value < 128:
        return 85
    if value < 192:
        return 170
    return 255


def clamp_pixel_intensity(raw_threshold: float | int) -> int:
    """Safely rounds and clamps an arbitrary threshold into valid 8-bit range [0, 255]."""
    rounded_threshold = round(raw_threshold)
    return max(
        MIN_PIXEL_INTENSITY,
        min(MAX_PIXEL_INTENSITY, rounded_threshold),
    )


def build_threshold_lookup_table(clamped_threshold: int) -> bytes:
    """Precompute 256-byte lookup table (LUT) eliminating per-pixel branching."""
    return bytes(
        WHITE_PIXEL_VALUE if value >= clamped_threshold else value
        for value in range(MAX_PIXEL_INTENSITY + 1)
    )


def _threshold_preview(
    gray: bytearray | bytes,
    white_threshold: float | int,
) -> bytearray:
    """Highlight pixels at or above `white_threshold` by setting them to pure white."""
    clamped_threshold = clamp_pixel_intensity(white_threshold)
    lookup_table = build_threshold_lookup_table(clamped_threshold)
    return bytearray(gray.translate(lookup_table))


# Public alias adhering to Prompt 26
threshold_preview = _threshold_preview


def _find_white_boxes(
    gray: bytearray,
    width: int,
    height: int,
    options: MarkingOptions,
) -> list[MarkedBox]:
    seen = bytearray(width * height)
    boxes: list[MarkedBox] = []
    region = _clamp_region(width, height, options.search_region)
    if region.width <= 0 or region.height <= 0:
        return []
    threshold = options.white_threshold if options.white_threshold is not None else _auto_threshold(gray, width, region)
    min_area = options.min_area_px if options.min_area_px is not None else _auto_min_area(region)
    for y in range(region.y, region.y + region.height):
        for x in range(region.x, region.x + region.width):
            index = y * width + x
            value = gray[index]
            if value < threshold or seen[index] == 1:
                continue
            box = _flood_fill(gray, seen, width, height, x, y, threshold, region)
            if box.area >= min_area:
                boxes.append(box)
    boxes.sort(key=lambda b: (b.y, b.x))
    return [_renumber(idx + 1, box) for idx, box in enumerate(boxes)]


def _clamp_region(width: int, height: int, region: SearchRegion | None) -> SearchRegion:
    if region is None:
        return SearchRegion(0, 0, width, height)
    x = max(0, min(width, region.x))
    y = max(0, min(height, region.y))
    w = max(0, min(width - x, region.width))
    h = max(0, min(height - y, region.height))
    return SearchRegion(x, y, w, h)


def _auto_threshold(gray: bytearray, width: int, region: SearchRegion) -> int:
    values: list[int] = []
    for y in range(region.y, region.y + region.height):
        row_start = y * width + region.x
        values.extend(gray[row_start : row_start + region.width])
    if not values:
        return 170
    values.sort()
    p90_idx = int(len(values) * 0.9)
    p90 = values[min(p90_idx, len(values) - 1)]
    return max(128, min(250, p90))


def _auto_min_area(region: SearchRegion) -> int:
    region_area = region.width * region.height
    return max(16, int(region_area * 0.0005))


def _flood_fill(
    gray: bytearray,
    seen: bytearray,
    width: int,
    height: int,
    start_x: int,
    start_y: int,
    threshold: int,
    region: SearchRegion,
) -> MarkedBox:
    queue = [(start_x, start_y)]
    seen[start_y * width + start_x] = 1
    min_x, max_x = start_x, start_x
    min_y, max_y = start_y, start_y
    area = 0
    rx2 = region.x + region.width
    ry2 = region.y + region.height

    while queue:
        cx, cy = queue.pop()
        area += 1
        if cx < min_x:
            min_x = cx
        if cx > max_x:
            max_x = cx
        if cy < min_y:
            min_y = cy
        if cy > max_y:
            max_y = cy

        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if nx < region.x or ny < region.y or nx >= rx2 or ny >= ry2:
                continue
            idx = ny * width + nx
            if seen[idx] == 0 and gray[idx] >= threshold:
                seen[idx] = 1
                queue.append((nx, ny))

    return MarkedBox(
        number=0,
        x=min_x,
        y=min_y,
        width=max_x - min_x + 1,
        height=max_y - min_y + 1,
        area=area,
    )


def _renumber(number: int, box: MarkedBox) -> MarkedBox:
    return MarkedBox(number=number, x=box.x, y=box.y, width=box.width, height=box.height, area=box.area)


def _gray_to_rgba(gray: bytearray) -> bytes:
    out = bytearray(len(gray) * BYTES_PER_RGBA_PIXEL)
    for idx, value in enumerate(gray):
        pos = idx * BYTES_PER_RGBA_PIXEL
        out[pos : pos + BYTES_PER_RGBA_PIXEL] = bytes((value, value, value, WHITE_PIXEL_VALUE))
    return bytes(out)


def _draw_boxes(rgba: bytearray, width: int, height: int, boxes: list[MarkedBox]) -> None:
    for box in boxes:
        _draw_rect(rgba, width, height, box)
        _draw_label(rgba, width, height, box)


def _draw_rect(rgba: bytearray, width: int, height: int, box: MarkedBox) -> None:
    x2 = box.x + box.width - 1
    y2 = box.y + box.height - 1
    for x in range(box.x, x2 + 1):
        _set_pixel(rgba, width, height, x, box.y, RED_COLOR_RGBA)
        _set_pixel(rgba, width, height, x, y2, RED_COLOR_RGBA)
    for y in range(box.y, y2 + 1):
        _set_pixel(rgba, width, height, box.x, y, RED_COLOR_RGBA)
        _set_pixel(rgba, width, height, x2, y, RED_COLOR_RGBA)


def _draw_label(rgba: bytearray, width: int, height: int, box: MarkedBox) -> None:
    text = str(box.number)
    _fill_rect(rgba, width, height, box.x, box.y, len(text) * 4 + 2, 7, WHITE_COLOR_RGBA)
    for offset, digit in enumerate(text):
        _draw_digit(rgba, width, height, box.x + 1 + offset * 4, box.y + 1, digit)


def _draw_digit(rgba: bytearray, width: int, height: int, x: int, y: int, digit: str) -> None:
    for row, bits in enumerate(_DIGITS.get(digit, ())):
        for col, bit in enumerate(bits):
            if bit == "1":
                _set_pixel(rgba, width, height, x + col, y + row, BLACK_COLOR_RGBA)


def _fill_rect(
    rgba: bytearray,
    width: int,
    height: int,
    x: int,
    y: int,
    w: int,
    h: int,
    color: tuple[int, int, int, int],
) -> None:
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            _set_pixel(rgba, width, height, xx, yy, color)


def _set_pixel(
    rgba: bytearray,
    width: int,
    height: int,
    x: int,
    y: int,
    color: tuple[int, int, int, int],
) -> None:
    if x < 0 or y < 0 or x >= width or y >= height:
        return
    pos = (y * width + x) * BYTES_PER_RGBA_PIXEL
    rgba[pos : pos + BYTES_PER_RGBA_PIXEL] = bytes(color)
