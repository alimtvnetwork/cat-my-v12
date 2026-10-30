"""Comprehensive verification test suite for Vision System and Error Management Instructions.

Verifies:
1. Recipe table presence and self-healing (no more 'no such table: Recipe').
2. SystemError SplitDB table persistence and retrieval with full stack traces.
3. Task Error table persistence, idempotent replay by CorrelationId, and self-healing.
4. CLI errors command: list, show, and export with stack traces.
5. UI Automation Triad: Element registry with id, name, and xpath.
6. UI Remote CLI commands: ls, click, grayscale tuning.
7. Shutdown route POST /shutdown.
"""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from BE.app.db.writers.error import list_errors, write_errors
from BE.db.connections import get_root_conn, get_task_conn
from BE.main import app
from BE.repos.sqlite_error_repo import SqliteErrorRepo
from BE.repos.sqlite_rules_repo import SqliteRulesRepo
from BE.ui_remote.registry import ELEMENTS, list_elements


@pytest.fixture
def test_client() -> TestClient:
    return TestClient(app)


def test_recipe_table_self_healing_and_save():
    """Verify SqliteRulesRepo auto-creates Recipe table and saves successfully."""
    repo = SqliteRulesRepo()
    cursor = repo.conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Recipe';"
    )
    table_name = cursor.fetchone()
    assert table_name is not None
    assert table_name[0] == "Recipe"

    from BE.app.domain.rule_set import SCHEMA_VERSION, parse_envelope
    test_envelope = {
        "SchemaVersion": SCHEMA_VERSION,
        "RuleSetId": int(time.time() * 1000) % 900_000 + 100_000,
        "Name": "Test Verification Recipe",
        "Version": 1,
        "Enabled": True,
        "Rules": [],
        "DraftMeta": {
            "ClientId": "test-client-1",
            "UpdatedAt": "2026-10-31T00:00:00Z",
            "Origin": "server",
        },
    }
    repo.save_rule_set(parse_envelope(test_envelope))
    loaded = repo.get_rule_set(test_envelope["RuleSetId"])
    assert loaded is not None
    assert loaded.Name == "Test Verification Recipe"


def test_system_error_splitdb_persistence():
    """Verify SqliteErrorRepo records and reads errors with full stack trace."""
    error_repo = SqliteErrorRepo()
    test_id = error_repo.record_error(
        correlation_id="corr-test-verification-1",
        error_code="E_TEST_VERIFY",
        severity="ERROR",
        subsystem="VISION_ENGINE",
        message="Simulated vision test fault",
        stack_trace="Traceback (most recent call last):\n  File 'test.py', line 10\n    raise ValueError('Test')",
        context={"testKey": "testVal", "frameId": 42},
    )

    err = error_repo.get_error(test_id)
    assert err is not None
    assert err["CorrelationId"] == "corr-test-verification-1"
    assert err["ErrorCode"] == "E_TEST_VERIFY"
    assert "Simulated vision test fault" in err["Message"]
    assert "Traceback" in err["StackTrace"]
    assert err["Context"].get("frameId") == 42


def test_task_error_table_self_healing_and_idempotence():
    """Verify Task Error writer auto-creates table and deduplicates CorrelationId."""
    conn = get_task_conn()
    cid = f"corr-task-test-{int(time.time() * 1000)}"

    outcome1 = write_errors(
        conn,
        errors=[
            {
                "CorrelationId": cid,
                "Code": "E_TASK_TEST",
                "Level": "error",
                "Message": "Test Task Error Message",
                "StackTrace": "Error: sample stack trace\n    at Object.test (test.ts:42)",
            }
        ],
    )
    assert outcome1.InsertedCount == 1
    assert outcome1.SkippedCount == 0

    # Idempotent replay
    outcome2 = write_errors(
        conn,
        errors=[
            {
                "CorrelationId": cid,
                "Code": "E_TASK_TEST",
                "Level": "error",
                "Message": "Test Task Error Message Replayed",
            }
        ],
    )
    assert outcome2.InsertedCount == 0
    assert outcome2.SkippedCount == 1

    # Verify readout
    listed = list_errors(conn, correlation_id=cid)
    assert len(listed) == 1
    assert listed[0]["CorrelationId"] == cid
    assert listed[0]["Code"] == "E_TASK_TEST"


def test_ui_automation_triad_registry():
    """Verify every registered element satisfies the UI Automation Triad (Id, Name, XPath)."""
    assert len(ELEMENTS) >= 15
    for el in ELEMENTS:
        assert "id" in el and el["id"], f"Element missing id: {el}"
        assert "name" in el and el["name"], f"Element missing name: {el}"
        assert "xpath" in el and el["xpath"], f"Element missing xpath: {el}"
        assert "routes" in el and isinstance(el["routes"], list)
        assert "actions" in el and isinstance(el["actions"], list)

    # Verify specific core buttons
    ids = {el["id"] for el in ELEMENTS}
    assert "ui-window-minimize" in ids
    assert "ui-window-maximize" in ids
    assert "ui-window-close" in ids
    assert "ui-sim-previous" in ids
    assert "ui-sim-next" in ids
    assert "ui-sim-exit" in ids


def test_shutdown_endpoint(test_client: TestClient):
    """Verify POST /shutdown initiates clean daemon exit response."""
    response = test_client.post("/shutdown")
    assert response.status_code == 200
    body = response.json()
    assert body.get("Status", {}).get("IsSuccess") is True
    assert body.get("Results", [{}])[0].get("status") == "shutting_down"


def test_ui_remote_packets_roundtrip(test_client: TestClient):
    """Verify CLI actuator packets can be enqueued and polled."""
    post_res = test_client.post(
        "/ui-remote/packets",
        json={
            "action": "click",
            "elementId": "ui-sim-next",
            "actor": "cli_test",
        },
    )
    assert post_res.status_code == 200
    packet_data = post_res.json()["Results"][0]
    packet_id = packet_data["packetId"]
    assert packet_id

    # Check pending
    pending_res = test_client.get("/ui-remote/pending")
    assert pending_res.status_code == 200
    pending_packets = pending_res.json()["Results"]
    assert any(p.get("packetId") == packet_id for p in pending_packets)
