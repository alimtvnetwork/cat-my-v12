"""Contract test: BE health + meta + rules (T-001, T-002)."""
from __future__ import annotations

from fastapi.testclient import TestClient
from BE.main import create_app

def _client() -> TestClient:
    return TestClient(create_app())

def test_health_envelope():
    client = _client()
    resp = client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert "Status" in body
    assert body["Status"]["IsSuccess"] is True
    assert body["Status"]["IsFailed"] is False

def test_meta_envelope():
    client = _client()
    resp = client.get("/meta")
    assert resp.status_code == 200
    body = resp.json()
    assert "Status" in body
    assert body["Status"]["IsSuccess"] is True
    assert "Results" in body
    results = body["Results"]
    assert len(results) > 0
    item = results[0]
    assert "version" in item
    assert "env" in item
    assert "capabilities" in item

def test_rules_list_envelope():
    client = _client()
    headers = {"X-Correlation-Id": "12345678-1234-1234-1234-123456789012"}
    resp = client.get("/rules", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("x-correlation-id") == "12345678-1234-1234-1234-123456789012"
    body = resp.json()
    assert "Status" in body
    assert body["Status"]["IsSuccess"] is True
    assert "Results" in body
    assert isinstance(body["Results"], list)

def test_rules_invalid_id():
    client = _client()
    resp = client.get("/rules/abc")
    assert resp.status_code == 400
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Status"]["Code"] == 400
    assert body["Status"]["Message"] == "E_BE_BAD_REQUEST"

def test_rules_missing_rule():
    client = _client()
    resp = client.get("/rules/999999")
    assert resp.status_code == 404
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Status"]["Code"] == 404
    assert body["Status"]["Message"] == "E_BE_NOT_FOUND"
