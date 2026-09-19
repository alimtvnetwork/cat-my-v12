from __future__ import annotations

import base64

from BE.app.domain.white_box_marking import MarkingOptions, SearchRegion, mark_white_boxes


def _rgba(width: int, height: int, white_rects: list[tuple[int, int, int, int]]) -> str:
    data = bytearray([0, 0, 0, 255] * width * height)
    for x, y, w, h in white_rects:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                pos = (yy * width + xx) * 4
                data[pos:pos + 4] = bytes((255, 255, 255, 255))
    return base64.b64encode(bytes(data)).decode("ascii")


def _gray_rgba(width: int, height: int, gray_rects: list[tuple[int, int, int, int, int]]) -> str:
    data = bytearray([0, 0, 0, 255] * width * height)
    for x, y, w, h, value in gray_rects:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                pos = (yy * width + xx) * 4
                data[pos:pos + 4] = bytes((value, value, value, 255))
    return base64.b64encode(bytes(data)).decode("ascii")


def test_marks_two_white_rectangles_in_reading_order() -> None:
    result = mark_white_boxes(
        width=12,
        height=8,
        rgba_base64=_rgba(12, 8, [(1, 1, 3, 3), (7, 2, 3, 4)]),
        options=MarkingOptions(white_threshold=220, min_area_px=4),
    )

    assert [(b.number, b.x, b.y, b.width, b.height, b.area) for b in result.boxes] == [
        (1, 1, 1, 3, 3, 9),
        (2, 7, 2, 3, 4, 12),
    ]
    assert len(base64.b64decode(result.rgba_base64)) == 12 * 8 * 4


def test_default_threshold_marks_light_gray_text_after_two_bit_conversion() -> None:
    result = mark_white_boxes(
        width=8,
        height=5,
        rgba_base64=_gray_rgba(8, 5, [(1, 1, 2, 3, 180)]),
    )

    assert [(b.number, b.x, b.y, b.width, b.height, b.area) for b in result.boxes] == [
        (1, 1, 1, 2, 3, 6),
    ]


def test_explicit_threshold_result_uses_same_preview_image() -> None:
    result = mark_white_boxes(
        width=3,
        height=1,
        rgba_base64=_gray_rgba(3, 1, [(0, 0, 1, 1, 90), (1, 0, 1, 1, 150), (2, 0, 1, 1, 210)]),
        options=MarkingOptions(white_threshold=170, min_area_px=1),
    )

    rgba = base64.b64decode(result.rgba_base64)
    assert [rgba[0], rgba[4], rgba[8]] == [85, 255, 255]


def test_auto_detection_marks_dim_gray_text_on_dark_chip() -> None:
    result = mark_white_boxes(
        width=14,
        height=8,
        rgba_base64=_gray_rgba(14, 8, [(2, 2, 3, 4, 104), (8, 2, 3, 4, 118)]),
        options=MarkingOptions(search_region=SearchRegion(x=1, y=1, width=12, height=6)),
    )

    assert [(b.number, b.x, b.y, b.width, b.height, b.area) for b in result.boxes] == [
        (1, 2, 2, 3, 4, 12),
        (2, 8, 2, 3, 4, 12),
    ]


def test_filters_tiny_white_noise() -> None:
    result = mark_white_boxes(
        width=8,
        height=8,
        rgba_base64=_rgba(8, 8, [(1, 1, 1, 1), (3, 3, 3, 3)]),
        options=MarkingOptions(white_threshold=220, min_area_px=4),
    )

    assert len(result.boxes) == 1
    assert result.boxes[0].x == 3


def test_search_region_limits_detection_area() -> None:
    result = mark_white_boxes(
        width=12,
        height=8,
        rgba_base64=_rgba(12, 8, [(1, 1, 3, 3), (7, 2, 3, 4)]),
        options=MarkingOptions(
            white_threshold=220,
            min_area_px=4,
            search_region=SearchRegion(x=6, y=1, width=5, height=6),
        ),
    )

    assert [(b.number, b.x, b.y, b.width, b.height, b.area) for b in result.boxes] == [
        (1, 7, 2, 3, 4, 12),
    ]
