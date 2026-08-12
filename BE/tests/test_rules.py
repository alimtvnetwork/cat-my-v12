"""Contract tests for /rules stub routes on the Universal Response Envelope."""

from __future__ import annotations

from fastapi.testclient import TestClient

from BE.main import create_app


def _client() -> TestClient:
    return TestClient(create_app())


def test_list_rules_empty_envelope() -> None:
    resp = _client().get("/rules")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Results"] == [{"items": [], "total": 0, "provider": "InMemoryRulesRepo"}]
    assert "X-Correlation-Id" in resp.headers


def test_get_rule_returns_404_envelope() -> None:
    resp = _client().get("/rules/42")
    assert resp.status_code == 404
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Results"] == []
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert body["Errors"]["BackendMessage"]


def test_get_rule_rejects_non_integer_id() -> None:
    resp = _client().get("/rules/abc")
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_get_rule_rejects_non_positive_id() -> None:
    resp = _client().get("/rules/0")
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_rules_echoes_correlation_id() -> None:
    cid = "cid-rules-stub-9"
    r1 = _client().get("/rules", headers={"X-Correlation-Id": cid})
    r2 = _client().get("/rules/7", headers={"X-Correlation-Id": cid})
    assert r1.headers["X-Correlation-Id"] == cid
    assert r2.headers["X-Correlation-Id"] == cid
