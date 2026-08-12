"""Contract tests for /samples stub routes on the Universal Response Envelope."""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE.main import create_app


def _client() -> TestClient:
    return TestClient(create_app())


def test_list_samples() -> None:
    resp = _client().get("/samples")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Results"][0]["total"] == 3
    assert body["Results"][0]["provider"] == "InMemorySamplesRepo"
    assert "X-Correlation-Id" in resp.headers


def test_get_sample_returns_404_envelope() -> None:
    resp = _client().get("/samples/12")
    assert resp.status_code == 404
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Results"] == []
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_get_sample_rejects_non_integer_id() -> None:
    resp = _client().get("/samples/foo")
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_get_sample_rejects_non_positive_id() -> None:
    resp = _client().get("/samples/-3")
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_samples_echoes_correlation_id() -> None:
    cid = "cid-samples-stub-2"
    r1 = _client().get("/samples", headers={"X-Correlation-Id": cid})
    r2 = _client().get("/samples/5", headers={"X-Correlation-Id": cid})
    assert r1.headers["X-Correlation-Id"] == cid
    assert r2.headers["X-Correlation-Id"] == cid
