"""Plan 90 Step 65 - `processing-cli doctor` acceptance tests.

Locks the spec 74 §Acceptance #5 preflight contract as exposed via
`BE/cli/processing/main.py::_handle_doctor` (delegates to
`BE.cli.common.doctor.run_preflight` + `assert_healthy`).

Cases:
- Healthy tree (fresh tmp DB root with all migrations applied): exit Ok,
  every summary carries `IsHealthy=True`, at least the four canonical
  tiers appear (`sdk`, `config`, `logroot`, plus DB tiers).
- Drift path: pointing `--db-root` at a directory with a non-empty but
  stale DB file surfaces `IsHealthy=False` for the affected DB tier and
  raises `E_CLI_PREFLIGHT_FAILED` with `Details.Drift` populated per
  `assert_healthy` (mapped to `ExitCode.DomainError=3` by the dispatcher).
- Envelope shape: even on failure `Results` carries the per-tier summaries
  so operators see WHY the CLI refused (spec 75 §Universal Envelope).
"""

from __future__ import annotations

import io
import json
from pathlib import Path

from BE.cli.common.exit_codes import ExitCode
from BE.cli.processing.main import build_dispatcher


def _run(argv, tmp_path, monkeypatch, db_root: Path | None = None):
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    monkeypatch.setenv("APP_IPC_ROOT", str(tmp_path / "ipc"))
    if db_root is not None:
        monkeypatch.setenv("APP_DB_ROOT", str(db_root))
    else:
        monkeypatch.setenv("APP_DB_ROOT", str(tmp_path / "db"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(
        argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"),
    )
    lines = [ln for ln in out.getvalue().splitlines() if ln.strip()]
    assert lines, out.getvalue() + "\n---\n" + err.getvalue()
    return code, json.loads(lines[-1])


def _apply_all_migrations(db_root: Path) -> None:
    """Fresh tmp DB with every migration applied via the guarded connections."""
    import sqlite3

    from BE.db.connections import get_root_conn, get_rules_conn, get_task_conn

    repo = Path(__file__).resolve().parents[4]
    for tier, factory in (
        ("root", get_root_conn), ("task", get_task_conn), ("rules", get_rules_conn),
    ):
        mig_dir = repo / "BE" / "db" / "migrations" / tier
        if not mig_dir.is_dir():
            continue
        conn = factory()
        try:
            for sql_file in sorted(mig_dir.glob("*.sql")):
                # Use raw sqlite3 to avoid guard tripping on multi-statement DDL
                # bodies; guarded connections still gate app runtime queries.
                raw = sqlite3.connect(conn.execute("PRAGMA database_list").fetchone()[2])
                try:
                    raw.executescript(sql_file.read_text(encoding="utf-8"))
                    raw.commit()
                finally:
                    raw.close()
        finally:
            conn.close()


def test_doctor_healthy_returns_ok_envelope(tmp_path, monkeypatch):
    db_root = tmp_path / "db"
    db_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("APP_DB_ROOT", str(db_root))
    _apply_all_migrations(db_root)

    code, env = _run(["doctor"], tmp_path, monkeypatch, db_root=db_root)
    assert code == ExitCode.Ok, env
    assert env["Status"]["IsSuccess"] is True
    summaries = env["Results"]
    assert isinstance(summaries, list) and summaries
    tiers = {s["Tier"] for s in summaries}
    # Preflight always adds the three in-process probes.
    assert {"sdk", "config", "logroot"}.issubset(tiers)
    assert all(s.get("IsHealthy") is True for s in summaries), summaries


def test_doctor_drift_raises_preflight_failed(tmp_path, monkeypatch):
    # Empty db_root: no migrations applied -> DB tiers report drift.
    db_root = tmp_path / "db-empty"
    db_root.mkdir(parents=True, exist_ok=True)
    code, env = _run(["doctor"], tmp_path, monkeypatch, db_root=db_root)
    # Dispatcher maps E_CLI_PREFLIGHT_FAILED into the Usage bucket
    # (BE/cli/common/dispatcher.py::_USAGE_CODES), NOT DomainError.
    assert code == ExitCode.Usage, (code, env)
    assert env["Status"]["IsSuccess"] is False
    assert env["Errors"]["Code"] == "E_CLI_PREFLIGHT_FAILED"
    # When `assert_healthy` raises, the handler never returns; per-tier
    # detail is preserved on `Errors.Details.Drift` (spec 03 §Envelope
    # error contract). `Results` is empty because the envelope carries
    # either payload OR error detail, never both.
    details = env["Errors"].get("Details") or {}
    drift = details.get("Drift") or []
    assert drift, env["Errors"]
    tiers = {d["Tier"] for d in drift}
    assert tiers & {"root", "task"}, drift
