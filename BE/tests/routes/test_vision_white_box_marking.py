from __future__ import annotations

import base64

from BE.config import Environment, LogLevel, Settings
from BE.main import create_app
from fastapi.testclient import TestClient


def _settings() -> Settings:
    return Settings(
        host="127.0.0.1",
        port=8787,
        env=Environment.Dev,
        log_level=LogLevel.Warning,
        cors_origins=("http://localhost:8080",),
    )


def test_white_box_marking_route_returns_envelope() -> None:
    data = bytearray([0, 0, 0, 255] * 16)
    for y in range(1, 3):
        for x in range(1, 3):
            pos = (y * 4 + x) * 4
            data[pos:pos + 4] = bytes((255, 255, 255, 255))
    payload = {
        "Width": 4,
        "Height": 4,
        "RgbaBase64": base64.b64encode(bytes(data)).decode("ascii"),
    }

    client = TestClient(create_app(_settings()))
    response = client.post("/vision/white-box-marking", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Results"][0]["Boxes"][0]["number"] == 1


def test_white_box_marking_route_uses_search_region() -> None:
    data = bytearray([0, 0, 0, 255] * 64)
    for x, y in ((1, 1), (6, 6)):
        for yy in range(y, y + 2):
            for xx in range(x, x + 2):
                pos = (yy * 8 + xx) * 4
                data[pos:pos + 4] = bytes((255, 255, 255, 255))
    payload = {
        "Width": 8,
        "Height": 8,
        "RgbaBase64": base64.b64encode(bytes(data)).decode("ascii"),
        "SearchRegion": {"X": 5, "Y": 5, "Width": 3, "Height": 3},
    }

    client = TestClient(create_app(_settings()))
    response = client.post("/vision/white-box-marking", json=payload)

    assert response.status_code == 200
    boxes = response.json()["Results"][0]["Boxes"]
    assert [(box["x"], box["y"], box["width"], box["height"]) for box in boxes] == [(6, 6, 2, 2)]
