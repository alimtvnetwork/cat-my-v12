"""Pin 1 round-hole detection and reference evaluation."""

from __future__ import annotations

import base64
import math
import time
from dataclasses import dataclass
from typing import Final, Literal

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

BYTES_PER_RGBA_PIXEL: Final[int] = 4
MIN_VISIBLE_ALPHA: Final[int] = 128

HolePolarity = Literal["DarkIndentation", "LightDot"]
Pin1Status = Literal["Passed", "Missing", "Misoriented"]


@dataclass(frozen=True)
class SearchRegion:
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class Pin1Options:
    polarity: HolePolarity = "DarkIndentation"
    threshold_luma: int = 35
    min_circularity_percent: int = 45
    min_radius_px: int = 3
    max_radius_px: int = 60
    tolerance_px: int = 25
    angle_tolerance_deg: float = 1.0
    search_region: SearchRegion | None = None
    package_region: SearchRegion | None = None
    registered_pin1: dict[str, object] | None = None


@dataclass(frozen=True)
class Pin1Hole:
    id: int
    centerX: int
    centerY: int
    radius: float
    diameter: float
    circularity: int
    areaPx: int
    meanLuma: int
    isKept: bool
    isPrimaryPin1: bool
    relativeX: float
    relativeY: float


@dataclass(frozen=True)
class Pin1Result:
    isPass: bool
    status: Pin1Status
    score: int
    activeHole: Pin1Hole | None
    detectedHoles: tuple[Pin1Hole, ...]
    expectedX: int
    expectedY: int
    deltaX: int
    deltaY: int
    deltaDistance: float
    executionTimeMs: float
    angleDegrees: float = 0.0
    deltaAngleDegrees: float = 0.0


@dataclass
class _Component:
    min_x: int
    min_y: int
    max_x: int
    max_y: int
    sum_x: int
    sum_y: int
    area: int
    perimeter: int
    sum_luma: float


def detect_pin1(
    *,
    width: int,
    height: int,
    rgba_base64: str,
    options: Pin1Options | None = None,
) -> Pin1Result:
    started = time.perf_counter()
    opts = options or Pin1Options()
    rgba = _decode_rgba(width, height, rgba_base64)
    holes = _detect_holes(rgba, width, height, opts)
    result = _evaluate_holes(holes, opts)
    elapsed = round((time.perf_counter() - started) * 1000, 2)

    return Pin1Result(
        isPass=result.isPass,
        status=result.status,
        score=result.score,
        activeHole=result.activeHole,
        detectedHoles=result.detectedHoles,
        expectedX=result.expectedX,
        expectedY=result.expectedY,
        deltaX=result.deltaX,
        deltaY=result.deltaY,
        deltaDistance=result.deltaDistance,
        executionTimeMs=elapsed,
    )


def _decode_rgba(width: int, height: int, rgba_base64: str) -> bytes:
    if width <= 0 or height <= 0:
        _bad("width and height must be positive", {"Width": width, "Height": height})

    try:
        raw = base64.b64decode(rgba_base64, validate=True)
    except ValueError as exc:
        _bad("RgbaBase64 must be valid base64", {"Cause": str(exc)})

    expected = width * height * BYTES_PER_RGBA_PIXEL

    if len(raw) != expected:
        _bad("RgbaBase64 length does not match dimensions", {"Expected": expected, "Actual": len(raw)})

    return raw


def _bad(message: str, details: dict[str, object]) -> None:
    raise AppError(ErrorCode.E_BE_BAD_REQUEST, message, details)


def _bounds(width: int, height: int, region: SearchRegion | None) -> tuple[int, int, int, int]:
    if region is None:
        return 0, 0, width, height

    start_x = max(0, min(width - 1, round(region.x)))
    start_y = max(0, min(height - 1, round(region.y)))
    end_x = max(start_x + 1, min(width, round(region.x + region.width)))
    end_y = max(start_y + 1, min(height, round(region.y + region.height)))

    return start_x, start_y, end_x, end_y


def _luma(rgba: bytes, index: int) -> float:
    pos = index * BYTES_PER_RGBA_PIXEL

    return 0.299 * rgba[pos] + 0.587 * rgba[pos + 1] + 0.114 * rgba[pos + 2]


def _binary_grid(
    rgba: bytes,
    width: int,
    height: int,
    opts: Pin1Options,
) -> tuple[bytearray, list[float], tuple[int, int, int, int]]:
    start_x, start_y, end_x, end_y = _bounds(width, height, opts.search_region)
    total = width * height
    binary = bytearray(total)
    lumas = [0.0] * total
    region_sum = 0.0
    region_count = 0

    for y in range(start_y, end_y):
        for x in range(start_x, end_x):
            idx = y * width + x
            alpha = rgba[idx * BYTES_PER_RGBA_PIXEL + 3]

            if alpha < MIN_VISIBLE_ALPHA:
                continue

            value = _luma(rgba, idx)
            lumas[idx] = value
            region_sum += value
            region_count += 1

    mean_luma = region_sum / region_count if region_count > 0 else 50
    threshold = opts.threshold_luma

    if opts.polarity == "DarkIndentation" and threshold >= mean_luma:
        threshold = max(15, round(mean_luma * 0.75))

    for y in range(start_y, end_y):
        for x in range(start_x, end_x):
            idx = y * width + x
            alpha = rgba[idx * BYTES_PER_RGBA_PIXEL + 3]

            if alpha < MIN_VISIBLE_ALPHA:
                continue

            has_target = lumas[idx] >= threshold if opts.polarity == "LightDot" else lumas[idx] <= threshold

            if has_target:
                binary[idx] = 1

    return binary, lumas, (start_x, start_y, end_x, end_y)


def _flood(
    start_x: int,
    start_y: int,
    width: int,
    binary: bytearray,
    visited: bytearray,
    lumas: list[float],
    bounds: tuple[int, int, int, int],
) -> _Component:
    low_x, low_y, high_x, high_y = bounds
    queue = [(start_x, start_y)]
    visited[start_y * width + start_x] = 1
    comp = _Component(start_x, start_y, start_x, start_y, 0, 0, 0, 0, 0.0)

    while queue:
        x, y = queue.pop()
        idx = y * width + x
        comp.area += 1
        comp.sum_x += x
        comp.sum_y += y
        comp.sum_luma += lumas[idx]
        comp.min_x = min(comp.min_x, x)
        comp.min_y = min(comp.min_y, y)
        comp.max_x = max(comp.max_x, x)
        comp.max_y = max(comp.max_y, y)
        has_boundary = False

        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < low_x or nx >= high_x or ny < low_y or ny >= high_y:
                has_boundary = True
                continue

            next_idx = ny * width + nx

            if binary[next_idx] == 0:
                has_boundary = True
            elif visited[next_idx] == 0:
                visited[next_idx] = 1
                queue.append((nx, ny))

        if has_boundary:
            comp.perimeter += 1

    return comp


def _circularity(comp: _Component) -> int:
    if comp.perimeter == 0:
        return 0

    raw = (4 * math.pi * comp.area) / (comp.perimeter * comp.perimeter)
    normalized = raw / ((math.pi * math.pi) / 16)

    return max(0, min(100, round(normalized * 100)))


def _candidate(
    comp: _Component,
    hole_id: int,
    opts: Pin1Options,
    bounds: tuple[int, int, int, int],
) -> Pin1Hole | None:
    radius = math.sqrt(comp.area / math.pi)

    if radius < opts.min_radius_px or radius > opts.max_radius_px:
        return None

    box_w = comp.max_x - comp.min_x + 1
    box_h = comp.max_y - comp.min_y + 1
    aspect_ratio = min(box_w, box_h) / max(1, max(box_w, box_h))
    fill_ratio = comp.area / max(1, box_w * box_h)

    if aspect_ratio < 0.45 or fill_ratio < 0.28 or fill_ratio > 0.96:
        return None

    circularity = _circularity(comp)

    if circularity < opts.min_circularity_percent:
        return None

    start_x, start_y, end_x, end_y = bounds
    region_w = max(1, end_x - start_x)
    region_h = max(1, end_y - start_y)
    center_x = round(comp.sum_x / comp.area)
    center_y = round(comp.sum_y / comp.area)

    return Pin1Hole(
        id=hole_id,
        centerX=center_x,
        centerY=center_y,
        radius=round(radius, 1),
        diameter=round(radius * 2, 1),
        circularity=circularity,
        areaPx=comp.area,
        meanLuma=round(comp.sum_luma / comp.area),
        isKept=True,
        isPrimaryPin1=False,
        relativeX=round(((center_x - start_x) / region_w) * 1000) / 10,
        relativeY=round(((center_y - start_y) / region_h) * 1000) / 10,
    )


def _detect_holes_cv2(
    rgba: bytes,
    width: int,
    height: int,
    opts: Pin1Options,
) -> tuple[Pin1Hole, ...]:
    import cv2
    import numpy as np

    arr = np.frombuffer(rgba, dtype=np.uint8).reshape((height, width, BYTES_PER_RGBA_PIXEL))
    start_x, start_y, end_x, end_y = _bounds(width, height, opts.search_region)
    roi_bgr = arr[start_y:end_y, start_x:end_x, :3]
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)

    mean_luma = float(np.mean(gray)) if gray.size > 0 else 50.0
    threshold = opts.threshold_luma

    if opts.polarity == "DarkIndentation" and threshold >= mean_luma:
        threshold = max(15, round(mean_luma * 0.75))

    thresh_type = cv2.THRESH_BINARY if opts.polarity == "LightDot" else cv2.THRESH_BINARY_INV
    _, binary = cv2.threshold(gray, threshold, 255, thresh_type)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    holes: list[Pin1Hole] = []
    region_w = max(1, end_x - start_x)
    region_h = max(1, end_y - start_y)
    next_id = 1

    for c in contours:
        area = cv2.contourArea(c)

        if area < math.pi * (opts.min_radius_px ** 2) * 0.4 or area > math.pi * (opts.max_radius_px ** 2) * 1.8:
            continue

        perimeter = cv2.arcLength(c, True)

        if perimeter <= 0:
            continue

        circularity_raw = (4.0 * math.pi * area) / (perimeter * perimeter)
        circularity = max(0, min(100, round(circularity_raw * 100)))

        if len(c) >= 5:
            _, (axis_w, axis_h), _ = cv2.fitEllipse(c)
            minor_axis, major_axis = min(axis_w, axis_h), max(axis_w, axis_h)
            ellipse_ratio = minor_axis / max(1e-3, major_axis)

            if ellipse_ratio >= 0.45:
                circularity = max(circularity, round(ellipse_ratio * 100))

        if circularity < opts.min_circularity_percent:
            continue

        m = cv2.moments(c)

        if m["m00"] == 0:
            continue

        local_cx = m["m10"] / m["m00"]
        local_cy = m["m01"] / m["m00"]
        global_cx = round(start_x + local_cx)
        global_cy = round(start_y + local_cy)
        radius = math.sqrt(area / math.pi)

        mask = np.zeros(gray.shape, dtype=np.uint8)
        cv2.drawContours(mask, [c], -1, 255, -1)
        mean_val = float(cv2.mean(gray, mask=mask)[0])

        hole = Pin1Hole(
            id=next_id,
            centerX=global_cx,
            centerY=global_cy,
            radius=round(radius, 1),
            diameter=round(radius * 2, 1),
            circularity=circularity,
            areaPx=int(area),
            meanLuma=round(mean_val),
            isKept=True,
            isPrimaryPin1=False,
            relativeX=round(((global_cx - start_x) / region_w) * 1000) / 10,
            relativeY=round(((global_cy - start_y) / region_h) * 1000) / 10,
        )
        holes.append(hole)
        next_id += 1

    holes.sort(key=_hole_rank)

    if holes:
        holes[0] = Pin1Hole(**{**holes[0].__dict__, "isPrimaryPin1": True})

    return tuple(holes)


def _detect_holes(rgba: bytes, width: int, height: int, opts: Pin1Options) -> tuple[Pin1Hole, ...]:
    try:
        return _detect_holes_cv2(rgba, width, height, opts)
    except Exception:
        pass

    binary, lumas, bounds = _binary_grid(rgba, width, height, opts)
    start_x, start_y, end_x, end_y = bounds
    visited = bytearray(width * height)
    holes: list[Pin1Hole] = []
    next_id = 1

    for y in range(start_y, end_y):
        for x in range(start_x, end_x):
            idx = y * width + x

            if binary[idx] == 1 and visited[idx] == 0:
                comp = _flood(x, y, width, binary, visited, lumas, bounds)
                item = _candidate(comp, next_id, opts, bounds)

                if item is not None:
                    holes.append(item)
                    next_id += 1

    holes.sort(key=_hole_rank)

    if holes:
        holes[0] = Pin1Hole(**{**holes[0].__dict__, "isPrimaryPin1": True})

    return tuple(holes)


def _hole_rank(hole: Pin1Hole) -> tuple[int, float, int]:
    has_substantial = hole.areaPx >= 150
    prominence = (hole.circularity / 100) * math.log10(max(10, hole.areaPx))

    return (0 if has_substantial else 1, -prominence, -hole.areaPx)


def _registered_xy(opts: Pin1Options) -> tuple[int, int] | None:
    reg = opts.registered_pin1

    if not reg:
        return None

    raw_x = reg.get("centerX", reg.get("x"))
    raw_y = reg.get("centerY", reg.get("y"))

    if isinstance(raw_x, int | float) and isinstance(raw_y, int | float):
        return round(raw_x), round(raw_y)

    return None


def _evaluate_holes(holes: tuple[Pin1Hole, ...], opts: Pin1Options) -> Pin1Result:
    registered = _registered_xy(opts)

    if registered is None:
        primary = holes[0] if holes else None
        has_primary = primary is not None

        return Pin1Result(
            isPass=has_primary,
            status="Passed" if has_primary else "Missing",
            score=primary.circularity if primary is not None else 0,
            activeHole=primary,
            detectedHoles=holes,
            expectedX=0,
            expectedY=0,
            deltaX=0,
            deltaY=0,
            deltaDistance=0,
            executionTimeMs=0,
            angleDegrees=0.0,
            deltaAngleDegrees=0.0,
        )

    expected_x, expected_y = registered
    best = None
    best_distance = float("inf")

    for hole in holes:
        if not hole.isKept:
            continue

        distance = math.hypot(hole.centerX - expected_x, hole.centerY - expected_y)

        if distance < best_distance:
            best = hole
            best_distance = distance

    has_match = best is not None
    has_pass = has_match and best_distance <= opts.tolerance_px

    angle_deg = 0.0
    delta_angle = 0.0

    if best is not None and opts.package_region is not None:
        pkg_cx = opts.package_region.x + opts.package_region.width / 2.0
        pkg_cy = opts.package_region.y + opts.package_region.height / 2.0
        angle_deg = round((math.degrees(math.atan2(best.centerY - pkg_cy, best.centerX - pkg_cx)) + 360) % 360, 1)

        expected_angle = (math.degrees(math.atan2(expected_y - pkg_cy, expected_x - pkg_cx)) + 360) % 360
        raw_diff = abs(angle_deg - expected_angle)
        delta_angle = round(360.0 - raw_diff if raw_diff > 180.0 else raw_diff, 1)

        # Flag misorientation if angle error exceeds angular tolerance
        if delta_angle > max(5.0, opts.angle_tolerance_deg * 3.0):
            has_pass = False

    status: Pin1Status = "Passed" if has_pass else "Misoriented" if has_match else "Missing"

    return Pin1Result(
        isPass=has_pass,
        status=status,
        score=best.circularity if best is not None else 0,
        activeHole=best,
        detectedHoles=holes,
        expectedX=expected_x,
        expectedY=expected_y,
        deltaX=best.centerX - expected_x if best is not None else 0,
        deltaY=best.centerY - expected_y if best is not None else 0,
        deltaDistance=round(best_distance, 1) if best is not None else 0,
        executionTimeMs=0,
        angleDegrees=angle_deg,
        deltaAngleDegrees=delta_angle,
    )


