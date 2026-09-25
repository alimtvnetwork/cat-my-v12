"""Unit tests for BE/routes/telemetry.py (Day 7 MVP)."""

import pytest
from fastapi.testclient import TestClient
from BE.main import create_app

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

def test_telemetry_latest(client):
    res = client.get("/telemetry/latest")
    assert res.status_code == 200
    data = res.json()
    assert "Results" in data
    assert len(data["Results"]) == 1
    assert "verdict" in data["Results"][0]
    assert "is_pass" in data["Results"][0]

def test_telemetry_summary(client):
    res = client.get("/telemetry/summary")
    assert res.status_code == 200
    data = res.json()
    assert "Results" in data
    summary = data["Results"][0]
    assert "total" in summary
    assert "ok" in summary
    assert "ng" in summary
    assert "yieldPct" in summary

def test_telemetry_history(client):
    res = client.get("/telemetry/history?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "Results" in data
    assert isinstance(data["Results"], list)

def test_telemetry_reset(client):
    res = client.post("/telemetry/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["Results"][0]["reset"] is True
