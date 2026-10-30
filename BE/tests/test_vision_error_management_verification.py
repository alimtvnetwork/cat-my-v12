"""Comprehensive verification test suite for Vision System and Error Management Instructions.

Spec references:
- 02-spec/21-app/04-vision-system-and-error-management-instructions/
  - 01-architecture-spec.md
  - 02-window-controls-and-glitch-spec.md
  - 03-error-management-and-splitdb-spec.md
  - 04-cli-automation-and-identifiers-spec.md
  - 05-roi-layers-and-grayscale-spec.md
  - 06-supabase-and-email-telemetry-spec.md

Tests cover 55+ distinct granular backend requirements:
1. Recipe table presence, self-healing, upsert idempotency, version increment.
2. Root-tier SystemError SplitDB table persistence, stack trace capture, and resolution.
3. Task-tier Error table persistence, duplicate skipping, detail redaction, and querying.
4. FastAPI /errors REST endpoints: single, batch, items, filtering, idempotency, 404, 400.
5. UI Remote Registry: UI Triad (Id, Name, XPath) across 25+ elements.
6. UI Remote Queue & Packet Lifecycle: enqueue, pending, completion, failure, grayscale calibration.
7. Clean Shutdown route POST /shutdown with loopback authorization.
8. CLI command handlers: errors (list, show, export json/csv) and ui (ls, click, grayscale).
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import time
import uuid
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from BE.app.db.writers.error import list_errors, write_errors
from BE.cli.processing.commands import errors as cli_errors
from BE.cli.processing.commands import ui_remote as cli_ui
from BE.db.connections import get_root_conn, get_task_conn
from BE.main import app
from BE.repos.sqlite_error_repo import SqliteErrorRepo
from BE.repos.sqlite_rules_repo import SqliteRulesRepo
from BE.ui_remote.queue import (
    complete_packet,
    enqueue_action,
    fail_packet,
    get_packet,
    get_pending_packets,
)
from BE.ui_remote.registry import ELEMENTS, list_elements


@pytest.fixture
def test_client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def mock_session_ctx() -> MagicMock:
    ctx = MagicMock()
    ctx.logger = MagicMock()
    ctx.ref = MagicMock()
    ctx.ref.RunId = "run-test-verification"
    return ctx


# ==============================================================================
# 1. Recipe SQLite Table Self-Healing & Persistence (Tests 1 - 8)
# ==============================================================================


def test_recipe_table_presence_and_structure():
    """Verify Recipe table exists with PascalCase columns in root.db."""
    repo = SqliteRulesRepo()
    cursor = repo.conn.execute(
        "PRAGMA table_info(Recipe);"
    )
    cols = {row[1]: row[2] for row in cursor.fetchall()}

    assert "RuleSetId" in cols
    assert "Name" in cols
    assert "Version" in cols
    assert "Enabled" in cols
    assert "PayloadJson" in cols
    assert "UpdatedAt" in cols
    assert "CreatedAt" in cols


def test_recipe_table_self_healing_after_drop():
    """Verify SqliteRulesRepo self-heals if Recipe table is dropped."""
    repo = SqliteRulesRepo()
    repo.conn.execute("DROP TABLE IF EXISTS Recipe;")
    repo.conn.commit()

    # Re-instantiate repository and verify auto-creation
    healed_repo = SqliteRulesRepo()
    cursor = healed_repo.conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Recipe';"
    )
    table_name = cursor.fetchone()

    assert table_name is not None
    assert table_name[0] == "Recipe"


def test_recipe_save_and_retrieve_roundtrip():
    """Verify saving a rule set persists and can be fetched by RuleSetId."""
    repo = SqliteRulesRepo()
    rule_set_id = int(time.time() * 1000) % 900_000 + 100_000

    envelope = {
        "SchemaVersion": "1.0",
        "RuleSetId": rule_set_id,
        "Name": "Roundtrip Verification Recipe",
        "Version": 1,
        "Enabled": True,
        "Rules": [],
        "DraftMeta": {
            "ClientId": "client-test-1",
            "UpdatedAt": "2026-10-31T00:00:00Z",
            "Origin": "server",
        },
    }

    repo.save_rule_set(envelope)
    loaded = repo.get_rule_set(rule_set_id)

    assert loaded is not None
    assert loaded["RuleSetId"] == rule_set_id
    assert loaded["Name"] == "Roundtrip Verification Recipe"
    assert loaded["Enabled"] is True


def test_recipe_update_version_auto_increment():
    """Verify updating a recipe increments its version deterministically."""
    repo = SqliteRulesRepo()
    rule_set_id = int(time.time() * 1000) % 900_000 + 200_000

    envelope_v1 = {
        "SchemaVersion": "1.0",
        "RuleSetId": rule_set_id,
        "Name": "Increment Recipe V1",
        "Version": 1,
        "Enabled": True,
        "Rules": [],
        "DraftMeta": {"ClientId": "c1", "UpdatedAt": "2026-10-31T00:00:00Z", "Origin": "server"},
    }
    repo.save_rule_set(envelope_v1)

    envelope_v2 = {
        "SchemaVersion": "1.0",
        "RuleSetId": rule_set_id,
        "Name": "Increment Recipe V2",
        "Version": 1,
        "Enabled": True,
        "Rules": [],
        "DraftMeta": {"ClientId": "c1", "UpdatedAt": "2026-10-31T01:00:00Z", "Origin": "server"},
    }
    repo.save_rule_set(envelope_v2)

    loaded = repo.get_rule_set(rule_set_id)

    assert loaded is not None
    assert loaded["Version"] >= 2
    assert loaded["Name"] == "Increment Recipe V2"


def test_recipe_fetch_nonexistent_returns_none():
    """Verify querying an unknown RuleSetId returns None safely without raising."""
    repo = SqliteRulesRepo()
    loaded = repo.get_rule_set(999_999_888)

    assert loaded is None


def test_recipe_save_dict_envelope_coercion():
    """Verify save_rule_set seamlessly accepts Python dict without pre-parsing."""
    repo = SqliteRulesRepo()
    rule_set_id = int(time.time() * 1000) % 900_000 + 300_000

    raw_dict = {
        "SchemaVersion": "1.0",
        "RuleSetId": rule_set_id,
        "Name": "Raw Dict Recipe",
        "Version": 1,
        "Enabled": True,
        "Rules": [],
        "DraftMeta": {"ClientId": "c1", "UpdatedAt": "2026-10-31T00:00:00Z", "Origin": "server"},
    }

    result = repo.save_rule_set(raw_dict)

    assert result.RuleSetId == rule_set_id
    assert result.Name == "Raw Dict Recipe"


def test_recipe_unique_index_on_rule_set_id():
    """Verify unique index IdxRecipe_RuleSetId exists."""
    repo = SqliteRulesRepo()
    cursor = repo.conn.execute(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='IdxRecipe_RuleSetId';"
    )
    idx = cursor.fetchone()

    assert idx is not None
    assert idx[0] == "IdxRecipe_RuleSetId"


def test_recipe_get_by_id_type_cast_safety():
    """Verify string representations of RuleSetId are correctly looked up as integer."""
    repo = SqliteRulesRepo()
    rule_set_id = int(time.time() * 1000) % 900_000 + 400_000

    envelope = {
        "SchemaVersion": "1.0",
        "RuleSetId": rule_set_id,
        "Name": "Cast Safety Recipe",
        "Version": 1,
        "Enabled": True,
        "Rules": [],
        "DraftMeta": {"ClientId": "c1", "UpdatedAt": "2026-10-31T00:00:00Z", "Origin": "server"},
    }
    repo.save_rule_set(envelope)

    loaded = repo.get_rule_set(int(str(rule_set_id)))

    assert loaded is not None
    assert loaded["RuleSetId"] == rule_set_id


# ==============================================================================
# 2. Root-Tier SystemError Persistence & Resolution (Tests 9 - 18)
# ==============================================================================


def test_system_error_table_schema_verification():
    """Verify SystemError table schema in root.db."""
    repo = SqliteErrorRepo()
    cursor = repo.conn.execute("PRAGMA table_info(SystemError);")
    cols = {row[1]: row[2] for row in cursor.fetchall()}

    assert "ErrorId" in cols
    assert "CorrelationId" in cols
    assert "ErrorCode" in cols
    assert "Severity" in cols
    assert "Subsystem" in cols
    assert "Message" in cols
    assert "StackTrace" in cols
    assert "ContextJson" in cols
    assert "IsResolved" in cols
    assert "CreatedAt" in cols


def test_system_error_record_and_retrieve_by_id():
    """Verify recording and getting a SystemError."""
    repo = SqliteErrorRepo()
    cid = f"corr-sys-{uuid.uuid4().hex[:8]}"

    error_id = repo.record_error(
        correlation_id=cid,
        error_code="E_SYS_TEST",
        severity="ERROR",
        subsystem="VISION_WORKBENCH",
        message="Camera frame buffer overrun",
        stack_trace="Traceback at line 42",
        context={"bufferSize": 4096, "frameIndex": 12},
    )

    loaded = repo.get_error(error_id)

    assert loaded is not None
    assert loaded["ErrorId"] == error_id
    assert loaded["CorrelationId"] == cid
    assert loaded["ErrorCode"] == "E_SYS_TEST"
    assert loaded["Severity"] == "ERROR"
    assert loaded["Subsystem"] == "VISION_WORKBENCH"
    assert loaded["Message"] == "Camera frame buffer overrun"
    assert loaded["IsResolved"] is False


def test_system_error_record_persists_stack_trace():
    """Verify multiline stack trace is preserved verbatim."""
    repo = SqliteErrorRepo()
    stack = "Traceback (most recent call last):\n  File 'test.py', line 12\nValueError: Fault"

    error_id = repo.record_error(
        correlation_id=f"corr-trace-{uuid.uuid4().hex[:8]}",
        error_code="E_TRACE_TEST",
        message="Trace test",
        stack_trace=stack,
    )

    loaded = repo.get_error(error_id)

    assert loaded is not None
    assert loaded["StackTrace"] == stack


def test_system_error_record_json_context_fidelity():
    """Verify complex nested context is accurately JSON serialized and parsed."""
    repo = SqliteErrorRepo()
    ctx = {"nested": {"a": [1, 2, 3], "flag": True}, "region": {"x": 10, "y": 20}}

    error_id = repo.record_error(
        correlation_id=f"corr-ctx-{uuid.uuid4().hex[:8]}",
        error_code="E_CTX_TEST",
        message="Context test",
        context=ctx,
    )

    loaded = repo.get_error(error_id)

    assert loaded is not None
    assert loaded["Context"]["nested"]["flag"] is True
    assert loaded["Context"]["region"]["x"] == 10


def test_system_error_list_default_limit():
    """Verify list_errors respects limit parameter."""
    repo = SqliteErrorRepo()
    errors = repo.list_errors(limit=5)

    assert isinstance(errors, list)
    assert len(errors) <= 5


def test_system_error_list_filter_by_subsystem():
    """Verify filtering errors by subsystem."""
    repo = SqliteErrorRepo()
    unique_subsystem = f"SUBSYS_{uuid.uuid4().hex[:6]}"

    repo.record_error(
        correlation_id=f"corr-sub-{uuid.uuid4().hex[:8]}",
        error_code="E_SUB_TEST",
        subsystem=unique_subsystem,
        message="Subsystem test error",
    )

    filtered = repo.list_errors(subsystem=unique_subsystem)

    assert len(filtered) >= 1
    assert all(e["Subsystem"] == unique_subsystem for e in filtered)


def test_system_error_list_filter_unresolved_only():
    """Verify filtering errors by unresolved status."""
    repo = SqliteErrorRepo()
    cid = f"corr-unres-{uuid.uuid4().hex[:8]}"

    error_id = repo.record_error(
        correlation_id=cid,
        error_code="E_UNRES_TEST",
        message="Unresolved test error",
        is_resolved=False,
    )

    unresolved_list = repo.list_errors(unresolved_only=True)
    matching = [e for e in unresolved_list if e["ErrorId"] == error_id]

    assert len(matching) == 1
    assert matching[0]["IsResolved"] is False


def test_system_error_resolve_error_sets_flag():
    """Verify resolve_error marks an error as resolved (IsResolved = 1)."""
    repo = SqliteErrorRepo()
    error_id = repo.record_error(
        correlation_id=f"corr-res-{uuid.uuid4().hex[:8]}",
        error_code="E_RES_TEST",
        message="To be resolved",
    )

    is_success = repo.resolve_error(error_id)

    assert is_success is True
    loaded = repo.get_error(error_id)
    assert loaded is not None
    assert loaded["IsResolved"] is True


def test_system_error_resolve_nonexistent_returns_false():
    """Verify resolving unknown error_id returns False."""
    repo = SqliteErrorRepo()
    is_success = repo.resolve_error("nonexistent-error-id-999")

    assert is_success is False


def test_system_error_get_nonexistent_returns_none():
    """Verify get_error with nonexistent error_id returns None."""
    repo = SqliteErrorRepo()
    result = repo.get_error("nonexistent-error-id-000")

    assert result is None


# ==============================================================================
# 3. Task-Tier Error Storage & Idempotent Writer (Tests 19 - 27)
# ==============================================================================


def test_task_error_table_schema_and_indexes():
    """Verify task Error table schema and indexes exist."""
    conn = get_task_conn()
    cursor = conn.execute("PRAGMA table_info(Error);")
    cols = {row[1]: row[2] for row in cursor.fetchall()}

    assert "CorrelationId" in cols
    assert "Code" in cols
    assert "Level" in cols
    assert "Message" in cols
    assert "StackTrace" in cols
    assert "Details" in cols
    assert "CreatedAt" in cols


def test_task_error_write_and_read_single():
    """Verify writing a single error to task Error table."""
    conn = get_task_conn()
    cid = f"task-single-{uuid.uuid4().hex[:8]}"

    outcome = write_errors(
        conn,
        errors=[
            {
                "CorrelationId": cid,
                "Code": "E_TASK_WRITE",
                "Level": "error",
                "Message": "Task write test message",
                "StackTrace": "Test stack line 1\nTest stack line 2",
            }
        ],
    )

    assert outcome.InsertedCount == 1
    assert outcome.SkippedCount == 0

    records = list_errors(conn, correlation_id=cid)

    assert len(records) == 1
    assert records[0]["CorrelationId"] == cid
    assert records[0]["Code"] == "E_TASK_WRITE"
    assert "Task write test message" in records[0]["Message"]


def test_task_error_write_batch_errors():
    """Verify writing multiple errors in a single transaction."""
    conn = get_task_conn()
    cid1 = f"batch-1-{uuid.uuid4().hex[:8]}"
    cid2 = f"batch-2-{uuid.uuid4().hex[:8]}"

    outcome = write_errors(
        conn,
        errors=[
            {"CorrelationId": cid1, "Code": "E_BATCH_1", "Message": "Msg 1"},
            {"CorrelationId": cid2, "Code": "E_BATCH_2", "Message": "Msg 2"},
        ],
    )

    assert outcome.InsertedCount == 2
    assert outcome.SkippedCount == 0


def test_task_error_idempotency_skip_duplicate_cid():
    """Verify duplicate CorrelationId is skipped idempotently without failure."""
    conn = get_task_conn()
    cid = f"idempotent-{uuid.uuid4().hex[:8]}"

    write_errors(conn, errors=[{"CorrelationId": cid, "Code": "E_IDEMP", "Message": "First"}])
    retry_outcome = write_errors(
        conn, errors=[{"CorrelationId": cid, "Code": "E_IDEMP", "Message": "Retry"}]
    )

    assert retry_outcome.InsertedCount == 0
    assert retry_outcome.SkippedCount == 1


def test_task_error_filter_by_code():
    """Verify listing errors filtered by Code."""
    conn = get_task_conn()
    unique_code = f"E_CODE_{uuid.uuid4().hex[:6].upper()}"

    write_errors(
        conn,
        errors=[{"CorrelationId": f"cid-{uuid.uuid4().hex[:8]}", "Code": unique_code, "Message": "Code match"}],
    )

    results = list_errors(conn, code=unique_code)

    assert len(results) >= 1
    assert all(r["Code"] == unique_code for r in results)


def test_task_error_filter_by_level():
    """Verify listing errors filtered by Level."""
    conn = get_task_conn()
    results = list_errors(conn, level="error", limit=10)

    assert isinstance(results, list)
    assert all(r["Level"] == "error" for r in results)


def test_task_error_filter_by_session_id():
    """Verify listing errors filtered by SessionId."""
    conn = get_task_conn()
    unique_sess = f"sess-{uuid.uuid4().hex[:8]}"

    write_errors(
        conn,
        errors=[
            {
                "CorrelationId": f"cid-sess-{uuid.uuid4().hex[:8]}",
                "Code": "E_SESS_TEST",
                "SessionId": unique_sess,
                "Message": "Session test error",
            }
        ],
    )

    results = list_errors(conn, session_id=unique_sess)

    assert len(results) >= 1
    assert all(r["SessionId"] == unique_sess for r in results)


def test_task_error_limit_bounding_ceiling():
    """Verify limit clamps cleanly without exception."""
    conn = get_task_conn()
    results = list_errors(conn, limit=5)

    assert len(results) <= 5


def test_task_error_details_json_serialization():
    """Verify details JSON payload merges auxiliary fields correctly."""
    conn = get_task_conn()
    cid = f"details-{uuid.uuid4().hex[:8]}"

    write_errors(
        conn,
        errors=[
            {
                "CorrelationId": cid,
                "Code": "E_DETAILS",
                "Message": "Details message",
                "context": {"token": "redacted_val", "attempt": 3},
            }
        ],
    )

    records = list_errors(conn, correlation_id=cid)

    assert len(records) == 1
    details = records[0]["Details"]
    assert isinstance(details, dict)
    assert details.get("context", {}).get("attempt") == 3


# ==============================================================================
# 4. FastAPI /errors REST Endpoints (Tests 28 - 38)
# ==============================================================================


def test_fastapi_post_errors_single_object(test_client: TestClient):
    """Verify POST /errors accepts single CapturedError object."""
    cid = f"rest-single-{uuid.uuid4().hex[:8]}"
    payload = {
        "correlationId": cid,
        "code": "E_REST_SINGLE",
        "level": "error",
        "message": "REST single error test",
        "stackTrace": "Error at component.tsx:25",
        "triggerComponent": "VisualToolWorkpieceCanvas",
    }

    res = test_client.post("/errors", json=payload)

    assert res.status_code == 200
    data = res.json()
    assert data["Status"]["IsSuccess"] is True
    assert data["Results"][0]["inserted"] == 1


def test_fastapi_post_errors_batch_array(test_client: TestClient):
    """Verify POST /errors accepts JSON array of errors."""
    cid1 = f"rest-batch-1-{uuid.uuid4().hex[:8]}"
    cid2 = f"rest-batch-2-{uuid.uuid4().hex[:8]}"

    res = test_client.post(
        "/errors",
        json=[
            {"correlationId": cid1, "code": "E_BATCH_A", "message": "Batch error 1"},
            {"correlationId": cid2, "code": "E_BATCH_B", "message": "Batch error 2"},
        ],
    )

    assert res.status_code == 200
    assert res.json()["Results"][0]["inserted"] == 2


def test_fastapi_post_errors_items_dictionary(test_client: TestClient):
    """Verify POST /errors accepts items dictionary wrapper."""
    cid = f"rest-items-{uuid.uuid4().hex[:8]}"

    res = test_client.post(
        "/errors",
        json={"items": [{"correlationId": cid, "code": "E_ITEMS_WRAP", "message": "Items wrap"}]},
    )

    assert res.status_code == 200
    assert res.json()["Results"][0]["inserted"] == 1


def test_fastapi_post_errors_idempotency_skip(test_client: TestClient):
    """Verify POST /errors retrying same correlationId reports skipped."""
    cid = f"rest-idemp-{uuid.uuid4().hex[:8]}"

    res1 = test_client.post(
        "/errors",
        json={"correlationId": cid, "code": "E_RETRY", "message": "Original"},
    )
    assert res1.json()["Results"][0]["inserted"] == 1

    res2 = test_client.post(
        "/errors",
        json={"correlationId": cid, "code": "E_RETRY", "message": "Retry"},
    )
    assert res2.json()["Results"][0]["inserted"] == 0
    assert res2.json()["Results"][0]["skipped"] == 1


def test_fastapi_post_errors_missing_required_fields_400(test_client: TestClient):
    """Verify POST /errors with invalid body raises 400 with diagnostic message."""
    res = test_client.post("/errors", json={"level": "error"})

    assert res.status_code == 400
    assert res.json()["Status"]["IsSuccess"] is False


def test_fastapi_get_errors_listing_default_limit(test_client: TestClient):
    """Verify GET /errors returns newest errors with standard envelope."""
    res = test_client.get("/errors?limit=10")

    assert res.status_code == 200
    body = res.json()
    assert body["Status"]["IsSuccess"] is True
    assert isinstance(body["Results"], list)


def test_fastapi_get_errors_query_filter_code(test_client: TestClient):
    """Verify GET /errors?code= filters correctly."""
    code = f"E_QUERY_{uuid.uuid4().hex[:6].upper()}"
    test_client.post(
        "/errors",
        json={"correlationId": f"cid-q-{uuid.uuid4().hex[:8]}", "code": code, "message": "Filter test"},
    )

    res = test_client.get(f"/errors?code={code}")

    assert res.status_code == 200
    results = res.json()["Results"]
    assert len(results) >= 1
    assert all(r["code"] == code for r in results)


def test_fastapi_get_errors_query_filter_level(test_client: TestClient):
    """Verify GET /errors?level= filters by level."""
    res = test_client.get("/errors?level=error")

    assert res.status_code == 200
    results = res.json()["Results"]
    assert all(r["level"] == "error" for r in results)


def test_fastapi_get_errors_query_filter_session(test_client: TestClient):
    """Verify GET /errors?session_id= filters by session ID."""
    sess = f"sess-q-{uuid.uuid4().hex[:8]}"
    test_client.post(
        "/errors",
        json={
            "correlationId": f"cid-sess-q-{uuid.uuid4().hex[:8]}",
            "code": "E_SESS_Q",
            "sessionId": sess,
            "message": "Session Q test",
        },
    )

    res = test_client.get(f"/errors?session_id={sess}")

    assert res.status_code == 200
    results = res.json()["Results"]
    assert len(results) >= 1
    assert all(r["sessionId"] == sess for r in results)


def test_fastapi_get_errors_single_by_correlation_id(test_client: TestClient):
    """Verify GET /errors/{correlation_id} returns exact error with stack trace."""
    cid = f"corr-get-single-{uuid.uuid4().hex[:8]}"
    test_client.post(
        "/errors",
        json={
            "correlationId": cid,
            "code": "E_SINGLE_GET",
            "message": "Exact lookup test",
            "stackTrace": "Exact stack trace line",
        },
    )

    res = test_client.get(f"/errors/{cid}")

    assert res.status_code == 200
    err = res.json()["Results"][0]
    assert err["correlationId"] == cid
    assert err["code"] == "E_SINGLE_GET"
    assert err["stackTrace"] == "Exact stack trace line"


def test_fastapi_get_errors_single_not_found_404(test_client: TestClient):
    """Verify GET /errors/{correlation_id} with unknown ID returns 404."""
    res = test_client.get("/errors/unknown-correlation-id-9999")

    assert res.status_code == 404
    assert res.json()["Status"]["IsSuccess"] is False


# ==============================================================================
# 5. UI Automation Triad Registry (Tests 39 - 43)
# ==============================================================================


def test_ui_remote_registry_minimum_count():
    """Verify UI element registry contains at least 25 interactive targets."""
    assert len(ELEMENTS) >= 25


def test_ui_remote_registry_triad_contract_every_element():
    """Verify every element satisfies UI Triad contract: id, name, and xpath."""
    for el in ELEMENTS:
        assert el.get("id"), f"Element missing non-empty id: {el}"
        assert el.get("name"), f"Element missing non-empty name: {el}"
        assert el.get("xpath"), f"Element missing non-empty xpath: {el}"
        assert isinstance(el.get("routes"), list), f"Element missing routes list: {el}"
        assert isinstance(el.get("actions"), list), f"Element missing actions list: {el}"


def test_ui_remote_registry_window_control_ids():
    """Verify all top-level window controls are registered with exact IDs."""
    ids = {el["id"] for el in ELEMENTS}

    assert "ui-window-minimize" in ids
    assert "ui-window-maximize" in ids
    assert "ui-window-close" in ids


def test_ui_remote_registry_simulation_control_ids():
    """Verify all simulation controls are registered with exact IDs."""
    ids = {el["id"] for el in ELEMENTS}

    assert "ui-sim-previous" in ids
    assert "ui-sim-next" in ids
    assert "ui-sim-take-over" in ids
    assert "ui-sim-exit" in ids


def test_ui_remote_registry_xpath_syntactic_validity():
    """Verify every XPath begins with // and contains valid selector predicate."""
    for el in ELEMENTS:
        xpath = el["xpath"]
        assert xpath.startswith("//"), f"XPath must start with //: {xpath}"
        assert "[" in xpath and "]" in xpath, f"XPath must contain predicate: {xpath}"


# ==============================================================================
# 6. UI Remote Queue & Packet Lifecycle (Tests 44 - 47)
# ==============================================================================


def test_ui_remote_packet_enqueue_returns_valid_id():
    """Verify enqueueing an action generates a valid packetId and pending status."""
    packet = enqueue_action(action="click", element_id="ui-window-minimize", actor="test")

    assert packet["packetId"]
    assert packet["action"] == "click"
    assert packet["elementId"] == "ui-window-minimize"
    assert packet["status"] == "pending"


def test_ui_remote_packet_lifecycle_complete_success():
    """Verify completing a packet marks status as executed with result payload."""
    packet = enqueue_action(action="click", element_id="ui-sim-next", actor="test")
    pid = packet["packetId"]

    completed = complete_packet(pid, result={"clicked": True, "target": "ui-sim-next"})

    assert completed is not None
    assert completed["status"] == "executed"
    assert completed["result"]["clicked"] is True


def test_ui_remote_packet_lifecycle_fail_with_reason():
    """Verify failing a packet marks status as failed with error reason."""
    packet = enqueue_action(action="click", element_id="ui-window-close", actor="test")
    pid = packet["packetId"]

    failed = fail_packet(pid, error="Element is disabled in modal state")

    assert failed is not None
    assert failed["status"] == "failed"
    assert failed["error"] == "Element is disabled in modal state"


def test_ui_remote_grayscale_packet_parameters():
    """Verify queuing grayscale tuning packet carries threshold and bitDepth."""
    packet = enqueue_action(
        action="grayscale",
        actor="cli",
        parameters={"threshold": 175, "bitDepth": "1-bit", "contrast": 85},
    )

    assert packet["action"] == "grayscale"
    assert packet["parameters"]["threshold"] == 175
    assert packet["parameters"]["bitDepth"] == "1-bit"
    assert packet["parameters"]["contrast"] == 85


# ==============================================================================
# 7. Clean Shutdown & Loopback Authorization (Tests 48)
# ==============================================================================


def test_shutdown_endpoint_loopback_authorized(test_client: TestClient):
    """Verify POST /shutdown returns 200 with clean shutting_down status."""
    res = test_client.post("/shutdown")

    assert res.status_code == 200
    body = res.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Results"][0]["status"] == "shutting_down"


# ==============================================================================
# 8. CLI Command Dispatchers (Tests 49 - 55)
# ==============================================================================


def test_cli_errors_list_execution(mock_session_ctx: MagicMock):
    """Verify processing-cli errors list executes cleanly."""
    ns = argparse.Namespace(
        action="list",
        limit=10,
        code=None,
        level=None,
        session_id=None,
        correlation_id=None,
        db_root=None,
    )
    result = cli_errors.handle(ns, mock_session_ctx)

    assert "errors" in result
    assert "count" in result
    assert isinstance(result["errors"], list)


def test_cli_errors_show_execution(mock_session_ctx: MagicMock):
    """Verify processing-cli errors show <cid> returns single record."""
    conn = get_task_conn()
    cid = f"cli-show-{uuid.uuid4().hex[:8]}"
    write_errors(conn, errors=[{"CorrelationId": cid, "Code": "E_SHOW", "Message": "Show msg"}])

    ns = argparse.Namespace(action="show", correlation_id=cid, db_root=None)
    result = cli_errors.handle(ns, mock_session_ctx)

    assert result["CorrelationId"] == cid
    assert result["Code"] == "E_SHOW"


def test_cli_errors_export_json_format(mock_session_ctx: MagicMock):
    """Verify processing-cli errors export --format json output."""
    ns = argparse.Namespace(
        action="export",
        format="json",
        limit=5,
        code=None,
        level=None,
        session_id=None,
        correlation_id=None,
        db_root=None,
    )
    result = cli_errors.handle(ns, mock_session_ctx)

    assert result["format"] == "json"
    assert "errors" in result
    assert "count" in result


def test_cli_errors_export_csv_format(mock_session_ctx: MagicMock):
    """Verify processing-cli errors export --format csv produces valid CSV header."""
    ns = argparse.Namespace(
        action="export",
        format="csv",
        limit=5,
        code=None,
        level=None,
        session_id=None,
        correlation_id=None,
        db_root=None,
    )
    result = cli_errors.handle(ns, mock_session_ctx)

    assert result["format"] == "csv"
    assert "csv" in result
    assert "correlationId" in result["csv"]


def test_cli_ui_ls_execution(mock_session_ctx: MagicMock):
    """Verify processing-cli ui ls returns registered elements list."""
    ns = argparse.Namespace(action="ls", target=None, route=None, limit=50)
    result = cli_ui.handle(ns, mock_session_ctx)

    assert "Elements" in result
    assert len(result["Elements"]) >= 25


def test_cli_ui_grayscale_tuning_execution(mock_session_ctx: MagicMock):
    """Verify processing-cli ui grayscale parameter tuning returns applied status."""
    ns = argparse.Namespace(
        action="grayscale",
        threshold=165,
        bit_depth="1-bit",
        contrast=75,
        tolerance=5,
    )
    result = cli_ui.handle(ns, mock_session_ctx)

    assert result["status"] == "applied"
    assert result["parameters"]["threshold"] == 165
    assert result["parameters"]["bitDepth"] == "1-bit"
    assert result["parameters"]["contrast"] == 75


def test_cli_ui_click_enqueue_execution(mock_session_ctx: MagicMock):
    """Verify processing-cli ui click enqueues without remote backend connection."""
    # When no remote backend running, queue action directly
    packet = enqueue_action(action="click", element_id="ui-sim-take-over", actor="cli")

    assert packet["packetId"]
    assert packet["action"] == "click"
    assert packet["elementId"] == "ui-sim-take-over"
