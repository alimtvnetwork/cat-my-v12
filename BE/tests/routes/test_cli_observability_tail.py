"""Plan 90 Step 72 - route tests for `GET /api/cli/sessions/{run_id}/log` (SSE)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from BE.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    for env_key in ("APP_LOG_ROOT", "APP_DB_ROOT", "APP_IPC_ROOT", "APP_CONFIG_ROOT", "APP_DATA_ROOT"):
        monkeypatch.setenv(env_key, str(tmp_path / env_key.lower()))
    return TestClient(create_app())


def _seed(log_root: Path, run_id: str, lines: int = 3) -> Path:
    d = log_root / "worker-cli" / "2026-07-21"
    d.mkdir(parents=True, exist_ok=True)
    f = d / "010203-4242-run.jsonl"
    with f.open("w", encoding="utf-8") as fh:
        for i in range(1, lines + 1):
            fh.write(json.dumps({
                "Ts": "2026-07-21T01:02:03.000Z",
                "Level": "INFO",
                "Source": "worker-cli",
                "Pid": 4242,
                "RunId": run_id,
                "Subcmd": "run",
                "Event": f"e{i}",
                "Msg": f"line {i}",
                "Ctx": {},
            }) + "\n")
    return f


def _parse_sse(body: str) -> list[dict]:
    """Return frames as list of dicts with keys id/event/data (data raw str)."""
    frames: list[dict] = []
    cur: dict = {}
    for raw in body.splitlines():
        if raw == "":
            if cur:
                frames.append(cur)
                cur = {}
            continue
        key, _, val = raw.partition(": ")
        cur[key] = val
    if cur:
        frames.append(cur)
    return frames


def test_not_found_when_run_id_unknown(client: TestClient, tmp_path: Path) -> None:
    r = client.get("/api/cli/sessions/does-not-exist/log")
    assert r.status_code == 404
    body = r.json()
    assert body["Status"]["IsSuccess"] is False
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_streams_all_lines_and_end_frame(client: TestClient, tmp_path: Path) -> None:
    log_root = tmp_path / "app_log_root"
    _seed(log_root, "run-abc", lines=3)

    r = client.get("/api/cli/sessions/run-abc/log")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")

    frames = _parse_sse(r.text)
    data_frames = [f for f in frames if "id" in f]
    end_frames = [f for f in frames if f.get("event") == "end"]

    assert len(data_frames) == 3
    assert [f["id"] for f in data_frames] == ["1", "2", "3"]
    # Each `data:` payload is a full JSONL record.
    first = json.loads(data_frames[0]["data"])
    assert first["RunId"] == "run-abc"
    assert first["Event"] == "e1"

    assert len(end_frames) == 1
    end_payload = json.loads(end_frames[0]["data"])
    assert end_payload == {
        "RunId": "run-abc",
        "LineCount": 3,
        "NextSinceLine": 3,
        "Truncated": False,
    }


def test_since_line_skips_and_truncation_flag(client: TestClient, tmp_path: Path) -> None:
    log_root = tmp_path / "app_log_root"
    _seed(log_root, "run-xyz", lines=5)

    r = client.get("/api/cli/sessions/run-xyz/log", params={"since_line": 2, "max_lines": 2})
    assert r.status_code == 200
    frames = _parse_sse(r.text)
    data_frames = [f for f in frames if "id" in f]
    end_frames = [f for f in frames if f.get("event") == "end"]

    assert [f["id"] for f in data_frames] == ["3", "4"]
    end_payload = json.loads(end_frames[0]["data"])
    assert end_payload["LineCount"] == 2
    assert end_payload["NextSinceLine"] == 4
    assert end_payload["Truncated"] is True


def test_max_lines_rejects_out_of_range(client: TestClient, tmp_path: Path) -> None:
    _seed(tmp_path / "app_log_root", "run-abc", lines=1)
    r = client.get("/api/cli/sessions/run-abc/log", params={"max_lines": 999999})
    assert r.status_code == 400  # normalized to 400 E_BE_BAD_REQUEST envelope


# ---- Step 74: live tail (`follow=true`) --------------------------------------
#
# Follow mode is the FE `useSessionLogTail` contract: after draining the
# initial backlog the stream must (a) keep polling for new lines up to the
# server deadline, (b) still terminate cleanly with an `end` frame carrying
# the resumable cursor, and (c) not hang past its deadline even when the
# writer is idle. These tests pin each of those three properties.

def test_follow_terminates_on_deadline_with_end_frame(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Idle follow returns within the deadline and reports the cursor."""
    import BE.routes.cli_observability as mod
    monkeypatch.setattr(mod, "_TAIL_FOLLOW_SECONDS", 0.4)
    monkeypatch.setattr(mod, "_TAIL_POLL_SECONDS", 0.05)

    log_root = tmp_path / "app_log_root"
    _seed(log_root, "run-follow-idle", lines=2)

    import time as _t
    t0 = _t.monotonic()
    r = client.get(
        "/api/cli/sessions/run-follow-idle/log",
        params={"follow": "true", "max_lines": 100},
    )
    elapsed = _t.monotonic() - t0

    assert r.status_code == 200
    # Deadline is 0.4s; allow generous ceiling for CI jitter but prove
    # the loop is bounded (a regression that never exits would time out
    # the httpx client at its default 5s, not stop here).
    assert elapsed < 3.0, f"follow did not honor deadline (elapsed={elapsed:.2f}s)"

    frames = _parse_sse(r.text)
    data_frames = [f for f in frames if "id" in f]
    end_frames = [f for f in frames if f.get("event") == "end"]
    assert [f["id"] for f in data_frames] == ["1", "2"]
    end_payload = json.loads(end_frames[0]["data"])
    assert end_payload == {
        "RunId": "run-follow-idle",
        "LineCount": 2,
        "NextSinceLine": 2,
        "Truncated": False,
    }


def test_follow_terminates_when_max_lines_reached(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """`max_lines` short-circuits follow before the deadline fires."""
    import BE.routes.cli_observability as mod
    # Long deadline on purpose: the test must prove `max_lines` is what
    # exits the loop, not the timer.
    monkeypatch.setattr(mod, "_TAIL_FOLLOW_SECONDS", 30.0)
    monkeypatch.setattr(mod, "_TAIL_POLL_SECONDS", 0.05)

    log_root = tmp_path / "app_log_root"
    _seed(log_root, "run-follow-cap", lines=10)

    import time as _t
    t0 = _t.monotonic()
    r = client.get(
        "/api/cli/sessions/run-follow-cap/log",
        params={"follow": "true", "max_lines": 3},
    )
    elapsed = _t.monotonic() - t0

    assert r.status_code == 200
    assert elapsed < 2.0, f"max_lines did not short-circuit follow (elapsed={elapsed:.2f}s)"

    frames = _parse_sse(r.text)
    data_frames = [f for f in frames if "id" in f]
    end_frames = [f for f in frames if f.get("event") == "end"]
    assert [f["id"] for f in data_frames] == ["1", "2", "3"]
    end_payload = json.loads(end_frames[0]["data"])
    assert end_payload["LineCount"] == 3
    assert end_payload["NextSinceLine"] == 3
    assert end_payload["Truncated"] is True


def test_follow_picks_up_lines_appended_mid_stream(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A writer appending lines during follow must land in the stream."""
    import BE.routes.cli_observability as mod
    monkeypatch.setattr(mod, "_TAIL_FOLLOW_SECONDS", 2.0)
    monkeypatch.setattr(mod, "_TAIL_POLL_SECONDS", 0.05)

    log_root = tmp_path / "app_log_root"
    path = _seed(log_root, "run-follow-live", lines=1)

    # Schedule an append shortly after the request starts so the follow
    # loop is already polling when the new line lands. A plain thread
    # keeps this deterministic against Starlette's sync TestClient.
    import threading
    import time as _t

    def _appender() -> None:
        _t.sleep(0.3)
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({
                "Ts": "2026-07-21T01:02:04.000Z",
                "Level": "INFO",
                "Source": "worker-cli",
                "Pid": 4242,
                "RunId": "run-follow-live",
                "Subcmd": "run",
                "Event": "appended",
                "Msg": "late line",
                "Ctx": {},
            }) + "\n")

    t = threading.Thread(target=_appender, daemon=True)
    t.start()
    try:
        r = client.get(
            "/api/cli/sessions/run-follow-live/log",
            params={"follow": "true", "max_lines": 2},
        )
    finally:
        t.join(timeout=5)

    assert r.status_code == 200
    frames = _parse_sse(r.text)
    data_frames = [f for f in frames if "id" in f]
    end_frames = [f for f in frames if f.get("event") == "end"]

    # Both the pre-existing line and the mid-stream append must appear.
    assert [f["id"] for f in data_frames] == ["1", "2"], (
        f"appended line was not observed by follow loop; frames={data_frames!r}"
    )
    appended = json.loads(data_frames[1]["data"])
    assert appended["Event"] == "appended"

    end_payload = json.loads(end_frames[0]["data"])
    assert end_payload["LineCount"] == 2
    assert end_payload["NextSinceLine"] == 2
    assert end_payload["Truncated"] is True
