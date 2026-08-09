"""Plan 90 Step 66 - end-to-end worker->watch chain via a real IPC dir.

Anchors:
- `spec/21-app/75-processing-cli.md` §Acceptance #2 (poll IPC dir, exactly
  once per `(RunId, Seq)`, emit `ResultReady` back).
- `spec/21-app/76-cli-log-and-ipc.md` §"Message lifecycle" (producer dir
  `worker-out/` visible to consumer as `processing-in/` via link).
- `BE/cli/common/ipc_bootstrap.py::bootstrap_ipc_dirs` (installs the
  `processing-in -> worker-out` link; junction fallback on Windows).

What this pins that unit tests do not:
- The cross-CLI FIFO contract. `test_watch.py` emits directly into
  `processing-in`; here we drop into `worker-out` and rely on the
  bootstrap link so a regression that breaks link installation (or
  drops the link map) is caught.
- Both `worker-cli` and `processing-cli` share the same `APP_LOG_ROOT`
  and each writes its own session log file under `<log>/<source>/...`.
- Duplicate `(RunId, Seq)` across distinct ULIDs is coalesced to one
  processed message + one skipped, per spec 75 §Acceptance #2.

Why we do NOT invoke `worker-cli capture-frames` for the emitter:
the in-memory `CameraFacade.grab` raises `E_CAM_CAPTURE_FAILED` on
purpose (`BE/sdk_facade/camera.py` "no fabricated frames" rule), so
`capture-frames` never emits `FrameReady` today. We use `worker-cli
version` to produce the required worker session log and drop
`FrameReady` messages via `ipc.send` from the same process the spec
would use in production (both call the same public writer).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from BE.cli.common import ipc as _ipc
from BE.cli.common.ipc_bootstrap import bootstrap_ipc_dirs

REPO_ROOT = Path(__file__).resolve().parents[4]


def _env(log_root: Path, ipc_root: Path) -> dict[str, str]:
    e = os.environ.copy()
    e["APP_LOG_ROOT"] = str(log_root)
    e["APP_IPC_ROOT"] = str(ipc_root)
    return e


def _run(module: str, env: dict[str, str], *args: str, timeout: int = 25) -> tuple[int, dict, str]:
    proc = subprocess.run(
        [sys.executable, "-m", module, *args],
        capture_output=True, text=True, timeout=timeout,
        cwd=str(REPO_ROOT), env=env,
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload, proc.stderr


def _emit_frame_ready(ipc_root: Path, dir_: str, *, run_id: str, seq: int, frame_path: Path) -> Path:
    return _ipc.send(
        ipc_root, dir_, "FrameReady",
        {
            "FramePath": str(frame_path),
            "Serial": "SN-E2E",
            "ExposureUs": 10000,
            "Gain": 1.0,
            "Roi": {"X": 0, "Y": 0, "W": 640, "H": 480},
            "CapturedAt": "2026-07-21T00:00:00.000000Z",
        },
        run_id=run_id, from_="worker-cli", to="processing-cli", seq=seq,
    )


@pytest.fixture()
def bundle_empty(tmp_path: Path) -> Path:
    p = tmp_path / "bundle.json"
    p.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    return p


@pytest.fixture()
def frame_png(tmp_path: Path) -> Path:
    p = tmp_path / "frame.png"
    p.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)
    return p


@pytest.fixture()
def roots(tmp_path: Path) -> dict[str, Path]:
    log = tmp_path / "log"
    ipc = tmp_path / "ipc"
    log.mkdir()
    ipc.mkdir()
    return {"log": log, "ipc": ipc}


def test_worker_to_watch_chain_across_link(roots, bundle_empty, frame_png):
    """Emit into worker-out/, watch polls processing-in/ (linked)."""
    report = bootstrap_ipc_dirs(roots["ipc"])
    # If the runtime cannot install a link (Windows without dev-mode / admin),
    # the link degrades to a standalone directory and worker-out drops would
    # never reach processing-in. That's a valid platform state, but it makes
    # the "cross-link" invariant untestable here; skip loudly rather than
    # silently rewrite the test to bypass the link.
    kind = report.link_kind.get("processing-in", "standalone")
    if kind not in ("symlink", "junction"):
        pytest.skip(f"processing-in link degraded to {kind}: {report.link_failures}")

    env = _env(roots["log"], roots["ipc"])

    # 1) Worker session: real subprocess so a `worker-cli` session log lands
    #    under <APP_LOG_ROOT>/worker-cli/... (spec 76 §"Log storage").
    rc, ver_env, stderr = _run("BE.cli.worker.main", env, "version")
    assert rc == 0, (ver_env, stderr)

    # 2) Drop two FrameReady messages sharing (RunId, Seq) plus one distinct
    #    message. Writes land in worker-out/; watch reads from processing-in/.
    _emit_frame_ready(roots["ipc"], "worker-out", run_id="run-E2E", seq=1, frame_path=frame_png)
    _emit_frame_ready(roots["ipc"], "worker-out", run_id="run-E2E", seq=1, frame_path=frame_png)
    _emit_frame_ready(roots["ipc"], "worker-out", run_id="run-E2E", seq=2, frame_path=frame_png)
    # Sanity: the link view sees the writes.
    assert len(list((roots["ipc"] / "processing-in").glob("*.msg.json"))) == 3

    # 3) Run watch until idle, capped by --duration.
    rc, env_out, stderr = _run(
        "BE.cli.processing.main", env,
        "watch",
        "--bundle", str(bundle_empty),
        "--poll-interval", "0.05",
        "--idle-exit", "0.4",
        "--duration", "8",
    )
    assert rc == 0, (env_out, stderr)
    data = env_out["Results"][0]
    assert data["Processed"] == 2, data
    assert data["Failed"] == 0, data
    assert data["SkippedDuplicates"] == 1, data

    # 4) All source messages acked (renamed .msg.ack.json), none re-deliverable.
    assert list((roots["ipc"] / "processing-in").glob("*.msg.json")) == []
    acked = list((roots["ipc"] / "processing-in").glob("*.msg.ack.json"))
    assert len(acked) == 3, acked

    # 5) ResultReady payloads landed in processing-out/ (spec 76 §Payload shapes).
    out_msgs = sorted((roots["ipc"] / "processing-out").glob("*.msg.json"))
    assert len(out_msgs) == 2, out_msgs
    seqs = set()
    for p in out_msgs:
        rec = json.loads(p.read_text(encoding="utf-8"))
        assert rec["Kind"] == "ResultReady"
        assert rec["RunId"] == "run-E2E"
        assert rec["Payload"]["Decision"] == "pass"
        seqs.add(rec["Seq"])
    assert seqs == {1, 2}

    # 6) Both CLI session log files exist under APP_LOG_ROOT.
    worker_logs = list((roots["log"] / "worker-cli").rglob("*.jsonl"))
    proc_logs = list((roots["log"] / "processing-cli").rglob("*.jsonl"))
    assert worker_logs, f"missing worker-cli session log under {roots['log']}"
    assert proc_logs, f"missing processing-cli session log under {roots['log']}"
