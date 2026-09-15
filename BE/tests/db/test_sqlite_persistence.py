"""Day 1 MVP SQLite persistence tests for RootDb and TaskDb."""

from __future__ import annotations

import sqlite3
from pathlib import Path
import pytest

from BE.app.domain.rule_set import DraftMeta, RuleItem, RuleSetEnvelope, Shape, Tolerance
from BE.db.connections import get_root_conn, get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.repos.sqlite_rules_repo import SqliteRulesRepo
from BE.repos.sqlite_results_repo import SqliteResultsRepo

ROOT_MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations" / "root"
TASK_MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations" / "task"


def _apply_migrations(conn: sqlite3.Connection, folder: Path) -> None:
    for sql_file in sorted(folder.glob("*.sql")):
        conn.executescript(sql_file.read_text(encoding="utf-8"))


@pytest.fixture
def clean_db_env(tmp_path, monkeypatch):
    db_root = tmp_path / "db"
    db_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("APP_DB_ROOT", str(db_root))

    # Bootstrap both Root and Task tiers
    root_c = get_root_conn()
    _apply_migrations(root_c, ROOT_MIGRATIONS)
    root_c.close()

    task_c = get_task_conn()
    _apply_migrations(task_c, TASK_MIGRATIONS)
    task_c.close()

    return db_root


def _make_sample_envelope(rule_set_id: int = 1, version: int = 0, name: str = "Test Recipe") -> RuleSetEnvelope:
    return RuleSetEnvelope(
        SchemaVersion=1,
        RuleSetId=rule_set_id,
        Name=name,
        Version=version,
        Enabled=True,
        Rules=[
            RuleItem(
                Id=101,
                Kind="presence",
                Enabled=True,
                Shape=Shape(Type="rect", X=10.0, Y=20.0, W=100.0, H=50.0, CanvasWidth=1920.0, CanvasHeight=1080.0),
                Tolerance=Tolerance(Kind="pct", Value=5.0),
                Params={"threshold": 128},
            )
        ],
        DraftMeta=DraftMeta(ClientId="client-alpha", UpdatedAt="2026-09-15T12:00:00.000Z", Origin="indexeddb"),
    )


# ==============================================================================
# RootDb (T-01) Recipe Persistence Tests
# ==============================================================================

def test_rootdb_save_load_update_and_reconnection(clean_db_env) -> None:
    repo = SqliteRulesRepo()
    env = _make_sample_envelope(rule_set_id=42, version=0, name="Inspection Part A")

    # 1. Save recipe
    saved = repo.save_rule_set(env)
    assert saved.RuleSetId == 42
    assert saved.Version == 1
    assert saved.DraftMeta.Origin == "server"

    # 2. Recreate repository to simulate process restart / separate connection
    fresh_repo = SqliteRulesRepo()
    loaded = fresh_repo.get_rule_set(42)
    assert loaded.RuleSetId == 42
    assert loaded.Name == "Inspection Part A"
    assert loaded.Version == 1
    assert loaded.Enabled is True
    assert len(loaded.Rules) == 1
    assert loaded.Rules[0].Shape.X == 10.0
    assert loaded.Rules[0].Shape.CanvasWidth == 1920.0
    assert loaded.Rules[0].Params == {"threshold": 128}

    # 3. Update recipe with new version
    updated_input = _make_sample_envelope(rule_set_id=42, version=1, name="Inspection Part A v2")
    updated = fresh_repo.save_rule_set(updated_input)
    assert updated.Version == 2
    assert updated.Name == "Inspection Part A v2"

    # Reload to verify update was durable
    reloaded = fresh_repo.get_rule_set(42)
    assert reloaded.Version == 2
    assert reloaded.Name == "Inspection Part A v2"


def test_rootdb_save_conflict_detection(clean_db_env) -> None:
    repo = SqliteRulesRepo()
    env = _make_sample_envelope(rule_set_id=10, version=0)
    repo.save_rule_set(env)  # version becomes 1

    # Client tries to save with stale version 0 when server is at 1
    stale_env = _make_sample_envelope(rule_set_id=10, version=0)
    with pytest.raises(AppError) as exc_info:
        repo.save_rule_set(stale_env)
    assert exc_info.value.code == ErrorCode.E_BE_CONFLICT


def test_rootdb_multiple_records(clean_db_env) -> None:
    repo = SqliteRulesRepo()
    env1 = _make_sample_envelope(rule_set_id=1, name="Part 1")
    env2 = _make_sample_envelope(rule_set_id=2, name="Part 2")

    repo.save_rule_set(env1)
    repo.save_rule_set(env2)

    loaded1 = repo.get_rule_set(1)
    loaded2 = repo.get_rule_set(2)
    assert loaded1.Name == "Part 1"
    assert loaded2.Name == "Part 2"


def test_rootdb_not_found_raises_apperror(clean_db_env) -> None:
    repo = SqliteRulesRepo()
    with pytest.raises(AppError) as exc_info:
        repo.get_rule_set(9999)
    assert exc_info.value.code == ErrorCode.E_BE_NOT_FOUND


def test_rootdb_internal_error_raises_apperror(clean_db_env, monkeypatch) -> None:
    repo = SqliteRulesRepo()
    # Force an execute failure to verify AppError(ErrorCode.E_BE_INTERNAL)
    def broken_execute(*args, **kwargs):
        raise sqlite3.OperationalError("disk I/O error simulated")

    monkeypatch.setattr(repo.conn, "execute", broken_execute)
    with pytest.raises(AppError) as exc_info:
        repo.get_rule_set(1)
    assert exc_info.value.code == ErrorCode.E_BE_INTERNAL
    assert "disk I/O error simulated" in exc_info.value.message


# ==============================================================================
# TaskDb (T-02 Phase A) Results Persistence Tests
# ==============================================================================

def test_taskdb_run_frame_result_lifecycle(clean_db_env) -> None:
    repo = SqliteResultsRepo()
    run_id = "01J8ZK000000000000000000R1"
    task_id = "recipe_42"

    # 1. Create RunSession
    session_id = repo.create_run_session(run_id=run_id, task_id=task_id, mode="auto", verdict="Pass")
    assert session_id is not None
    assert session_id > 0

    # 2. Create Frame with underlying Capture
    frame_id = repo.create_frame(run_id=run_id, frame_index=0, width=1920, height=1080)
    assert frame_id is not None
    assert frame_id > 0

    # 3. Save Result referencing the valid FrameId
    result_id = repo.save_result(
        run_id=run_id,
        frame_id=frame_id,
        bundle_id=42,
        bundle_version=1,
        decision="PASS",
        score_percent=98.5,
        duration_ms=45,
    )
    assert result_id is not None
    assert result_id > 0

    # 4. Recreate repository and read persisted records
    fresh_repo = SqliteResultsRepo()
    sessions = fresh_repo.get_run_sessions(limit=5)
    assert any(s["RunId"] == run_id and s["TaskId"] == task_id for s in sessions)

    results = fresh_repo.get_results_for_run(run_id)
    assert len(results) == 1
    r = results[0]
    assert r["ResultId"] == result_id
    assert r["RunId"] == run_id
    assert r["FrameId"] == frame_id
    assert r["Decision"] == "PASS"
    assert r["ScorePercent"] == 98.5
    assert r["DurationMs"] == 45


def test_taskdb_foreign_key_violation_raises_apperror(clean_db_env) -> None:
    repo = SqliteResultsRepo()
    # Attempt to insert a result referencing non-existent FrameId=99999
    with pytest.raises(AppError) as exc_info:
        repo.save_result(run_id="bad_run", frame_id=99999, decision="FAIL")
    assert exc_info.value.code == ErrorCode.E_BE_INTERNAL
    assert "FOREIGN KEY" in exc_info.value.message


def test_taskdb_internal_error_raises_apperror(clean_db_env, monkeypatch) -> None:
    repo = SqliteResultsRepo()
    def broken_execute(*args, **kwargs):
        raise sqlite3.OperationalError("simulated task db failure")

    monkeypatch.setattr(repo.conn, "execute", broken_execute)
    with pytest.raises(AppError) as exc_info:
        repo.create_run_session("dummy_run")
    assert exc_info.value.code == ErrorCode.E_BE_INTERNAL
    assert "simulated task db failure" in exc_info.value.message
