"""Contract and behavior tests for Day 3 camera and Day 4 score endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE.main import create_app


def _client() -> TestClient:
    return TestClient(create_app())


def test_camera_status() -> None:
    client = _client()
    resp = client.get("/camera/status?cameraId=cam-101")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    res = body["Results"][0]
    assert res["status"] == "connected"
    assert "cam-101" in res["message"]


def test_camera_capture() -> None:
    client = _client()
    resp = client.post("/camera/capture")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    res = body["Results"][0]
    assert "id" in res
    assert "url" in res
    assert res["width"] == 1920
    assert res["height"] == 1080


def test_camera_settings() -> None:
    client = _client()
    resp = client.put("/camera/settings", json={"triggerMode": "hardware"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True


def test_score_evaluation_grayscale() -> None:
    client = _client()
    resp = client.post(
        "/score",
        json={
            "ruleType": "grayscale_tolerance",
            "threshold": 0.8,
            "tolerance": 20,
            "roi": {"x": 10, "y": 10, "width": 50, "height": 50},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["is_pass"] is True
    assert body["confidence"] >= 80.0


def test_score_evaluation_pattern_match() -> None:
    client = _client()
    resp = client.post(
        "/score",
        json={
            "ruleType": "pattern_match",
            "threshold": 0.5,
            "roi": {"x": 20, "y": 20, "width": 40, "height": 40},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert "confidence" in body
    assert "is_pass" in body
