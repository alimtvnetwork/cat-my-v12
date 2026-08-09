"""Plan 90 Step 60 - `processing-cli watch` acceptance tests.

Pins spec/21-app/75 §Acceptance #2 (poll IPC dir, exactly-once on
`(RunId, Seq)`, emit ResultReady to sibling dir) and the argparse
guard rails on the exit-condition flags.

Uses `subprocess` so the real dispatcher / envelope / exit-code
contract is exercised end-to-end (same pattern as
`test_evaluate.py` / `test_batch.py`).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from BE.cli.common import ipc as _ipc

REPO_ROOT = Path(__file__).resolve().parents[4]


def _run(env_overrides: dict[str, str], *args: str, timeout: int = 20) -> tuple[int, dict, str]:
    env = os.environ.copy()
    env.update(env_overrides)
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.processing.main", "watch", *args],
        capture_output=True, text=True, timeout=timeout,
        cwd=str(REPO_ROOT), env=env,
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload, proc.stderr


@pytest.fixture()
def bundle_empty(tmp_path: Path) -> Path:
    b = tmp_path / "bundle.json"
    b.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    return b


@pytest.fixture()
def frame_png(tmp_path: Path) -> Path:
    f = tmp_path / "frame.png"
    f.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)
    return f


@pytest.fixture()
def roots(tmp_path: Path) -> dict[str, Path]:
    log = tmp_path / "log"
    ipc = tmp_path / "ipc"
    log.mkdir()
    ipc.mkdir()
    return {"log": log, "ipc": ipc}


def _env(roots: dict[str, Path]) -> dict[str, str]:
    return {
        "APP_LOG_ROOT": str(roots["log"]),
        "APP_IPC_ROOT": str(roots["ipc"]),
    }


def _emit_frame_ready(ipc_root: Path, *, run_id: str, seq: int, frame_path: Path) -> Path:
    return _ipc.send(
        ipc_root, "processing-in", "FrameReady",
        {
            "FramePath": str(frame_path),
            "Serial": "SN-TEST",
            "ExposureUs": 10000,
            "Gain": 1.0,
            "Roi": {"X": 0, "Y": 0, "W": 640, "H": 480},
            "CapturedAt": "2026-07-21T00:00:00.000000Z",
        },
        run_id=run_id, from_="worker-cli", to="processing-cli", seq=seq,
    )


def test_requires_bundle(roots):
    rc, _env_payload, stderr = _run(_env(roots))
    assert rc != 0
    assert "--bundle" in stderr or "required" in stderr


def test_rejects_bad_poll_interval(roots, bundle_empty):
    rc, env, _ = _run(
        _env(roots),
        "--bundle", str(bundle_empty),
        "--poll-interval", "0",
        "--duration", "0.2",
    )
    assert rc != 0
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_idle_exit_returns_ok_with_zero_processed(roots, bundle_empty):
    rc, env, _ = _run(
        _env(roots),
        "--bundle", str(bundle_empty),
        "--poll-interval", "0.05",
        "--idle-exit", "0.2",
    )
    assert rc == 0, env
    data = env["Results"][0]
    assert data["Processed"] == 0
    assert data["Failed"] == 0
    assert data["SkippedDuplicates"] == 0
    assert data["InDir"] == "processing-in"
    assert data["OutDir"] == "processing-out"


def test_processes_frame_ready_and_emits_result_ready(roots, bundle_empty, frame_png):
    _emit_frame_ready(roots["ipc"], run_id="run-A", seq=1, frame_path=frame_png)
    rc, env, _ = _run(
        _env(roots),
        "--bundle", str(bundle_empty),
        "--poll-interval", "0.05",
        "--max-messages", "1",
        "--duration", "5",
    )
    assert rc == 0, env
    data = env["Results"][0]
    assert data["Processed"] == 1
    assert data["Failed"] == 0
    # Source message was acked (renamed).
    in_dir = roots["ipc"] / "processing-in"
    assert list(in_dir.glob("*.msg.json")) == []
    assert list(in_dir.glob("*.msg.ack.json")), "FrameReady must be acked"
    # ResultReady emitted in out-dir with matching RunId/Seq.
    out_files = list((roots["ipc"] / "processing-out").glob("*.msg.json"))
    assert len(out_files) == 1
    rr = json.loads(out_files[0].read_text(encoding="utf-8"))
    assert rr["Kind"] == "ResultReady"
    assert rr["RunId"] == "run-A"
    assert rr["Seq"] == 1
    assert rr["Payload"]["FrameSeq"] == 1
    assert rr["Payload"]["Decision"] == "pass"


def test_duplicate_run_seq_pair_is_skipped(roots, bundle_empty, frame_png):
    _emit_frame_ready(roots["ipc"], run_id="run-B", seq=7, frame_path=frame_png)
    _emit_frame_ready(roots["ipc"], run_id="run-B", seq=7, frame_path=frame_png)
    rc, env, _ = _run(
        _env(roots),
        "--bundle", str(bundle_empty),
        "--poll-interval", "0.05",
        "--idle-exit", "0.3",
        "--duration", "5",
    )
    assert rc == 0, env
    data = env["Results"][0]
    assert data["Processed"] == 1
    assert data["SkippedDuplicates"] == 1


def test_missing_frame_lands_in_failures(roots, bundle_empty, tmp_path):
    _emit_frame_ready(
        roots["ipc"], run_id="run-C", seq=2,
        frame_path=tmp_path / "does-not-exist.png",
    )
    rc, env, _ = _run(
        _env(roots),
        "--bundle", str(bundle_empty),
        "--poll-interval", "0.05",
        "--max-messages", "1",
        "--duration", "5",
    )
    assert rc == 0, env
    data = env["Results"][0]
    assert data["Processed"] == 0
    assert data["Failed"] == 1
    assert data["Failures"][0]["Code"] == "E_BE_NOT_FOUND"
    # Poison message must still be acked, so it does not spin forever.
    assert list((roots["ipc"] / "processing-in").glob("*.msg.json")) == []
