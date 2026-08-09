"""Plan 90 Step 71 - route tests for `GET /api/cli/sessions`."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from BE.main import create_app


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    # Point every root under an isolated tmp dir so the writer's real
    # `APP_LOG_ROOT` on the dev host is never touched by the test.
    for env_key in ("APP_LOG_ROOT", "APP_DB_ROOT", "APP_IPC_ROOT", "APP_CONFIG_ROOT", "APP_DATA_ROOT"):
        monkeypatch.setenv(env_key, str(tmp_path / env_key.lower()))
    return TestClient(create_app())


def _seed_session(log_root: Path, source: str, date: str, hms: str, pid: int, subcmd: str, run_id: str = "run-xyz") -> Path:
    d = log_root / source / date
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"{hms}-{pid}-{subcmd}.jsonl"
    f.write_text(
        '{"Ts":"2026-07-21T00:00:00.000Z","Level":"INFO","Source":"' + source + '",'
        '"Pid":' + str(pid) + ',"RunId":"' + run_id + '","Subcmd":"' + subcmd + '",'
        '"Event":"begin","Msg":"ok","Ctx":{}}\n',
        encoding="utf-8",
    )
    return f


def test_empty_when_log_root_missing(client: TestClient) -> None:
    r = client.get("/api/cli/sessions")
    assert r.status_code == 200
    body = r.json()
    assert body["Status"]["IsSuccess"] is True
    assert body["Results"][0] == {"items": [], "total": 0, "limit": 50}


def test_lists_sessions_newest_first(client: TestClient, tmp_path: Path) -> None:
    log_root = tmp_path / "app_log_root"
    _seed_session(log_root, "worker-cli", "2026-07-20", "101500", 111, "capture", run_id="run-A")
    _seed_session(log_root, "processing-cli", "2026-07-21", "080000", 222, "evaluate", run_id="run-B")

    r = client.get("/api/cli/sessions")
    assert r.status_code == 200
    items = r.json()["Results"][0]["items"]
    assert [i["RunId"] for i in items] == ["run-B", "run-A"]
    assert items[0]["Source"] == "processing-cli"
    assert items[0]["Subcmd"] == "evaluate"
    assert items[0]["Pid"] == 222
    assert items[0]["StartedAt"] == "2026-07-21T08:00:00Z"
    assert items[0]["SizeBytes"] > 0


def test_source_filter(client: TestClient, tmp_path: Path) -> None:
    log_root = tmp_path / "app_log_root"
    _seed_session(log_root, "worker-cli", "2026-07-21", "090000", 1, "s")
    _seed_session(log_root, "processing-cli", "2026-07-21", "090000", 2, "e")
    r = client.get("/api/cli/sessions?source=processing-cli")
    items = r.json()["Results"][0]["items"]
    assert len(items) == 1 and items[0]["Source"] == "processing-cli"


def test_limit_bounds(client: TestClient) -> None:
    r = client.get("/api/cli/sessions?limit=0")
    assert r.status_code == 400
    body = r.json()
    assert body["Status"]["IsSuccess"] is False
    assert body["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_bad_source(client: TestClient) -> None:
    r = client.get("/api/cli/sessions?source=bogus")
    assert r.status_code == 400
    assert r.json()["Errors"]["Code"] == "E_BE_BAD_REQUEST"


# ---- Step 73: GET /api/cli/sessions/{run_id} -----------------------------


def _seed_multiline(log_root: Path, run_id: str, n: int) -> Path:
    d = log_root / "worker-cli" / "2026-07-21"
    d.mkdir(parents=True, exist_ok=True)
    f = d / "120000-333-capture.jsonl"
    lines = []
    for i in range(n):
        lines.append(
            '{"Ts":"2026-07-21T12:00:00.000Z","Level":"INFO","Source":"worker-cli",'
            f'"Pid":333,"RunId":"{run_id}","Subcmd":"capture",'
            f'"Event":"step","Msg":"line-{i}","Ctx":{{"i":{i}}}}}'
        )
    f.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return f


def _results0(body: dict) -> dict:
    """Envelope wire: success payload lives at `Results[0]`."""
    assert body["Status"]["IsSuccess"] is True, body
    return body["Results"][0]


def test_get_session_returns_summary_and_tail(client: TestClient, tmp_path: Path) -> None:
    log_root = tmp_path / "app_log_root"
    _seed_multiline(log_root, "run-tail", n=20)

    r = client.get("/api/cli/sessions/run-tail?tail=5")
    assert r.status_code == 200
    data = _results0(r.json())
    assert data["Summary"]["RunId"] == "run-tail"
    assert data["Summary"]["Subcmd"] == "capture"
    assert data["Requested"] == 5
    assert data["TailLines"] == 20
    assert data["DroppedInvalid"] == 0
    assert len(data["Records"]) == 5
    # Newest 5 should be the last 5 written (indices 15..19).
    assert [rec["Msg"] for rec in data["Records"]] == [f"line-{i}" for i in range(15, 20)]


def test_get_session_reports_dropped_invalid_lines(client: TestClient, tmp_path: Path) -> None:
    log_root = tmp_path / "app_log_root"
    f = _seed_multiline(log_root, "run-mixed", n=3)
    # Append a corrupt trailer; parser must count it, not silently swallow it.
    with f.open("a", encoding="utf-8") as fh:
        fh.write("{not-json\n")

    r = client.get("/api/cli/sessions/run-mixed?tail=10")
    assert r.status_code == 200
    data = _results0(r.json())
    assert data["DroppedInvalid"] == 1
    assert len(data["Records"]) == 3
    assert data["TailLines"] == 4


def test_get_session_not_found(client: TestClient) -> None:
    r = client.get("/api/cli/sessions/does-not-exist")
    assert r.status_code == 404
    body = r.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert body["Errors"]["Details"]["RunId"] == "does-not-exist"


def test_get_session_tail_bounds(client: TestClient, tmp_path: Path) -> None:
    log_root = tmp_path / "app_log_root"
    _seed_multiline(log_root, "run-bounds", n=2)
    over = client.get("/api/cli/sessions/run-bounds?tail=99999")
    assert over.status_code in (400, 422)
    under = client.get("/api/cli/sessions/run-bounds?tail=0")
    assert under.status_code in (400, 422)



