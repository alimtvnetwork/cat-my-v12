"""Unit tests for BE/routes/handler.py (Day 10 Handler Simulation)."""

import pytest
from BE.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_handler_status(client):
    res = client.get("/handler/status")
    assert res.status_code == 200
    data = res.json()
    assert "Results" in data
    assert len(data["Results"]) == 1
    status = data["Results"][0]
    assert "is_running" in status
    assert "cycle_count" in status
    assert "accept_count" in status
    assert "reject_count" in status


def test_handler_reset(client):
    res = client.post("/handler/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["Results"][0]["reset"] is True


def test_handler_step(client):
    res = client.post("/handler/step")
    assert res.status_code == 200
    data = res.json()
    assert "Results" in data
    res_data = data["Results"][0]
    assert "cycle" in res_data
    assert "simulatorState" in res_data
    cycle = res_data["cycle"]
    assert "is_pass" in cycle
    assert "verdict" in cycle
    assert "score" in cycle
    assert "sortDestination" in cycle


def test_handler_start_stop(client):
    # Test start
    res_start = client.post("/handler/start")
    assert res_start.status_code == 200

    # Test stop
    res_stop = client.post("/handler/stop")
    assert res_stop.status_code == 200
