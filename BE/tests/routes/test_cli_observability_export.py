"""Plan 90 Step 144 - `GET /api/cli/sessions/{run_id}/export` (zip bundle)."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import pytest
from BE.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    for env_key in ("APP_LOG_ROOT", "APP_DB_ROOT", "APP_IPC_ROOT", "APP_CONFIG_ROOT", "APP_DATA_ROOT"):
        monkeypatch.setenv(env_key, str(tmp_path / env_key.lower()))
    return TestClient(create_app())


def _seed_log(log_root: Path, run_id: str) -> Path:
    d = log_root / "worker-cli" / "2026-07-21"
    d.mkdir(parents=True, exist_ok=True)
    f = d / "010203-4242-run.jsonl"
    with f.open("w", encoding="utf-8") as fh:
        for i in range(3):
            fh.write(json.dumps({
                "Ts": "2026-07-21T01:02:03.000Z", "Level": "INFO",
                "Source": "worker-cli", "Pid": 4242, "RunId": run_id,
                "Subcmd": "run", "Event": f"e{i}", "Msg": f"line {i}", "Ctx": {},
            }) + "\n")
    return f


def _seed_ipc(ipc_root: Path, run_id: str) -> None:
    mb = ipc_root / "worker-out"
    mb.mkdir(parents=True, exist_ok=True)
    (mb / "01HZZZ.msg.json").write_text(
        json.dumps({"MsgId": "01HZZZ", "RunId": run_id, "Payload": {"k": 1}}),
        encoding="utf-8",
    )
    # Another run's message - must NOT appear in the export.
    (mb / "01HAAA.msg.json").write_text(
        json.dumps({"MsgId": "01HAAA", "RunId": "other-run", "Payload": {}}),
        encoding="utf-8",
    )


def test_export_not_found_for_unknown_run(client: TestClient) -> None:
    r = client.get("/api/cli/sessions/does-not-exist/export")
    assert r.status_code == 404


def test_export_returns_zip_with_manifest_log_and_ipc(
    client: TestClient, tmp_path: Path
) -> None:
    run_id = "010203-4242-run"
    _seed_log(tmp_path / "app_log_root", run_id)
    _seed_ipc(tmp_path / "app_ipc_root", run_id)

    r = client.get(f"/api/cli/sessions/{run_id}/export")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/zip"
    assert f'cli-session-{run_id}.zip' in r.headers["content-disposition"]

    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        names = set(zf.namelist())
        assert "manifest.json" in names
        assert "session.json" in names
        assert "log.jsonl" in names
        # Matching IPC file included; other-run file excluded.
        assert "ipc/worker-out/01HZZZ.msg.json" in names
        assert "ipc/worker-out/01HAAA.msg.json" not in names

        manifest = json.loads(zf.read("manifest.json"))
        assert manifest["RunId"] == run_id
        assert manifest["Contents"]["IpcFiles"] == 1
        assert manifest["Truncated"]["Log"] is False
        assert manifest["Truncated"]["Ipc"] is False

        session_doc = json.loads(zf.read("session.json"))
        assert session_doc["Summary"]["RunId"] == run_id
        assert session_doc["EntryEnvelope"]["CorrelationId"] == run_id
        assert "Context" in session_doc["EntryEnvelope"]

        log_bytes = zf.read("log.jsonl")
        # 3 JSONL rows seeded, no truncation marker.
        assert log_bytes.count(b"\n") == 3
        assert b"_Truncated" not in log_bytes
