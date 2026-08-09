"""Tests for `GET /healthz` — Universal Envelope shape, correlation-id, uptime monotonicity."""

from __future__ import annotations

import time

from fastapi.testclient import TestClient

from BE.config import Environment, LogLevel, Settings
from BE.main import create_app


def _client() -> TestClient:
    return TestClient(
        create_app(
            Settings(
                host="127.0.0.1",
                port=8787,
                env=Environment.DEV,
                log_level=LogLevel.WARNING,
                cors_origins=("http://localhost:8080",),
            )
        )
    )


def test_healthz_returns_success_envelope() -> None:
    resp = _client().get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Status"]["Code"] == 200
    assert "Errors" not in body
    assert body["Attributes"]["IsSingle"] is True
    item = body["Results"][0]
    assert item["status"] == "ok"
    assert item["env"] == "dev"
    assert isinstance(item["uptime_s"], (int, float))
    assert item["uptime_s"] >= 0


def test_healthz_echoes_correlation_id() -> None:
    resp = _client().get("/healthz", headers={"X-Correlation-Id": "cid-abc-123"})
    assert resp.headers["X-Correlation-Id"] == "cid-abc-123"


def test_healthz_mints_correlation_id_when_missing() -> None:
    resp = _client().get("/healthz")
    assert len(resp.headers["X-Correlation-Id"]) == 36


def test_healthz_uptime_is_monotonic_nondecreasing() -> None:
    client = _client()
    first = client.get("/healthz").json()["Results"][0]["uptime_s"]
    time.sleep(0.01)
    second = client.get("/healthz").json()["Results"][0]["uptime_s"]
    assert second >= first
