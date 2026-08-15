"""Contract tests for GET /meta on the Universal Response Envelope."""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE import __version__ as BE_VERSION
from BE.main import create_app


def _client() -> TestClient:
    return TestClient(create_app())


def test_meta_envelope_shape() -> None:
    resp = _client().get("/meta")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert "Errors" not in body
    data = body["Results"][0]
    assert data["version"] == BE_VERSION
    assert data["env"] in {"dev", "test", "prod"}
    assert data["sdkFacadeVersion"] == "0.3.0-protocol"


def test_meta_capabilities_are_literals() -> None:
    data = _client().get("/meta").json()["Results"][0]
    caps = data["capabilities"]
    assert caps == {
        "camera": "stub",
        "rules": "in-memory",
        "samples": "in-memory",
    }


def test_meta_echoes_correlation_id() -> None:
    cid = "cid-meta-test-1234"
    resp = _client().get("/meta", headers={"X-Correlation-Id": cid})
    assert resp.headers["X-Correlation-Id"] == cid


def test_meta_mints_correlation_id_when_missing() -> None:
    resp = _client().get("/meta")
    assert len(resp.headers["X-Correlation-Id"]) >= 8
