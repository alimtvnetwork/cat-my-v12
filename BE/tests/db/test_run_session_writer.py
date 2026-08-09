"""Tests for the Step 96 RunSession Task-DB writer.

Guards the invariants downstream steps depend on:
  * Migration 0025 applies cleanly to a fresh Task-tier DB.
  * Happy-path insert returns WasInserted=True and a positive RowId.
  * Idempotent replay: same RunId => WasInserted=False, same RowId.
  * Counter invariants (spec 24 §3) rejected at the Python boundary with
    E_BE_BAD_REQUEST (not the raw sqlite CHECK failure).
  * Missing / wrong-typed required fields raise E_BE_BAD_REQUEST.
  * Timeout ErrorCode in a judgment bumps TimeoutCount and PromotedErrorCode.
  * DB errors surface as E_BE_INTERNAL, never silently.
  * Tier isolation: writer module does not import Root/Rules connection
    factories (grep-based to catch drift).
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from BE.app.db.writers import run_session as writer
from BE.db.connections import get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations" / "task"


def _apply_task_migrations(conn: sqlite3.Connection) -> None:
    for path in sorted(MIGRATIONS.glob("*.sql")):
        conn.executescript(path.read_text(encoding="utf-8"))


@pytest.fixture
def task_conn(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DB_ROOT", str(tmp_path / "db"))
    conn = get_task_conn()
    _apply_task_migrations(conn)
    yield conn
    conn.close()


def _base_record(**overrides):
    rec = {
        "SchemaVersion": 2,
        "RunSessionId": "01J8ZK000000000000000000AA",
        "Verdict": "Pass",
        "ImageFilePath": "processed/0001.jpg",
        "CapturedAt": "2026-07-21T14:00:00.000Z",
        "RuleSet": {
            "RuleCount": 3,
            "ActiveCount": 2,
            "InactiveCount": 1,
            "SilentCount": 0,
            "PassCount": 2,
            "FailCount": 0,
            "ErrorCount": 0,
            "Rules": [],
        },
        "Judgments": [],
    }
    rec.update(overrides)
    return rec


def test_migration_creates_run_session_table(task_conn):
    row = task_conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='RunSession'"
    ).fetchone()
    assert row is not None
    cols = {r[1] for r in task_conn.execute("PRAGMA table_info(RunSession)").fetchall()}
    for expected in (
        "RunSessionId", "RunId", "TaskId", "Verdict", "Mode",
        "RuleCount", "ActiveCount", "PassCount", "FailCount", "ErrorCount",
        "TimeoutCount", "PromotedErrorCode", "CapturedAt", "PersistedAt",
    ):
        assert expected in cols, f"missing column {expected}"


def test_happy_path_insert_returns_positive_id(task_conn):
    out = writer.write_run_session(task_conn, _base_record(), mode="auto")
    assert out.WasInserted is True
    assert out.RunSessionId > 0
    assert out.RunId == "01J8ZK000000000000000000AA"
    assert out.TimeoutCount == 0
    assert out.PromotedErrorCode is None


def test_captured_at_iso_parses_to_epoch(task_conn):
    writer.write_run_session(task_conn, _base_record(), mode="auto")
    row = task_conn.execute(
        "SELECT CapturedAt FROM RunSession WHERE RunId=?",
        ("01J8ZK000000000000000000AA",),
    ).fetchone()
    assert isinstance(row[0], int) and row[0] > 0


def test_idempotent_replay_returns_same_row(task_conn):
    rec = _base_record()
    a = writer.write_run_session(task_conn, rec, mode="auto")
    b = writer.write_run_session(task_conn, rec, mode="auto")
    assert a.RunSessionId == b.RunSessionId
    assert a.WasInserted is True
    assert b.WasInserted is False
    count = task_conn.execute("SELECT COUNT(*) FROM RunSession").fetchone()[0]
    assert count == 1


def test_bad_verdict_rejected(task_conn):
    rec = _base_record(Verdict="Weird")
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, rec, mode="auto")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_missing_run_id_rejected(task_conn):
    rec = _base_record()
    rec["RunSessionId"] = ""
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, rec, mode="auto")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_missing_rule_set_rejected(task_conn):
    rec = _base_record()
    del rec["RuleSet"]
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, rec, mode="auto")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_counter_active_plus_inactive_plus_silent_must_equal_total(task_conn):
    rec = _base_record()
    rec["RuleSet"]["InactiveCount"] = 5  # breaks the sum
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, rec, mode="auto")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST
    assert "ActiveCount + InactiveCount" in str(ei.value)


def test_counter_pass_plus_fail_plus_error_must_equal_active(task_conn):
    rec = _base_record()
    rec["RuleSet"]["PassCount"] = 99  # breaks the second invariant
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, rec, mode="auto")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_bool_masquerading_as_int_rejected(task_conn):
    rec = _base_record()
    rec["RuleSet"]["RuleCount"] = True  # isinstance(True, int) is True
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, rec, mode="auto")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_missing_mode_rejected(task_conn):
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, _base_record(), mode="")
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_timeout_judgment_bumps_timeout_count_and_promotes(task_conn):
    rec = _base_record(
        Verdict="Error",
        RuleSet={
            "RuleCount": 1, "ActiveCount": 1, "InactiveCount": 0, "SilentCount": 0,
            "PassCount": 0, "FailCount": 0, "ErrorCount": 1, "Rules": [],
        },
        Judgments=[
            {
                "RuleId": "r1", "Verdict": "Error",
                "Details": {
                    "LatencyMs": 1200.0, "RuleKind": "PresenceAbsence",
                    "ErrorCode": "E_RULE_TIMEOUT",
                },
            }
        ],
    )
    out = writer.write_run_session(task_conn, rec, mode="auto")
    assert out.TimeoutCount == 1
    assert out.PromotedErrorCode == "E_RULE_TIMEOUT"
    row = task_conn.execute(
        "SELECT TimeoutCount, PromotedErrorCode FROM RunSession WHERE RunId=?",
        (rec["RunSessionId"],),
    ).fetchone()
    assert row == (1, "E_RULE_TIMEOUT")


def test_db_error_surfaces_as_e_be_internal(task_conn):
    # Drop the table to force the INSERT to fail; the writer must convert.
    task_conn.execute("DROP TABLE RunSession")
    with pytest.raises(AppError) as ei:
        writer.write_run_session(task_conn, _base_record(), mode="auto")
    assert ei.value.code == ErrorCode.E_BE_INTERNAL
    assert "SqliteError" in (ei.value.details or {})


def test_results_jsonl_path_persists(task_conn):
    out = writer.write_run_session(
        task_conn, _base_record(), mode="auto",
        results_jsonl_path="/var/results/x.jsonl",
    )
    row = task_conn.execute(
        "SELECT ResultsJsonlPath FROM RunSession WHERE RunSessionId=?",
        (out.RunSessionId,),
    ).fetchone()
    assert row[0] == "/var/results/x.jsonl"


def test_writer_module_stays_task_tier_only():
    src = Path(writer.__file__).read_text(encoding="utf-8")
    assert "get_root_conn" not in src, "Task-tier writer must not import Root conn"
    assert "get_rules_conn" not in src, "Task-tier writer must not import Rules conn"
