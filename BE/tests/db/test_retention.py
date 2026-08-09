"""Tests for the Step 101 Task-DB retention pass (`BE/app/retention.py`)."""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

import pytest

from BE.app import retention
from BE.app.db.writers import frame_artifact as fa_writer
from BE.app.db.writers import rule_result as rr_writer
from BE.app.db.writers import run_session as rs_writer
from BE.db.connections import get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations" / "task"

SHA_A = "a" * 64
SHA_B = "b" * 64


def _apply(conn: sqlite3.Connection) -> None:
    for path in sorted(MIGRATIONS.glob("*.sql")):
        conn.executescript(path.read_text(encoding="utf-8"))


@pytest.fixture
def task_conn(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DB_ROOT", str(tmp_path / "db"))
    conn = get_task_conn()
    _apply(conn)
    yield conn
    conn.close()


@pytest.fixture
def results_root(tmp_path):
    root = tmp_path / "results"
    root.mkdir()
    return root


def _seed_run(conn, run_id, active=1, jsonl_path=None):
    rec = {
        "SchemaVersion": 2,
        "RunSessionId": run_id,
        "Verdict": "Pass",
        "ImageFilePath": "processed/x.jpg",
        "CapturedAt": "2026-07-21T14:00:00.000Z",
        "RuleSet": {
            "RuleCount": active, "ActiveCount": active,
            "InactiveCount": 0, "SilentCount": 0,
            "PassCount": active, "FailCount": 0, "ErrorCount": 0, "Rules": [],
        },
        "Judgments": [],
    }
    return rs_writer.write_run_session(
        conn, rec, mode="auto", results_jsonl_path=jsonl_path,
    ).RunSessionId


def _seed_rr(conn, rs_id, rule_id="r1"):
    out = rr_writer.write_rule_results(
        conn, run_session_id=rs_id,
        judgments=[{"RuleId": rule_id, "Verdict": "Pass"}],
    )
    return out.Rows[0].RuleResultId


def _seed_artifact(conn, rs_id, rr_id, root, rel="artifacts/roi.png", sha=SHA_A, size=1024):
    fp = root / rel
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_bytes(b"x" * size)
    fa_writer.write_frame_artifacts(
        conn, run_session_id=rs_id,
        artifacts=[{
            "RelPath": rel, "ArtifactKind": "RoiCrop",
            "Sha256": sha, "Bytes": size, "RuleResultId": rr_id,
        }],
    )
    return fp


def _age_row(conn, rs_id, epoch):
    conn.execute("UPDATE RunSession SET PersistedAt=? WHERE RunSessionId=?",
                 (int(epoch), rs_id))


# ---------- input validation ----------

def test_rejects_zero_retention_days(task_conn, results_root):
    with pytest.raises(AppError) as exc:
        retention.run_retention(task_conn, results_root=results_root, retention_days=0)
    assert exc.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_rejects_negative_retention_days(task_conn, results_root):
    with pytest.raises(AppError) as exc:
        retention.run_retention(task_conn, results_root=results_root, retention_days=-1)
    assert exc.value.code == ErrorCode.E_BE_BAD_REQUEST


def test_missing_table_raises_be_internal(tmp_path, monkeypatch, results_root):
    # Task-DB opened but migrations NOT applied.
    monkeypatch.setenv("APP_DB_ROOT", str(tmp_path / "empty_db"))
    conn = get_task_conn()
    with pytest.raises(AppError) as exc:
        retention.run_retention(conn, results_root=results_root, retention_days=1)
    assert exc.value.code == ErrorCode.E_BE_INTERNAL
    assert "bootstrap" in str(exc.value.details).lower()
    conn.close()


# ---------- happy path ----------

def test_empty_db_is_noop(task_conn, results_root):
    out = retention.run_retention(task_conn, results_root=results_root, retention_days=30)
    assert out.RunSessionsScanned == 0
    assert out.RunSessionsDeleted == 0
    assert out.ArtifactsUnlinked == 0


def test_fresh_rows_are_not_purged(task_conn, results_root):
    rs = _seed_run(task_conn, "01J8ZK000000000000000000AA")
    rr = _seed_rr(task_conn, rs)
    _seed_artifact(task_conn, rs, rr, results_root)
    now = int(time.time())
    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    assert out.RunSessionsScanned == 0
    assert out.RunSessionsDeleted == 0
    assert task_conn.execute("SELECT COUNT(*) FROM RunSession").fetchone()[0] == 1


def test_expired_rows_are_purged_and_files_unlinked(task_conn, results_root):
    now = int(time.time())
    rs = _seed_run(task_conn, "01J8ZK000000000000000000AA")
    rr = _seed_rr(task_conn, rs)
    fp = _seed_artifact(task_conn, rs, rr, results_root, size=2048)
    _age_row(task_conn, rs, now - 40 * 86400)

    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    assert out.RunSessionsScanned == 1
    assert out.RunSessionsDeleted == 1
    assert out.ArtifactsUnlinked == 1
    assert out.BytesReclaimed == 2048
    assert not fp.exists()
    assert task_conn.execute("SELECT COUNT(*) FROM RunSession").fetchone()[0] == 0
    # Cascade check: RuleResult + FrameArtifact both gone.
    assert task_conn.execute("SELECT COUNT(*) FROM RuleResult").fetchone()[0] == 0
    assert task_conn.execute("SELECT COUNT(*) FROM FrameArtifact").fetchone()[0] == 0


def test_dry_run_does_not_delete_or_unlink(task_conn, results_root):
    now = int(time.time())
    rs = _seed_run(task_conn, "01J8ZK000000000000000000AA")
    rr = _seed_rr(task_conn, rs)
    fp = _seed_artifact(task_conn, rs, rr, results_root, size=1024)
    _age_row(task_conn, rs, now - 40 * 86400)

    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30,
        now_epoch=now, dry_run=True,
    )
    assert out.DryRun is True
    assert out.RunSessionsScanned == 1
    assert out.RunSessionsDeleted == 1  # theoretical
    assert out.ArtifactsUnlinked == 1  # theoretical
    assert out.BytesReclaimed == 1024
    # Nothing actually changed.
    assert fp.exists()
    assert task_conn.execute("SELECT COUNT(*) FROM RunSession").fetchone()[0] == 1


def test_missing_file_is_idempotent(task_conn, results_root):
    now = int(time.time())
    rs = _seed_run(task_conn, "01J8ZK000000000000000000AA")
    rr = _seed_rr(task_conn, rs)
    fp = _seed_artifact(task_conn, rs, rr, results_root)
    fp.unlink()  # simulate operator-deleted file
    _age_row(task_conn, rs, now - 40 * 86400)

    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    # Missing file counts as unlinked; no failure recorded.
    assert out.ArtifactsUnlinked == 1
    assert out.UnlinkFailures == ()
    assert out.RunSessionsDeleted == 1


def test_jsonl_sidecar_is_unlinked(task_conn, results_root, tmp_path):
    now = int(time.time())
    sidecar = tmp_path / "sidecar.jsonl"
    sidecar.write_text("{}\n")
    rs = _seed_run(task_conn, "01J8ZK000000000000000000AA", jsonl_path=str(sidecar))
    _age_row(task_conn, rs, now - 40 * 86400)

    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    assert out.JsonlSidecarsUnlinked == 1
    assert not sidecar.exists()


def test_partitioning_only_expired_deleted(task_conn, results_root):
    now = int(time.time())
    rs_old = _seed_run(task_conn, "01J8ZK000000000000000000AA")
    rs_new = _seed_run(task_conn, "01J8ZK000000000000000000BB")
    _age_row(task_conn, rs_old, now - 40 * 86400)
    # rs_new stays fresh.
    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    assert out.RunSessionsDeleted == 1
    remaining = task_conn.execute(
        "SELECT RunSessionId FROM RunSession"
    ).fetchall()
    assert remaining == [(rs_new,)]


# ---------- traversal guard ----------

@pytest.mark.parametrize("bad_rel", [
    "../escape.png",
    "/etc/passwd",
    "sub/../../escape.png",
    "C:\\Windows\\evil.png",
    "\\absolute\\evil.png",
])
def test_traversal_paths_refused(task_conn, results_root, bad_rel, monkeypatch):
    now = int(time.time())
    rs = _seed_run(task_conn, "01J8ZK000000000000000000AA")
    rr = _seed_rr(task_conn, rs)
    # Bypass writer's own validator to plant a poisoned row directly.
    task_conn.execute(
        "INSERT INTO FrameArtifact (RunSessionId, RuleResultId, ArtifactKind, "
        "RelPath, Sha256, Bytes) VALUES (?, ?, 'RoiCrop', ?, ?, 10)",
        (rs, rr, bad_rel, SHA_A),
    )
    _age_row(task_conn, rs, now - 40 * 86400)

    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    # Poisoned row is REFUSED (not unlinked) but the parent RunSession
    # is still purged so a bad row cannot pin retention forever.
    assert bad_rel in out.TraversalRefusals
    assert out.RunSessionsDeleted == 1
    assert out.ArtifactsUnlinked == 0


def test_cutoff_boundary_exclusive(task_conn, results_root):
    """PersistedAt == cutoff is NOT deleted (strict `<` comparison)."""
    now = 1_000_000_000
    rs = _seed_run(task_conn, "01J8ZK000000000000000000AA")
    cutoff = now - 30 * 86400
    _age_row(task_conn, rs, cutoff)  # exactly on the boundary
    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    assert out.RunSessionsDeleted == 0
    # One second older -> deleted.
    _age_row(task_conn, rs, cutoff - 1)
    out2 = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, now_epoch=now,
    )
    assert out2.RunSessionsDeleted == 1


def test_outcome_to_wire_shape(task_conn, results_root):
    out = retention.run_retention(
        task_conn, results_root=results_root, retention_days=30, dry_run=True,
    )
    wire = out.to_wire()
    for key in (
        "RetentionDays", "CutoffEpoch", "DryRun",
        "RunSessionsScanned", "RunSessionsDeleted",
        "ArtifactsScanned", "ArtifactsUnlinked",
        "JsonlSidecarsUnlinked", "BytesReclaimed",
        "UnlinkFailures", "TraversalRefusals",
    ):
        assert key in wire
