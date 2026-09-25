"""Contract tests for GET /api/seed."""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE.main import create_app


def _client() -> TestClient:
    return TestClient(create_app())


def test_seed_returns_200_and_bundle_shape() -> None:
    resp = _client().get("/api/seed")
    assert resp.status_code == 200
    body = resp.json()
    assert "version" in body
    assert isinstance(body["projects"], list)
    assert isinstance(body["categories"], list)
    assert isinstance(body["ruleTemplates"], list)
    assert isinstance(body["toolPresets"], list)
    assert isinstance(body["sampleImages"], list)
    assert isinstance(body["programs"], list)
    assert len(body["projects"]) > 0
    assert body["projects"][0]["name"] == "Bottle Line Inspection"


def test_seed_alias_route() -> None:
    resp = _client().get("/seed")
    assert resp.status_code == 200
    body = resp.json()
    assert body["version"] == "1.0.0"


def test_seed_echoes_correlation_id() -> None:
    cid = "cid-seed-test-1234"
    resp = _client().get("/api/seed", headers={"X-Correlation-Id": cid})
    assert resp.headers["X-Correlation-Id"] == cid


def test_seed_mints_correlation_id_when_missing() -> None:
    resp = _client().get("/api/seed")
    assert len(resp.headers["X-Correlation-Id"]) >= 8
