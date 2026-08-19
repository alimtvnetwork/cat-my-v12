"""Plan 90 Step 73 - contract tests for GET /observability/sessions/{id}/logs.

Locks the tail endpoint against ``CliInvocation.LogPath`` (Root-DB
migration 0010). Covers: happy tail, offset resume, poison line surfacing,
missing row, NULL LogPath, missing file on disk, path-escape defense, and
bad query params.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from BE.db.connections import get_root_conn
from BE.main import create_app
from fastapi.testclient import TestClient

_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "db" / "migrations" / "root" / "0010_root_cli_invocations.sql"
)


@pytest.fixture()
def env_roots(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    db_root = tmp_path / "db"
    log_root = tmp_path / "logs"
    db_root.mkdir()
    log_root.mkdir()
    monkeypatch.setenv("APP_DB_ROOT", str(db_root))
    monkeypatch.setenv("APP_LOG_ROOT", str(log_root))
    return tmp_path


def _apply_root_migration() -> None:
    conn = get_root_conn()
    try:
        conn.executescript(_MIGRATION.read_text(encoding="utf-8"))
    finally:
        conn.close()


def _insert(*, run_id: str, log_path: str | None) -> int:
    conn = get_root_conn()
    try:
        cur = conn.execute(
            "INSERT INTO CliInvocation "
            "(RunId, CliName, Subcommand, Argv, HostName, Pid, StartedAt, LogPath, IsSuccess) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (run_id, "worker-cli", "capture", "[]", "h", 1, 1_700_000_000, log_path, 0),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def _write_log(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(l + "\n" for l in lines), encoding="utf-8")


def _client() -> TestClient:
    return TestClient(create_app())


def _rec(msg: str, i: int) -> str:
    return json.dumps({"Ts": "2026-07-21T00:00:00.000Z", "Level": "INFO", "Msg": msg, "I": i})


def test_tail_returns_recent_lines(env_roots: Path) -> None:
    _apply_root_migration()
    log = env_roots / "logs" / "worker-cli" / "2026-07-21" / "000000-1-capture.jsonl"
    _write_log(log, [_rec("m", i) for i in range(5)])
    inv_id = _insert(run_id="R1", log_path=str(log))
    r = _client().get(f"/observability/sessions/{inv_id}/logs?tail=3")
    assert r.status_code == 200
    body = r.json()
    assert body["Status"]["IsSuccess"] is True
    p = body["Results"][0]
    assert len(p["Items"]) == 3
    assert [it["I"] for it in p["Items"]] == [2, 3, 4]
    assert p["IsTruncated"] is True
    assert p["NextOffset"] == log.stat().st_size


def test_tail_default_returns_all_when_smaller(env_roots: Path) -> None:
    _apply_root_migration()
    log = env_roots / "logs" / "worker-cli" / "2026-07-21" / "000000-1-capture.jsonl"
    _write_log(log, [_rec("m", i) for i in range(4)])
    inv_id = _insert(run_id="R2", log_path=str(log))
    r = _client().get(f"/observability/sessions/{inv_id}/logs")
    assert r.status_code == 200
    p = r.json()["Results"][0]
    assert len(p["Items"]) == 4
    assert p["IsTruncated"] is False


def test_offset_resume_reads_new_lines_only(env_roots: Path) -> None:
    _apply_root_migration()
    log = env_roots / "logs" / "worker-cli" / "2026-07-21" / "000000-1-capture.jsonl"
    _write_log(log, [_rec("m", i) for i in range(3)])
    inv_id = _insert(run_id="R3", log_path=str(log))
    first_offset = log.stat().st_size
    # append two new lines
    with log.open("a", encoding="utf-8") as fp:
        fp.write(_rec("m", 3) + "\n" + _rec("m", 4) + "\n")
    r = _client().get(f"/observability/sessions/{inv_id}/logs?after_offset={first_offset}")
    assert r.status_code == 200
    p = r.json()["Results"][0]
    assert [it["I"] for it in p["Items"]] == [3, 4]
    assert p["NextOffset"] == log.stat().st_size


def test_offset_past_eof_returns_empty(env_roots: Path) -> None:
    _apply_root_migration()
    log = env_roots / "logs" / "worker-cli" / "2026-07-21" / "000000-1-capture.jsonl"
    _write_log(log, [_rec("m", 0)])
    inv_id = _insert(run_id="R3b", log_path=str(log))
    r = _client().get(f"/observability/sessions/{inv_id}/logs?after_offset=99999")
    assert r.status_code == 200
    p = r.json()["Results"][0]
    assert p["Items"] == []


def test_partial_trailing_line_held_back(env_roots: Path) -> None:
    _apply_root_migration()
    log = env_roots / "logs" / "worker-cli" / "2026-07-21" / "000000-1-capture.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(_rec("m", 0) + "\n" + '{"Ts":"partial', encoding="utf-8")
    inv_id = _insert(run_id="R4", log_path=str(log))
    r = _client().get(f"/observability/sessions/{inv_id}/logs")
    assert r.status_code == 200
    p = r.json()["Results"][0]
    assert len(p["Items"]) == 1
    # next_offset points just after the complete line, NOT into the partial.
    assert p["NextOffset"] < log.stat().st_size


def test_poison_line_surfaces_as_raw(env_roots: Path) -> None:
    _apply_root_migration()
    log = env_roots / "logs" / "worker-cli" / "2026-07-21" / "000000-1-capture.jsonl"
    _write_log(log, [_rec("ok", 0), "{not json", _rec("ok", 1)])
    inv_id = _insert(run_id="R5", log_path=str(log))
    r = _client().get(f"/observability/sessions/{inv_id}/logs")
    assert r.status_code == 200
    items = r.json()["Results"][0]["Items"]
    assert len(items) == 3
    assert items[1]["_ParseError"].startswith("json decode")
    assert items[1]["_Raw"] == "{not json"


def test_unknown_id_returns_not_found(env_roots: Path) -> None:
    _apply_root_migration()
    r = _client().get("/observability/sessions/99999/logs")
    assert r.status_code == 404
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert body["Errors"]["Details"]["CliInvocationId"] == 99999


def test_null_log_path_returns_not_found_with_hint(env_roots: Path) -> None:
    _apply_root_migration()
    inv_id = _insert(run_id="R6", log_path=None)
    r = _client().get(f"/observability/sessions/{inv_id}/logs")
    assert r.status_code == 404
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert "CLI died" in body["Errors"]["BackendMessage"]
    assert "Hint" in body["Errors"]["Details"]


def test_missing_file_returns_not_found(env_roots: Path) -> None:
    _apply_root_migration()
    log = env_roots / "logs" / "worker-cli" / "2026-07-21" / "missing.jsonl"
    inv_id = _insert(run_id="R7", log_path=str(log))
    r = _client().get(f"/observability/sessions/{inv_id}/logs")
    assert r.status_code == 404
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert body["Errors"]["Details"]["LogPath"].endswith("missing.jsonl")


def test_path_escape_defense(env_roots: Path, tmp_path: Path) -> None:
    _apply_root_migration()
    # Point LogPath outside APP_LOG_ROOT
    outside = tmp_path / "outside.jsonl"
    outside.write_text("x\n", encoding="utf-8")
    inv_id = _insert(run_id="R8", log_path=str(outside))
    r = _client().get(f"/observability/sessions/{inv_id}/logs")
    assert r.status_code == 400
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_BAD_REQUEST"
    assert "escapes" in body["Errors"]["BackendMessage"]


@pytest.mark.parametrize("tail", [0, -1, 2001, 10000])
def test_bad_tail_rejected(env_roots: Path, tail: int) -> None:
    _apply_root_migration()
    inv_id = _insert(run_id="R9", log_path=None)
    r = _client().get(f"/observability/sessions/{inv_id}/logs?tail={tail}")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_negative_offset_rejected(env_roots: Path) -> None:
    _apply_root_migration()
    inv_id = _insert(run_id="R10", log_path=None)
    r = _client().get(f"/observability/sessions/{inv_id}/logs?after_offset=-1")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_missing_table_surfaces_internal_error(env_roots: Path) -> None:
    # Do NOT apply migration.
    r = _client().get("/observability/sessions/1/logs")
    assert r.status_code == 500
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_INTERNAL"
    assert body["Errors"]["Details"]["Hint"] == "python bin/db-bootstrap.py"
