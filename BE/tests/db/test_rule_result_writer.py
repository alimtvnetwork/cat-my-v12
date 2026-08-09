"""Tests for the Step 97 RuleResult Task-DB writer."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from BE.app.db.writers import rule_result as writer
from BE.app.db.writers import run_session as rs_writer
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


def _seed_run_session(conn, run_id="01J8ZK000000000000000000AA", active=2) -> int:
    rec = {
        "SchemaVersion": 2,
        "RunSessionId": run_id,
        "Verdict": "Pass",
        "ImageFilePath": "processed/0001.jpg",
        "CapturedAt": "2026-07-21T14:00:00.000Z",
        "RuleSet": {
            "RuleCount": active,
            "ActiveCount": active,
            "InactiveCount": 0,
            "SilentCount": 0,
            "PassCount": active,
            "FailCount": 0,
            "ErrorCount": 0,
            "Rules": [],
        },
        "Judgments": [],
    }
    return rs_writer.write_run_session(conn, rec, mode="auto").RunSessionId


def _judgment(rule_id, verdict="Pass", **kw):
    j = {"RuleId": rule_id, "Verdict": verdict}
    j.update(kw)
    return j


def test_migration_creates_rule_result_table(task_conn):
    row = task_conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='RuleResult'"
    ).fetchone()
    assert row is not None
    cols = {r[1] for r in task_conn.execute("PRAGMA table_info(RuleResult)").fetchall()}
    for expected in (
        "RuleResultId", "RunSessionId", "RuleId", "Verdict",
        "IsSilent", "ReasonCode", "ErrorCode", "ElapsedMs",
        "MetricsJson", "OrderIndex", "PersistedAt",
    ):
        assert expected in cols, f"missing column {expected}"


def test_happy_path_batch_insert(task_conn):
    rs_id = _seed_run_session(task_conn)
    out = writer.write_rule_results(
        task_conn,
        run_session_id=rs_id,
        judgments=[
            _judgment("r1", "Pass", ElapsedMs=1.5, RuleKind="PresenceAbsence"),
            _judgment("r2", "Fail", ReasonCode="RuleBelowThreshold"),
        ],
    )
    assert out.InsertedCount == 2
    assert out.SkippedCount == 0
    assert len(out.Rows) == 2
    assert all(r.RuleResultId > 0 for r in out.Rows)
    assert all(r.WasInserted for r in out.Rows)


def test_idempotent_replay(task_conn):
    rs_id = _seed_run_session(task_conn)
    payload = [_judgment("r1", "Pass"), _judgment("r2", "Fail")]
    a = writer.write_rule_results(task_conn, run_session_id=rs_id, judgments=payload)
    b = writer.write_rule_results(task_conn, run_session_id=rs_id, judgments=payload)
    assert a.InsertedCount == 2
    assert b.InsertedCount == 0
    assert b.SkippedCount == 2
    assert [r.RuleResultId for r in a.Rows] == [r.RuleResultId for r in b.Rows]
    total = task_conn.execute("SELECT COUNT(*) FROM RuleResult").fetchone()[0]
    assert total == 2


def test_lowercase_camelcase_fields_accepted(task_conn):
    rs_id = _seed_run_session(task_conn)
    out = writer.write_rule_results(
        task_conn, run_session_id=rs_id,
        judgments=[{
            "ruleId": "r1",
            "verdict": "Fail",
            "reasonCode": "RuleBelowThreshold",
            "reasonMessage": "match too low",
            "elapsedMs": 3.14,
            "isSilent": False,
            "regionId": "reg-1",
            "metrics": {"measured": {"matchPercent": 41.0}},
        }],
    )
    assert out.InsertedCount == 1
    row = task_conn.execute(
        "SELECT RuleId, Verdict, ReasonCode, ReasonMessage, ElapsedMs, RegionId, MetricsJson "
        "FROM RuleResult WHERE RunSessionId=?", (rs_id,),
    ).fetchone()
    assert row[0] == "r1"
    assert row[1] == "Fail"
    assert row[2] == "RuleBelowThreshold"
    assert row[3] == "match too low"
    assert abs(row[4] - 3.14) < 1e-9
    assert row[5] == "reg-1"
    assert '"matchPercent"' in row[6]


def test_bad_verdict_rejected(task_conn):
    rs_id = _seed_run_session(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=[_judgment("r1", "Weird")],
        )
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_missing_rule_id_rejected(task_conn):
    rs_id = _seed_run_session(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=[{"Verdict": "Pass"}],
        )
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_duplicate_rule_id_within_batch_rejected(task_conn):
    rs_id = _seed_run_session(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=[_judgment("r1", "Pass"), _judgment("r1", "Fail")],
        )
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_partial_batch_is_atomic_on_bad_row(task_conn):
    rs_id = _seed_run_session(task_conn)
    with pytest.raises(AppError):
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=[_judgment("r1", "Pass"), _judgment("r2", "Bogus")],
        )
    total = task_conn.execute("SELECT COUNT(*) FROM RuleResult").fetchone()[0]
    assert total == 0


def test_unknown_parent_returns_not_found(task_conn):
    with pytest.raises(AppError) as ei:
        writer.write_rule_results(
            task_conn, run_session_id=9999,
            judgments=[_judgment("r1", "Pass")],
        )
    assert ei.value.code == ErrorCode.E_BE_NOT_FOUND


def test_negative_or_nonint_run_session_id_rejected(task_conn):
    with pytest.raises(AppError):
        writer.write_rule_results(task_conn, run_session_id=0, judgments=[])
    with pytest.raises(AppError):
        writer.write_rule_results(task_conn, run_session_id=True, judgments=[])  # type: ignore[arg-type]


def test_elapsed_ms_negative_rejected(task_conn):
    rs_id = _seed_run_session(task_conn)
    with pytest.raises(AppError):
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=[_judgment("r1", "Pass", ElapsedMs=-1.0)],
        )


def test_elapsed_ms_bool_rejected(task_conn):
    rs_id = _seed_run_session(task_conn)
    with pytest.raises(AppError):
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=[_judgment("r1", "Pass", ElapsedMs=True)],
        )


def test_error_code_from_details_persists(task_conn):
    rs_id = _seed_run_session(task_conn)
    out = writer.write_rule_results(
        task_conn, run_session_id=rs_id,
        judgments=[_judgment("r1", "Error", Details={"ErrorCode": "E_RULE_TIMEOUT",
                                                     "RuleKind": "PresenceAbsence"})],
    )
    assert out.Rows[0].ErrorCode == "E_RULE_TIMEOUT"
    row = task_conn.execute(
        "SELECT ErrorCode, RuleKind FROM RuleResult WHERE RunSessionId=?", (rs_id,),
    ).fetchone()
    assert row == ("E_RULE_TIMEOUT", "PresenceAbsence")


def test_rule_ordering_applied(task_conn):
    rs_id = _seed_run_session(task_conn)
    writer.write_rule_results(
        task_conn, run_session_id=rs_id,
        judgments=[_judgment("r1", "Pass"), _judgment("r2", "Pass")],
        rule_ordering={"r1": 10, "r2": 20},
    )
    rows = task_conn.execute(
        "SELECT RuleId, OrderIndex FROM RuleResult "
        "WHERE RunSessionId=? ORDER BY OrderIndex ASC", (rs_id,),
    ).fetchall()
    assert rows == [("r1", 10), ("r2", 20)]


def test_metrics_json_serialized_sorted(task_conn):
    rs_id = _seed_run_session(task_conn)
    writer.write_rule_results(
        task_conn, run_session_id=rs_id,
        judgments=[_judgment("r1", "Pass",
                             Metrics={"z": 1, "a": 2, "m": {"y": 3, "b": 4}})],
    )
    js = task_conn.execute(
        "SELECT MetricsJson FROM RuleResult WHERE RunSessionId=?", (rs_id,),
    ).fetchone()[0]
    assert js == '{"a":2,"m":{"b":4,"y":3},"z":1}'


def test_non_dict_judgment_rejected(task_conn):
    rs_id = _seed_run_session(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=["not-a-dict"],  # type: ignore[list-item]
        )
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_cascade_delete_removes_children(task_conn):
    task_conn.execute("PRAGMA foreign_keys = ON")
    rs_id = _seed_run_session(task_conn)
    writer.write_rule_results(
        task_conn, run_session_id=rs_id,
        judgments=[_judgment("r1", "Pass")],
    )
    task_conn.execute("DELETE FROM RunSession WHERE RunSessionId=?", (rs_id,))
    task_conn.commit()
    left = task_conn.execute(
        "SELECT COUNT(*) FROM RuleResult WHERE RunSessionId=?", (rs_id,),
    ).fetchone()[0]
    assert left == 0


def test_db_error_surfaces_as_e_be_internal(task_conn):
    rs_id = _seed_run_session(task_conn)
    task_conn.execute("DROP TABLE RuleResult")
    with pytest.raises(AppError) as ei:
        writer.write_rule_results(
            task_conn, run_session_id=rs_id,
            judgments=[_judgment("r1", "Pass")],
        )
    assert ei.value.code == ErrorCode.E_BE_INTERNAL
    assert "SqliteError" in (ei.value.details or {})


def test_writer_module_stays_task_tier_only():
    src = Path(writer.__file__).read_text(encoding="utf-8")
    assert "get_root_conn" not in src
    assert "get_rules_conn" not in src
