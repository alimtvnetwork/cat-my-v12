"""Plan 90 Step 72 - contract tests for GET /observability/sessions.

Locks the Root-DB read path against ``CliInvocation`` (migration
``BE/db/migrations/root/0010_root_cli_invocations.sql``): envelope shape,
filter validation, ordering, limit ceiling, and the loud-failure contract
when the DB is not bootstrapped.
"""

from __future__ import annotations

import sqlite3
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
def db_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("APP_DB_ROOT", str(tmp_path))
    return tmp_path


def _apply_root_migration() -> None:
    conn = get_root_conn()
    try:
        conn.executescript(_MIGRATION.read_text(encoding="utf-8"))
    finally:
        conn.close()


def _insert(
    *, run_id: str, cli: str, sub: str, started: int,
    ended: int | None = None, exit_code: int | None = None, ok: int = 0,
    log_path: str | None = None, host: str = "test-host", pid: int = 4242,
    argv: str = "[]",
) -> None:
    conn = get_root_conn()
    try:
        conn.execute(
            "INSERT INTO CliInvocation "
            "(RunId, CliName, Subcommand, Argv, HostName, Pid, StartedAt, "
            " EndedAt, ExitCode, LogPath, IsSuccess) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (run_id, cli, sub, argv, host, pid, started, ended, exit_code, log_path, ok),
        )
        conn.commit()
    finally:
        conn.close()


def _client() -> TestClient:
    return TestClient(create_app())


# ---------------- happy path ------------------------------------------------

def test_empty_list_returns_success_envelope(db_root: Path) -> None:
    _apply_root_migration()
    r = _client().get("/observability/sessions")
    assert r.status_code == 200
    body = r.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Results"] == [
        {"items": [], "total": 0, "limit": 50, "sort": "StartedAt", "dir": "desc", "nextCursor": None}
    ]


    assert "X-Correlation-Id" in r.headers


def test_orders_newest_first_and_computes_duration_ms(db_root: Path) -> None:
    _apply_root_migration()
    _insert(run_id="r-old", cli="worker-cli",     sub="open",     started=1000, ended=1002, exit_code=0, ok=1)
    _insert(run_id="r-mid", cli="processing-cli", sub="evaluate", started=2000)  # active
    _insert(run_id="r-new", cli="worker-cli",     sub="capture",  started=3000, ended=3001, exit_code=42, ok=0)

    body = _client().get("/observability/sessions").json()
    items = body["Results"][0]["items"]
    assert [i["RunId"] for i in items] == ["r-new", "r-mid", "r-old"]

    by_run = {i["RunId"]: i for i in items}
    assert by_run["r-old"]["DurationMs"] == 2000
    assert by_run["r-old"]["IsSuccess"] is True
    assert by_run["r-mid"]["DurationMs"] is None       # active session
    assert by_run["r-mid"]["EndedAt"] is None
    assert by_run["r-new"]["ExitCode"] == 42
    assert by_run["r-new"]["IsSuccess"] is False


def test_filter_cli_and_status(db_root: Path) -> None:
    _apply_root_migration()
    _insert(run_id="w1", cli="worker-cli",     sub="capture",  started=100, ended=101, exit_code=0, ok=1)
    _insert(run_id="w2", cli="worker-cli",     sub="capture",  started=200)  # active
    _insert(run_id="p1", cli="processing-cli", sub="evaluate", started=300, ended=301, exit_code=9, ok=0)

    c = _client()
    only_worker = c.get("/observability/sessions?cli=worker-cli").json()["Results"][0]["items"]
    assert {i["RunId"] for i in only_worker} == {"w1", "w2"}

    active = c.get("/observability/sessions?status=active").json()["Results"][0]["items"]
    assert [i["RunId"] for i in active] == ["w2"]

    fails = c.get("/observability/sessions?status=failure").json()["Results"][0]["items"]
    assert [i["RunId"] for i in fails] == ["p1"]

    successes = c.get("/observability/sessions?status=success").json()["Results"][0]["items"]
    assert [i["RunId"] for i in successes] == ["w1"]


def test_limit_ceiling_enforced(db_root: Path) -> None:
    _apply_root_migration()
    for i in range(5):
        _insert(run_id=f"r{i}", cli="worker-cli", sub="capture", started=1000 + i)
    body = _client().get("/observability/sessions?limit=3").json()
    result = body["Results"][0]
    assert result["limit"] == 3
    assert result["total"] == 3
    assert [i["RunId"] for i in result["items"]] == ["r4", "r3", "r2"]


# ---------------- validation failures --------------------------------------

@pytest.mark.parametrize("bad_limit", [0, -1, 501, 10_000])
def test_invalid_limit_returns_bad_request(db_root: Path, bad_limit: int) -> None:
    _apply_root_migration()
    r = _client().get(f"/observability/sessions?limit={bad_limit}")
    assert r.status_code == 400
    body = r.json()
    assert body["Status"]["IsSuccess"] is False
    assert body["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_invalid_cli_filter_returns_bad_request(db_root: Path) -> None:
    _apply_root_migration()
    r = _client().get("/observability/sessions?cli=hackerman")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_invalid_status_filter_returns_bad_request(db_root: Path) -> None:
    _apply_root_migration()
    r = _client().get("/observability/sessions?status=maybe")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


@pytest.mark.parametrize("bad", ["Random", "started_at", "duration", ""])
def test_invalid_sort_returns_bad_request(db_root: Path, bad: str) -> None:
    _apply_root_migration()
    r = _client().get(f"/observability/sessions?sort={bad}")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_invalid_dir_returns_bad_request(db_root: Path) -> None:
    _apply_root_migration()
    r = _client().get("/observability/sessions?dir=sideways")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


# ---------------- server-side sort (Step 82) -------------------------------

def _seed_sort_fixture() -> None:
    _apply_root_migration()
    # a: success, short duration (100ms)
    _insert(run_id="a", cli="worker-cli",     sub="capture",  started=1000, ended=1000 + 0, exit_code=0, ok=1)
    # b: failure, longest duration (5000ms)
    _insert(run_id="b", cli="processing-cli", sub="evaluate", started=2000, ended=2000 + 5, exit_code=9, ok=0)
    # c: active (no EndedAt) started latest
    _insert(run_id="c", cli="worker-cli",     sub="capture",  started=3000)
    # d: success, medium duration (2000ms)
    _insert(run_id="d", cli="processing-cli", sub="evaluate", started=1500, ended=1500 + 2, exit_code=0, ok=1)


def test_sort_started_at_asc(db_root: Path) -> None:
    _seed_sort_fixture()
    items = _client().get("/observability/sessions?sort=StartedAt&dir=asc").json()["Results"][0]["items"]
    assert [i["RunId"] for i in items] == ["a", "d", "b", "c"]


def test_sort_cli_name_asc(db_root: Path) -> None:
    _seed_sort_fixture()
    items = _client().get("/observability/sessions?sort=CliName&dir=asc").json()["Results"][0]["items"]
    # processing-cli rows before worker-cli rows; within each group the
    # CliInvocationId DESC tiebreaker keeps the row inserted last first.
    assert [i["CliName"] for i in items] == [
        "processing-cli", "processing-cli", "worker-cli", "worker-cli",
    ]


def test_sort_status_asc_ranks_active_success_failure(db_root: Path) -> None:
    _seed_sort_fixture()
    items = _client().get("/observability/sessions?sort=Status&dir=asc").json()["Results"][0]["items"]
    # active(0) first, then success(1), then failure(2)
    assert items[0]["RunId"] == "c"          # only active
    assert items[-1]["RunId"] == "b"         # only failure
    assert {items[1]["RunId"], items[2]["RunId"]} == {"a", "d"}  # both success


def test_sort_duration_ms_nulls_sink_regardless_of_dir(db_root: Path) -> None:
    _seed_sort_fixture()
    # desc: longest finished first, active (NULL) sinks to end
    items = _client().get("/observability/sessions?sort=DurationMs&dir=desc").json()["Results"][0]["items"]
    assert [i["RunId"] for i in items] == ["b", "d", "a", "c"]
    # asc: shortest finished first, active still at the end
    items = _client().get("/observability/sessions?sort=DurationMs&dir=asc").json()["Results"][0]["items"]
    assert [i["RunId"] for i in items] == ["a", "d", "b", "c"]


def test_response_echoes_sort_and_dir(db_root: Path) -> None:
    _apply_root_migration()
    body = _client().get("/observability/sessions?sort=CliName&dir=asc").json()
    result = body["Results"][0]
    assert result["sort"] == "CliName"
    assert result["dir"] == "asc"



# ---------------- loud-failure contract ------------------------------------

def test_missing_table_surfaces_internal_error_not_empty(db_root: Path) -> None:
    """Root DB not bootstrapped -> 500 E_BE_INTERNAL, NEVER a silent []."""
    # No migration applied on purpose.
    r = _client().get("/observability/sessions")
    assert r.status_code == 500
    body = r.json()
    assert body["Status"]["IsSuccess"] is False
    err = body["Errors"]
    assert err["Code"] == "E_BE_INTERNAL"
    # Details must name the sqlite failure so operators see it in logs/UI.
    assert "no such table" in err["Details"]["SqliteError"].lower()
    assert "db-bootstrap" in err["Details"]["Hint"]


def test_route_never_touches_task_or_rules_tier(db_root: Path) -> None:
    """Guarantee spec/05-split-db-architecture: no cross-tier reads."""
    _apply_root_migration()
    # If the route ever opened task.db or rules.db, those files would exist
    # after the request. Only root.db is permitted.
    _client().get("/observability/sessions").raise_for_status()
    assert (db_root / "root.db").exists()
    assert not (db_root / "task.db").exists()
    assert not (db_root / "rules.db").exists()


# ---------------- sanity: sqlite Row plumbing ------------------------------

def test_row_factory_did_not_leak_between_requests(db_root: Path) -> None:
    _apply_root_migration()
    _insert(run_id="r1", cli="worker-cli", sub="capture", started=1)
    _client().get("/observability/sessions").raise_for_status()
    # New connection must default back to tuples, not sqlite3.Row.
    conn = get_root_conn()
    try:
        assert conn.row_factory is None
        row = conn.execute("SELECT CliInvocationId FROM CliInvocation").fetchone()
        assert isinstance(row, tuple)
    finally:
        conn.close()
    _ = sqlite3  # keep import used


# ---------------- cursor pagination (Step 84) -------------------------------

def test_next_cursor_null_when_page_not_full(db_root: Path) -> None:
    _apply_root_migration()
    _insert(run_id="r1", cli="worker-cli", sub="capture", started=1000)
    _insert(run_id="r2", cli="worker-cli", sub="capture", started=2000)
    body = _client().get("/observability/sessions?limit=10").json()
    assert body["Results"][0]["nextCursor"] is None


def test_cursor_walks_started_at_desc_without_dup_or_gap(db_root: Path) -> None:
    _apply_root_migration()
    for i in range(7):
        _insert(run_id=f"r{i}", cli="worker-cli", sub="capture", started=1000 + i)
    c = _client()
    seen: list[str] = []
    cursor = None
    for _ in range(5):
        url = "/observability/sessions?limit=3"
        if cursor:
            url += f"&cursor={cursor}"
        result = c.get(url).json()["Results"][0]
        seen.extend(i["RunId"] for i in result["items"])
        cursor = result["nextCursor"]
        if cursor is None:
            break
    assert cursor is None
    assert seen == ["r6", "r5", "r4", "r3", "r2", "r1", "r0"]


def test_cursor_walks_duration_ms_with_null_bucket(db_root: Path) -> None:
    _apply_root_migration()
    # 2 ended (durations 5000, 2000) + 2 active (NULL sink)
    _insert(run_id="b", cli="processing-cli", sub="evaluate", started=2000, ended=2005, exit_code=9, ok=0)
    _insert(run_id="d", cli="processing-cli", sub="evaluate", started=1500, ended=1502, exit_code=0, ok=1)
    _insert(run_id="c1", cli="worker-cli", sub="capture", started=3000)
    _insert(run_id="c2", cli="worker-cli", sub="capture", started=3100)
    c = _client()
    p1 = c.get("/observability/sessions?limit=2&sort=DurationMs&dir=desc").json()["Results"][0]
    assert [i["RunId"] for i in p1["items"]] == ["b", "d"]
    assert p1["nextCursor"] is not None
    p2 = c.get(f"/observability/sessions?limit=2&sort=DurationMs&dir=desc&cursor={p1['nextCursor']}").json()["Results"][0]
    # both actives, tiebroken by CliInvocationId DESC (c2 inserted last)
    assert [i["RunId"] for i in p2["items"]] == ["c2", "c1"]


def test_invalid_cursor_returns_bad_request(db_root: Path) -> None:
    _apply_root_migration()
    r = _client().get("/observability/sessions?cursor=not-a-real-cursor")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"
