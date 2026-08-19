"""Plan 90 Step 111 - GET /observability/retention route tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from BE.app.retention import RetentionOutcome
from BE.app.retention_audit import append_pass, audit_paths
from BE.main import create_app
from fastapi.testclient import TestClient


def _outcome(days: int = 30, deleted: int = 0) -> RetentionOutcome:
    return RetentionOutcome(
        RetentionDays=days,
        CutoffEpoch=1_700_000_000,
        DryRun=False,
        RunSessionsScanned=deleted,
        RunSessionsDeleted=deleted,
    )


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    logs = tmp_path / "logs"
    logs.mkdir()
    monkeypatch.setenv("APP_LOG_ROOT", str(logs))
    app = create_app()
    yield TestClient(app), logs


def _envelope_ok(resp) -> dict:
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Status"]["IsFailed"] is False
    return body["Results"][0]


def test_empty_when_no_audit_yet(client):
    c, logs = client
    resp = c.get("/observability/retention")
    assert resp.status_code == 200
    data = _envelope_ok(resp)
    assert data["items"] == []
    assert data["total"] == 0
    assert data["available"] == 0
    assert data["limit"] == 50
    assert data["hasCurrent"] is False
    assert data["hasPrevious"] is False
    cur, prev = audit_paths(logs)
    assert data["currentPath"] == str(cur)
    assert data["previousPath"] == str(prev)


def test_returns_newest_first(client):
    c, logs = client
    for i in range(1, 6):
        append_pass(logs, _outcome(deleted=i), mode="loop", pass_index=i,
                    timestamp_utc=f"2026-07-21T00:00:{i:02d}Z")
    resp = c.get("/observability/retention")
    assert resp.status_code == 200
    data = _envelope_ok(resp)
    assert data["total"] == 5
    assert data["available"] == 5
    assert data["hasCurrent"] is True
    indexes = [row["PassIndex"] for row in data["items"]]
    assert indexes == [5, 4, 3, 2, 1]


def test_limit_returns_newest_slice(client):
    c, logs = client
    for i in range(1, 11):
        append_pass(logs, _outcome(), mode="loop", pass_index=i,
                    timestamp_utc=f"2026-07-21T00:00:{i:02d}Z")
    resp = c.get("/observability/retention?limit=3")
    data = _envelope_ok(resp)
    assert data["total"] == 3
    assert data["available"] == 10
    assert [r["PassIndex"] for r in data["items"]] == [10, 9, 8]


def test_mode_filter(client):
    c, logs = client
    append_pass(logs, _outcome(), mode="single-shot", pass_index=1,
                timestamp_utc="2026-07-21T00:00:01Z")
    append_pass(logs, _outcome(), mode="loop", pass_index=1,
                timestamp_utc="2026-07-21T00:00:02Z")
    append_pass(logs, _outcome(), mode="loop", pass_index=2,
                timestamp_utc="2026-07-21T00:00:03Z")
    resp = c.get("/observability/retention?mode=loop")
    data = _envelope_ok(resp)
    assert data["total"] == 2
    assert data["available"] == 3
    assert all(r["Mode"] == "loop" for r in data["items"])


def test_bad_limit(client):
    c, _ = client
    resp = c.get("/observability/retention?limit=0")
    assert resp.status_code == 400
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_bad_limit_over_ceiling(client):
    c, _ = client
    resp = c.get("/observability/retention?limit=9999")
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_bad_mode(client):
    c, _ = client
    resp = c.get("/observability/retention?mode=Loop")
    assert resp.status_code == 400
    assert resp.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_correlation_id_echoed(client):
    c, _ = client
    resp = c.get("/observability/retention",
                 headers={"X-Correlation-Id": "test-cid-111"})
    assert resp.headers.get("X-Correlation-Id") == "test-cid-111"


def test_reads_previous_generation_after_rotation(client, monkeypatch):
    c, logs = client
    # Force rotation by shrinking the ceiling to a value smaller than one row.
    import BE.app.retention_audit as ra
    monkeypatch.setattr(ra, "_MAX_BYTES", 200)
    for i in range(1, 4):
        append_pass(logs, _outcome(), mode="loop", pass_index=i,
                    timestamp_utc=f"2026-07-21T00:00:{i:02d}Z")
    cur, prev = audit_paths(logs)
    assert prev.is_file()
    resp = c.get("/observability/retention")
    data = _envelope_ok(resp)
    assert data["hasPrevious"] is True
    # With ~350 B/row and a 200 B ceiling, each append rolls the previous
    # generation. Row 1 is lost when row 3 arrives; the endpoint must
    # surface exactly what is on disk (available=2, newest-first).
    assert data["available"] == 2
    assert [r["PassIndex"] for r in data["items"]] == [3, 2]


def test_poison_line_surfaces_not_drops(client):
    c, logs = client
    append_pass(logs, _outcome(), mode="loop", pass_index=1,
                timestamp_utc="2026-07-21T00:00:01Z")
    cur, _ = audit_paths(logs)
    with cur.open("ab") as fp:
        fp.write(b"not-json-line\n")
    append_pass(logs, _outcome(), mode="loop", pass_index=2,
                timestamp_utc="2026-07-21T00:00:02Z")
    resp = c.get("/observability/retention")
    data = _envelope_ok(resp)
    assert data["available"] == 3
    poison = [r for r in data["items"] if "_ParseError" in r]
    assert len(poison) == 1
    assert poison[0]["_Raw"] == "not-json-line"


# Plan 90 Step 112 - loop-halt filter accepted and row surfaced.

def test_mode_filter_accepts_loop_halt(client):
    from BE.app.retention_audit import append_halt
    from BE.errors.apperror import AppError
    from BE.errors.codes import ErrorCode

    c, logs = client
    append_pass(logs, _outcome(), mode="loop", pass_index=1,
                timestamp_utc="2026-07-21T10:00:00Z")
    append_halt(
        logs,
        AppError(ErrorCode.E_BE_INTERNAL, "db is locked", details={"K": "v"}),
        pass_index=2,
        timestamp_utc="2026-07-21T10:00:01Z",
    )
    resp = c.get("/observability/retention?mode=loop-halt")
    assert resp.status_code == 200
    data = _envelope_ok(resp)
    assert data["total"] == 1
    assert data["available"] == 2
    row = data["items"][0]
    assert row["Mode"] == "loop-halt"
    assert row["ErrorCode"] == "E_BE_INTERNAL"
    assert row["ErrorMessage"] == "db is locked"
    assert row["ErrorDetails"] == {"K": "v"}
    assert row["PassIndex"] == 2
