"""Plan 90 Step 63 - `processing-cli status` acceptance tests.

Pins spec/21-app/75 §Subcommands (`status` presence + read-only shape) and
spec/21-app/76 §"IPC protocol" (four drop-dir names).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]


def _run(*args: str, env_extra: dict[str, str] | None = None) -> tuple[int, dict]:
    import os
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.processing.main", "status", *args],
        capture_output=True, text=True, timeout=20, cwd=str(REPO_ROOT), env=env,
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload


def _mk_roots(tmp_path: Path) -> dict[str, Path]:
    roots = {
        "log": tmp_path / "logs",
        "db": tmp_path / "db",
        "ipc": tmp_path / "ipc",
        "data": tmp_path / "data",
    }
    for p in roots.values():
        p.mkdir(parents=True, exist_ok=True)
    return roots


def test_status_reports_all_roots(tmp_path: Path):
    roots = _mk_roots(tmp_path)
    rc, env = _run(
        "--log-root", str(roots["log"]),
        "--db-root", str(roots["db"]),
        "--ipc-root", str(roots["ipc"]),
        "--data-root", str(roots["data"]),
    )
    assert rc == 0, env
    assert env["Status"]["IsSuccess"] is True
    payload = env["Results"][0]
    for key in ("LogRoot", "DbRoot", "IpcRoot", "DataRoot"):
        assert payload[key]["Exists"] is True
        assert payload[key]["Path"] == str(roots[key.replace("Root", "").lower()])


def test_status_missing_roots_report_exists_false(tmp_path: Path):
    # Only ipc/data exist; log/db are pointed at nonexistent paths.
    (tmp_path / "ipc").mkdir()
    (tmp_path / "data").mkdir()
    rc, env = _run(
        "--log-root", str(tmp_path / "nope-log"),
        "--db-root", str(tmp_path / "nope-db"),
        "--ipc-root", str(tmp_path / "ipc"),
        "--data-root", str(tmp_path / "data"),
    )
    assert rc == 0
    p = env["Results"][0]
    assert p["LogRoot"]["Exists"] is False
    assert p["DbRoot"]["Exists"] is False
    assert p["IpcRoot"]["Exists"] is True
    assert p["DataRoot"]["Exists"] is True


def test_status_drops_layout_and_pending_count(tmp_path: Path):
    roots = _mk_roots(tmp_path)
    # Create canonical drop dirs and drop a payload into processing-in.
    for name in ("worker-out", "processing-in", "processing-out", "main-in"):
        (roots["ipc"] / name).mkdir()
    (roots["ipc"] / "processing-in" / "01H000000000000000000000000.json").write_text("{}")
    (roots["ipc"] / "processing-in" / "01H111111111111111111111111.json").write_text("{}")

    rc, env = _run(
        "--log-root", str(roots["log"]),
        "--db-root", str(roots["db"]),
        "--ipc-root", str(roots["ipc"]),
        "--data-root", str(roots["data"]),
    )
    assert rc == 0
    drops = env["Results"][0]["Drops"]
    names = [d["Name"] for d in drops]
    assert names == ["worker-out", "processing-in", "processing-out", "main-in"]
    by_name = {d["Name"]: d for d in drops}
    assert by_name["processing-in"]["Exists"] is True
    assert by_name["processing-in"]["PendingCount"] == 2
    assert by_name["worker-out"]["PendingCount"] == 0


def test_status_results_session_count(tmp_path: Path):
    roots = _mk_roots(tmp_path)
    results_dir = roots["data"] / "results"
    (results_dir / "RS_A").mkdir(parents=True)
    (results_dir / "RS_B").mkdir()
    # A stray file must not be counted as a session.
    (results_dir / "stray.txt").write_text("x")

    rc, env = _run(
        "--log-root", str(roots["log"]),
        "--db-root", str(roots["db"]),
        "--ipc-root", str(roots["ipc"]),
        "--data-root", str(roots["data"]),
    )
    assert rc == 0
    rd = env["Results"][0]["ResultsDir"]
    assert rd["Exists"] is True
    assert rd["SessionCount"] == 2
