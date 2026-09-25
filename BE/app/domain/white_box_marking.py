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
    gray = _to_two_bit_gray(rgba)
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


def _to_two_bit_gray(rgba: bytes) -> bytearray:
    out = bytearray(len(rgba) // 4)
    for idx in range(0, len(rgba), 4):
        lum = int(0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2])
        out[idx // 4] = _quantize(lum)
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
            component = _walk_component(gray, seen, width, height, index, threshold, region)
            if component.area >= min_area and _looks_like_marking(component, region):
                boxes.append(_numbered_box(len(boxes) + 1, component))
    boxes.sort(key=lambda box: (box.y, box.x))
    return [_renumber(i + 1, box) for i, box in enumerate(boxes)]


def _auto_threshold(gray: bytearray, width: int, region: SearchRegion) -> int:
    counts = {0: 0, 85: 0, 170: 0, 255: 0}
    for y in range(region.y, region.y + region.height):
        start = y * width + region.x
        end = start + region.width
        for value in gray[start:end]:
            counts[value] += 1
    background = max(counts, key=lambda level: counts[level])
    for level in (85, 170, 255):
        if level > background and counts[level] > 0:
            return level
    return 256


def _auto_min_area(region: SearchRegion) -> int:
    return max(2, round(region.width * region.height * 0.00008))


@dataclass(frozen=True)
class _Component:
    x0: int
    y0: int
    x1: int
    y1: int
    area: int


def _looks_like_marking(component: _Component, region: SearchRegion) -> bool:
    if component.x1 <= component.x0 or component.y1 <= component.y0:
        return False
    component_width = component.x1 - component.x0 + 1
    component_height = component.y1 - component.y0 + 1
    return component_width < region.width * 0.85 and component_height < region.height * 0.85


def _clamp_region(width: int, height: int, region: SearchRegion | None) -> SearchRegion:
    if region is None:
        return SearchRegion(x=0, y=0, width=width, height=height)
    x = max(0, min(width, region.x))
    y = max(0, min(height, region.y))
    x2 = max(0, min(width, region.x + region.width))
    y2 = max(0, min(height, region.y + region.height))
    return SearchRegion(x=x, y=y, width=max(0, x2 - x), height=max(0, y2 - y))


def _walk_component(
    gray: bytearray,
    seen: bytearray,
    width: int,
    height: int,
    start: int,
    threshold: int,
    region: SearchRegion,
) -> _Component:
    stack = [start]
    seen[start] = 1
    x0 = x1 = start % width
    y0 = y1 = start // width
    area = 0
    while stack:
        current = stack.pop()
        area += 1
        x = current % width
        y = current // width
        x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
        _push_neighbors(gray, seen, stack, width, height, current, threshold, region)
    return _Component(x0=x0, y0=y0, x1=x1, y1=y1, area=area)


def _push_neighbors(
    gray: bytearray,
    seen: bytearray,
    stack: list[int],
    width: int,
    height: int,
    current: int,
    threshold: int,
    region: SearchRegion,
) -> None:
    x = current % width
    y = current // width
    for nx in range(x - 1, x + 2):
        for ny in range(y - 1, y + 2):
            if nx == x and ny == y:
                continue
            if (
                nx < region.x
                or ny < region.y
                or nx >= region.x + region.width
                or ny >= region.y + region.height
                or nx >= width
                or ny >= height
            ):
                continue
            ni = ny * width + nx
            if seen[ni] == 0 and gray[ni] >= threshold:
                seen[ni] = 1
                stack.append(ni)


def _numbered_box(number: int, component: _Component) -> MarkedBox:
    return MarkedBox(
        number=number,
        x=component.x0,
        y=component.y0,
        width=component.x1 - component.x0 + 1,
        height=component.y1 - component.y0 + 1,
        area=component.area,
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

