"""Plan 90 Step 99 - evaluate -> Task-DB persistence wiring.

Proves the evaluate command drives all three writers (RunSession,
RuleResult, FrameArtifact) end-to-end, and that a replay with the same
RunId is a full idempotent no-op (INSERT OR IGNORE across all writers).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from BE.cli.processing.commands import evaluate as ev
from BE.db.connections import get_task_conn

MIGRATIONS = Path(__file__).resolve().parents[3] / "db" / "migrations" / "task"


class _StubLogger:
    def __init__(self) -> None:
        self.events: list[dict] = []

    def log(self, level, event, message, *, ctx=None):
        self.events.append({"level": level, "event": event, "message": message, "ctx": ctx or {}})


def _apply_task_migrations(db_root: Path) -> None:
    """Apply all task migrations to <db_root>/task.db so evaluate can write."""
    conn = get_task_conn(db_root=db_root)
    try:
        for path in sorted(MIGRATIONS.glob("*.sql")):
            conn.executescript(path.read_text(encoding="utf-8"))
    finally:
        conn.close()


def _bundle(tmp_path: Path, rules=()) -> Path:
    p = tmp_path / "bundle.json"
    p.write_text(json.dumps({"schemaVersion": 3, "rules": list(rules)}), encoding="utf-8")
    return p


def _frame(tmp_path: Path) -> Path:
    p = tmp_path / "frame.png"
    p.write_bytes(b"\x89PNG\r\n\x1a\n" + b"0" * 32)
    return p


def _ns(**kw):
    defaults = dict(
        frame=None, bundle=None, run_id=None, results_dir=None,
        emit_ipc=False, ipc_root=None, ipc_out_dir="processing-out",
        frame_seq=0, mode="auto", task_db_root=None,
    )
    defaults.update(kw)
    return argparse.Namespace(**defaults)


def _ctx():
    return SimpleNamespace(logger=_StubLogger(), ref=SimpleNamespace(RunId="cli-run", LogPath="/tmp/x.log"))


@pytest.fixture
def db_root(tmp_path: Path) -> Path:
    root = tmp_path / "vision-db"
    root.mkdir()
    _apply_task_migrations(root)
    return root


def test_zero_rule_bundle_persists_run_session(tmp_path: Path, db_root: Path):
    ns = _ns(
        frame=str(_frame(tmp_path)),
        bundle=str(_bundle(tmp_path, rules=[])),
        results_dir=str(tmp_path / "results"),
        run_id="01J8ZK000000000000000000AA",
        task_db_root=str(db_root),
    )
    ctx = _ctx()
    out = ev.handle(ns, ctx)
    assert out[0]["Verdict"] == "Pass"

    conn = get_task_conn(db_root=db_root)
    try:
        rows = conn.execute("SELECT RunId, Verdict, RuleCount FROM RunSession").fetchall()
    finally:
        conn.close()
    assert rows == [("01J8ZK000000000000000000AA", "Pass", 0)]

    events = [e["event"] for e in ctx.logger.events]
    assert "evaluate.db.run_session" in events


def test_replay_same_run_id_is_idempotent(tmp_path: Path, db_root: Path):
    frame, bundle = _frame(tmp_path), _bundle(tmp_path, rules=[])
    args = dict(
        frame=str(frame), bundle=str(bundle),
        results_dir=str(tmp_path / "results"),
        run_id="01J8ZK000000000000000000BB",
        task_db_root=str(db_root),
    )
    ev.handle(_ns(**args), _ctx())
    ev.handle(_ns(**args), _ctx())

    conn = get_task_conn(db_root=db_root)
    try:
        count = conn.execute("SELECT COUNT(*) FROM RunSession WHERE RunId=?",
                             ("01J8ZK000000000000000000BB",)).fetchone()[0]
    finally:
        conn.close()
    assert count == 1


def test_skips_persistence_when_no_db_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("APP_DB_ROOT", raising=False)
    ns = _ns(
        frame=str(_frame(tmp_path)),
        bundle=str(_bundle(tmp_path, rules=[])),
        results_dir=str(tmp_path / "results"),
        run_id="01J8ZK000000000000000000CC",
        task_db_root=None,
    )
    ctx = _ctx()
    ev.handle(ns, ctx)
    events = [e["event"] for e in ctx.logger.events]
    assert "evaluate.db.run_session" not in events


def test_env_app_db_root_triggers_persistence(tmp_path: Path, db_root: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("APP_DB_ROOT", str(db_root))
    ns = _ns(
        frame=str(_frame(tmp_path)),
        bundle=str(_bundle(tmp_path, rules=[])),
        results_dir=str(tmp_path / "results"),
        run_id="01J8ZK000000000000000000DD",
        task_db_root=None,
    )
    ctx = _ctx()
    ev.handle(ns, ctx)
    events = [e["event"] for e in ctx.logger.events]
    assert "evaluate.db.run_session" in events


def test_writer_failure_surfaces_and_is_logged(tmp_path: Path, db_root: Path):
    # Corrupt the schema so RunSession insert fails -> AppError re-raised
    # and an ERROR log line lands. Silent failure would be unacceptable.
    conn = get_task_conn(db_root=db_root)
    try:
        conn.execute("DROP TABLE RunSession")
        conn.commit()
    finally:
        conn.close()
    ns = _ns(
        frame=str(_frame(tmp_path)),
        bundle=str(_bundle(tmp_path, rules=[])),
        results_dir=str(tmp_path / "results"),
        run_id="01J8ZK000000000000000000EE",
        task_db_root=str(db_root),
    )
    ctx = _ctx()
    from BE.errors.apperror import AppError
    with pytest.raises(AppError):
        ev.handle(ns, ctx)
    err_events = [e for e in ctx.logger.events if e["event"] == "evaluate.db.write_failed"]
    assert len(err_events) == 1
    assert err_events[0]["level"] == "ERROR"
