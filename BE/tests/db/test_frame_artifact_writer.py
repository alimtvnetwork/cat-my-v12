"""Tests for the Step 98 FrameArtifact Task-DB writer."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from BE.app.db.writers import frame_artifact as writer
from BE.app.db.writers import rule_result as rr_writer
from BE.app.db.writers import run_session as rs_writer
from BE.db.connections import get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations" / "task"

SHA_A = "a" * 64
SHA_B = "b" * 64
SHA_C = "c" * 64


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


def _seed_run(conn, run_id="01J8ZK000000000000000000AA", active=2) -> int:
    rec = {
        "SchemaVersion": 2,
        "RunSessionId": run_id,
        "Verdict": "Pass",
        "ImageFilePath": "processed/0001.jpg",
        "CapturedAt": "2026-07-21T14:00:00.000Z",
        "RuleSet": {
            "RuleCount": active, "ActiveCount": active,
            "InactiveCount": 0, "SilentCount": 0,
            "PassCount": active, "FailCount": 0, "ErrorCount": 0, "Rules": [],
        },
        "Judgments": [],
    }
    return rs_writer.write_run_session(conn, rec, mode="auto").RunSessionId


def _seed_rule_result(conn, rs_id, rule_id="r1") -> int:
    out = rr_writer.write_rule_results(
        conn, run_session_id=rs_id,
        judgments=[{"RuleId": rule_id, "Verdict": "Fail"}],
    )
    return out.Rows[0].RuleResultId


def _art(rel, kind="RoiCrop", sha=SHA_A, size=1024, **kw):
    a = {"RelPath": rel, "ArtifactKind": kind, "Sha256": sha, "Bytes": size}
    a.update(kw)
    return a


# -------- migration + shape --------

def test_migration_creates_frame_artifact_table(task_conn):
    row = task_conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='FrameArtifact'"
    ).fetchone()
    assert row is not None
    cols = {r[1] for r in task_conn.execute("PRAGMA table_info(FrameArtifact)").fetchall()}
    for expected in (
        "FrameArtifactId", "RunSessionId", "RuleResultId", "ArtifactKind",
        "RelPath", "Sha256", "Bytes", "MimeType", "CapturedAt", "PersistedAt",
    ):
        assert expected in cols, f"missing column {expected}"


# -------- happy path + idempotency --------

def test_happy_path_batch(task_conn):
    rs = _seed_run(task_conn)
    rr = _seed_rule_result(task_conn, rs)
    out = writer.write_frame_artifacts(
        task_conn, run_session_id=rs, artifacts=[
            _art("artifacts/r1/roi.png", RuleResultId=rr),
            _art("artifacts/r1/overlay.png", kind="Overlay", sha=SHA_B, size=2048, RuleResultId=rr, MimeType="image/png"),
            _art("artifacts/source.jpg", kind="SourceFrame", sha=SHA_C, size=4096),
        ],
    )
    assert out.InsertedCount == 3
    assert out.SkippedCount == 0
    assert all(r.WasInserted for r in out.Rows)
    assert all(r.FrameArtifactId > 0 for r in out.Rows)


def test_idempotent_replay(task_conn):
    rs = _seed_run(task_conn)
    batch = [_art("artifacts/x.png")]
    out1 = writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=batch)
    out2 = writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=batch)
    assert out1.InsertedCount == 1 and out2.InsertedCount == 0
    assert out2.SkippedCount == 1
    assert out1.Rows[0].FrameArtifactId == out2.Rows[0].FrameArtifactId
    assert out2.Rows[0].WasInserted is False


def test_camelcase_aliases(task_conn):
    rs = _seed_run(task_conn)
    out = writer.write_frame_artifacts(
        task_conn, run_session_id=rs, artifacts=[
            {"relPath": "a/b.png", "kind": "RoiCrop", "sha256": SHA_A, "bytes": 10, "mimeType": "image/png"},
        ],
    )
    assert out.InsertedCount == 1
    row = task_conn.execute(
        "SELECT ArtifactKind, MimeType FROM FrameArtifact WHERE FrameArtifactId=?",
        (out.Rows[0].FrameArtifactId,),
    ).fetchone()
    assert row[0] == "RoiCrop" and row[1] == "image/png"


# -------- validation --------

def test_reject_bad_kind(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png", kind="Bogus")])
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_reject_bad_sha(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png", sha="short")])
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_reject_absolute_path(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("/etc/passwd")])
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_reject_dotdot_path(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a/../b.png")])


def test_reject_backslash_path(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a\\b.png")])


def test_reject_negative_bytes(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png", size=-1)])


def test_reject_bool_bytes(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png", size=True)])


def test_reject_duplicate_relpath_in_batch(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[
            _art("dup.png"), _art("dup.png", sha=SHA_B),
        ])
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_mid_batch_failure_is_atomic(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[
            _art("good.png"), _art("bad.png", kind="Bogus"),
        ])
    cnt = task_conn.execute("SELECT COUNT(*) FROM FrameArtifact WHERE RunSessionId=?", (rs,)).fetchone()[0]
    assert cnt == 0


# -------- parent + FK linkage --------

def test_unknown_run_session_returns_not_found(task_conn):
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=9999, artifacts=[_art("a.png")])
    assert ei.value.code == ErrorCode.E_BE_NOT_FOUND


def test_unknown_rule_result_returns_not_found(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png", RuleResultId=424242)])
    assert ei.value.code == ErrorCode.E_BE_NOT_FOUND


def test_rule_result_belonging_to_other_run_rejected(task_conn):
    rs1 = _seed_run(task_conn, run_id="01J8ZK000000000000000000AA")
    rs2 = _seed_run(task_conn, run_id="01J8ZK000000000000000000BB")
    rr_of_rs2 = _seed_rule_result(task_conn, rs2)
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=rs1, artifacts=[_art("a.png", RuleResultId=rr_of_rs2)])
    assert ei.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_cascade_from_run_session(task_conn):
    rs = _seed_run(task_conn)
    writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png"), _art("b.png", sha=SHA_B)])
    task_conn.execute("DELETE FROM RunSession WHERE RunSessionId=?", (rs,))
    task_conn.commit()
    cnt = task_conn.execute("SELECT COUNT(*) FROM FrameArtifact WHERE RunSessionId=?", (rs,)).fetchone()[0]
    assert cnt == 0


def test_cascade_from_rule_result(task_conn):
    rs = _seed_run(task_conn)
    rr = _seed_rule_result(task_conn, rs)
    writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png", RuleResultId=rr)])
    task_conn.execute("DELETE FROM RuleResult WHERE RuleResultId=?", (rr,))
    task_conn.commit()
    cnt = task_conn.execute("SELECT COUNT(*) FROM FrameArtifact WHERE RunSessionId=?", (rs,)).fetchone()[0]
    assert cnt == 0


# -------- input guards --------

def test_reject_zero_run_session_id(task_conn):
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=0, artifacts=[])


def test_reject_bool_run_session_id(task_conn):
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=True, artifacts=[])


def test_reject_non_mapping_artifact(task_conn):
    rs = _seed_run(task_conn)
    with pytest.raises(AppError):
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=["nope"])


def test_empty_batch_no_op(task_conn):
    rs = _seed_run(task_conn)
    out = writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[])
    assert out.InsertedCount == 0 and out.SkippedCount == 0 and out.Rows == ()


def test_db_error_surfaces_internal(task_conn):
    rs = _seed_run(task_conn)
    task_conn.execute("DROP TABLE FrameArtifact")
    task_conn.commit()
    with pytest.raises(AppError) as ei:
        writer.write_frame_artifacts(task_conn, run_session_id=rs, artifacts=[_art("a.png")])
    assert ei.value.code == ErrorCode.E_BE_INTERNAL


def test_sha256_lowercased(task_conn):
    rs = _seed_run(task_conn)
    out = writer.write_frame_artifacts(
        task_conn, run_session_id=rs,
        artifacts=[_art("a.png", sha="A" * 64)],
    )
    row = task_conn.execute(
        "SELECT Sha256 FROM FrameArtifact WHERE FrameArtifactId=?",
        (out.Rows[0].FrameArtifactId,),
    ).fetchone()
    assert row[0] == "a" * 64
