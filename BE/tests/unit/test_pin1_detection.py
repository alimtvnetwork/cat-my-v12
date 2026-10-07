from __future__ import annotations

import base64

from BE.app.domain.pin1_detection import Pin1Options, SearchRegion, detect_pin1


def _rgba_with_dark_circle(width: int, height: int, center_x: int, center_y: int, radius: int) -> str:
    data = bytearray([80, 80, 80, 255] * width * height)

    for y in range(height):
        for x in range(width):
            if (x - center_x) ** 2 + (y - center_y) ** 2 <= radius**2:
                pos = (y * width + x) * 4
                data[pos : pos + 4] = bytes((10, 10, 10, 255))

    return base64.b64encode(bytes(data)).decode("ascii")


def test_detect_pin1_finds_dark_round_hole() -> None:
    result = detect_pin1(
        width=40,
        height=40,
        rgba_base64=_rgba_with_dark_circle(40, 40, 10, 10, 4),
        options=Pin1Options(
            threshold_luma=35,
            min_circularity_percent=40,
            min_radius_px=2,
            max_radius_px=8,
            search_region=SearchRegion(x=0, y=0, width=20, height=20),
        ),
    )

    assert result.isPass is True
    assert result.status == "Passed"
    assert result.activeHole is not None
    assert result.activeHole.centerX == 10
    assert result.activeHole.centerY == 10


def test_detect_pin1_reports_misoriented_against_registered_reference() -> None:
    result = detect_pin1(
        width=40,
        height=40,
        rgba_base64=_rgba_with_dark_circle(40, 40, 30, 30, 4),
        options=Pin1Options(
            threshold_luma=35,
            min_circularity_percent=40,
            min_radius_px=2,
            max_radius_px=8,
            tolerance_px=4,
            registered_pin1={"centerX": 10, "centerY": 10},
        ),
    )

    assert result.isPass is False
    assert result.status == "Misoriented"
    assert result.deltaDistance > 4
