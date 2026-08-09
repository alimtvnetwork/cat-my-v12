"""Plan 90 Step 74 - contract tests for GET /observability/sessions/{id}/ipc.

Locks the mailbox tail endpoint against the on-disk IPC format from
`BE/cli/common/ipc.py` and `spec/21-app/76-cli-log-and-ipc.md`. Covers:
default-mailbox derivation from CliName, RunId isolation, cursor paging,
tail slicing, include_acked toggle, poison files, path-escape defense,
mailbox allowlist, missing directory, and unknown session.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from BE.db.connections import get_root_conn
from BE.main import create_app

_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "db" / "migrations" / "root" / "0010_root_cli_invocations.sql"
)


@pytest.fixture()
def env_roots(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    db_root = tmp_path / "db"
    log_root = tmp_path / "logs"
    ipc_root = tmp_path / "ipc"
    for p in (db_root, log_root, ipc_root):
        p.mkdir()
    monkeypatch.setenv("APP_DB_ROOT", str(db_root))
    monkeypatch.setenv("APP_LOG_ROOT", str(log_root))
    monkeypatch.setenv("APP_IPC_ROOT", str(ipc_root))
    return tmp_path


def _apply_root_migration() -> None:
    conn = get_root_conn()
    try:
        conn.executescript(_MIGRATION.read_text(encoding="utf-8"))
    finally:
        conn.close()


def _insert(*, run_id: str, cli_name: str = "worker-cli") -> int:
    conn = get_root_conn()
    try:
        cur = conn.execute(
            "INSERT INTO CliInvocation "
            "(RunId, CliName, Subcommand, Argv, HostName, Pid, StartedAt, LogPath, IsSuccess) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (run_id, cli_name, "capture", "[]", "h", 1, 1_700_000_000, None, 0),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def _drop_msg(mailbox_dir: Path, msg_id: str, run_id: str, *, acked: bool = False, kind: str = "FrameReady") -> Path:
    mailbox_dir.mkdir(parents=True, exist_ok=True)
    suffix = ".msg.ack.json" if acked else ".msg.json"
    p = mailbox_dir / f"{msg_id}{suffix}"
    p.write_text(
        json.dumps(
            {
                "MsgId": msg_id,
                "Kind": kind,
                "From": "worker-cli",
                "To": "processing-cli",
                "RunId": run_id,
                "Seq": 0,
                "Ts": "2026-07-21T00:00:00.000Z",
                "Payload": {"FramePath": f"/tmp/{msg_id}.png"},
                "Envelope": None,
            }
        ),
        encoding="utf-8",
    )
    return p


def _client() -> TestClient:
    return TestClient(create_app())


# ---------------------------------------------------------------- happy path

def test_tail_defaults_to_worker_out_for_worker_cli(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R1", cli_name="worker-cli")
    mbx = env_roots / "ipc" / "worker-out"
    for i in range(3):
        _drop_msg(mbx, f"01000000000000000000000{i:03d}", "R1")
    r = _client().get(f"/observability/sessions/{inv}/ipc")
    assert r.status_code == 200
    p = r.json()["Results"][0]
    assert p["Mailbox"] == "worker-out"
    assert p["Count"] == 3
    assert p["IsTruncated"] is False
    assert [it["MsgId"][-3:] for it in p["Items"]] == ["000", "001", "002"]


def test_processing_cli_defaults_to_processing_out(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R2", cli_name="processing-cli")
    mbx = env_roots / "ipc" / "processing-out"
    _drop_msg(mbx, "0100000000000000000000A00", "R2", kind="ResultReady")
    r = _client().get(f"/observability/sessions/{inv}/ipc")
    p = r.json()["Results"][0]
    assert p["Mailbox"] == "processing-out"
    assert p["Items"][0]["Kind"] == "ResultReady"


def test_explicit_mailbox_override(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R3", cli_name="worker-cli")
    mbx = env_roots / "ipc" / "main-in"
    _drop_msg(mbx, "0100000000000000000000B00", "R3")
    r = _client().get(f"/observability/sessions/{inv}/ipc?mailbox=main-in")
    p = r.json()["Results"][0]
    assert p["Mailbox"] == "main-in"
    assert p["Count"] == 1


# ---------------------------------------------------------------- filtering

def test_filters_by_run_id(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R_MINE", cli_name="worker-cli")
    mbx = env_roots / "ipc" / "worker-out"
    _drop_msg(mbx, "0100000000000000000000C01", "R_MINE")
    _drop_msg(mbx, "0100000000000000000000C02", "R_OTHER")
    _drop_msg(mbx, "0100000000000000000000C03", "R_MINE")
    r = _client().get(f"/observability/sessions/{inv}/ipc")
    p = r.json()["Results"][0]
    assert p["Count"] == 2
    assert {it["RunId"] for it in p["Items"]} == {"R_MINE"}


def test_include_acked_toggle(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R4", cli_name="worker-cli")
    mbx = env_roots / "ipc" / "worker-out"
    _drop_msg(mbx, "0100000000000000000000D01", "R4")
    _drop_msg(mbx, "0100000000000000000000D02", "R4", acked=True)
    r1 = _client().get(f"/observability/sessions/{inv}/ipc")
    r2 = _client().get(f"/observability/sessions/{inv}/ipc?include_acked=true")
    assert r1.json()["Results"][0]["Count"] == 1
    assert r2.json()["Results"][0]["Count"] == 2
    acked_flags = [it["IsAcked"] for it in r2.json()["Results"][0]["Items"]]
    assert acked_flags == [False, True]


# ---------------------------------------------------------------- paging

def test_tail_limit_slices_last_n(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R5", cli_name="worker-cli")
    mbx = env_roots / "ipc" / "worker-out"
    for i in range(5):
        _drop_msg(mbx, f"0100000000000000000000E{i:02d}", "R5")
    r = _client().get(f"/observability/sessions/{inv}/ipc?limit=2")
    p = r.json()["Results"][0]
    assert p["Count"] == 2
    assert [it["MsgId"][-2:] for it in p["Items"]] == ["03", "04"]
    assert p["IsTruncated"] is True
    assert p["NextAfterMsgId"] == "0100000000000000000000E04"


def test_after_msg_id_cursor_pages_forward(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R6", cli_name="worker-cli")
    mbx = env_roots / "ipc" / "worker-out"
    for i in range(5):
        _drop_msg(mbx, f"0100000000000000000000F{i:02d}", "R6")
    r = _client().get(
        f"/observability/sessions/{inv}/ipc"
        "?after_msg_id=0100000000000000000000F01&limit=2"
    )
    p = r.json()["Results"][0]
    assert [it["MsgId"][-2:] for it in p["Items"]] == ["02", "03"]
    assert p["IsTruncated"] is True
    assert p["NextAfterMsgId"] == "0100000000000000000000F03"


# ---------------------------------------------------------------- poison

def test_poison_file_surfaces_not_dropped(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R7", cli_name="worker-cli")
    mbx = env_roots / "ipc" / "worker-out"
    mbx.mkdir(parents=True, exist_ok=True)
    (mbx / "0100000000000000000000G01.msg.json").write_text("{not-json", encoding="utf-8")
    r = _client().get(f"/observability/sessions/{inv}/ipc")
    items = r.json()["Results"][0]["Items"]
    assert len(items) == 1
    assert "_ParseError" in items[0]
    assert items[0]["IsAcked"] is False


# ---------------------------------------------------------------- errors

def test_unknown_session_returns_404(env_roots: Path) -> None:
    _apply_root_migration()
    r = _client().get("/observability/sessions/999/ipc")
    assert r.status_code == 404
    assert r.json()["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_bad_mailbox_returns_400(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R8", cli_name="worker-cli")
    r = _client().get(f"/observability/sessions/{inv}/ipc?mailbox=../etc")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_bad_limit_returns_400(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R9", cli_name="worker-cli")
    r = _client().get(f"/observability/sessions/{inv}/ipc?limit=0")
    assert r.status_code == 400
    r2 = _client().get(f"/observability/sessions/{inv}/ipc?limit=501")
    assert r2.status_code == 400


def test_missing_mailbox_dir_returns_404(env_roots: Path) -> None:
    _apply_root_migration()
    inv = _insert(run_id="R10", cli_name="worker-cli")
    r = _client().get(f"/observability/sessions/{inv}/ipc")
    assert r.status_code == 404
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert "Hint" in body["Errors"]["Details"]


def test_missing_cliinvocation_table_returns_500(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_DB_ROOT", str(tmp_path / "db"))
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_IPC_ROOT", str(tmp_path / "ipc"))
    for k in ("db", "logs", "ipc"):
        (tmp_path / k).mkdir()
    r = _client().get("/observability/sessions/1/ipc")
    assert r.status_code == 500
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_INTERNAL"
    assert "bin/db-bootstrap.py" in body["Errors"]["Details"]["Hint"]


def test_tier_isolation_uses_root_only(env_roots: Path) -> None:
    """Route module must not import Task/Rules connection helpers."""
    import BE.routes.observability.ipc as mod

    src = Path(mod.__file__).read_text(encoding="utf-8")
    assert "get_task_conn" not in src
    assert "get_rules_conn" not in src
    assert "get_root_conn" in src
