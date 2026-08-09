"""Plan 90 Step 67 - negative-path suite for `processing-cli watch`.

Anchors:
- `spec/21-app/75-processing-cli.md` §Acceptance #2: the watch loop
  MUST process each message exactly once AND MUST continue after a
  per-message failure. Bubbling an `AppError` from a single poison
  file breaks both invariants; this suite pins that.
- `spec/21-app/76-cli-log-and-ipc.md` §"Message lifecycle": poison
  files must be acked so they cannot be re-picked forever (rename to
  `*.msg.ack.json`).
- `BE/cli/common/ipc.py::receive` - raises `E_IPC_PAYLOAD_INVALID`
  on bad JSON, `E_IPC_UNKNOWN_KIND` on unrecognised `Kind`.
- `BE/cli/processing/commands/evaluate.py::_read_bundle` - raises
  `E_RULE_BUNDLE_INVALID` on malformed bundles; `handle` raises
  `E_BE_NOT_FOUND` on missing frame paths.

Failure taxonomy asserted (each surfaces in `Failures[]` with the
exact wire code and its source file renamed to `*.msg.ack.json`):

    Fault injected                          -> Expected Code
    -----------------------------------------------------------------
    corrupt JSON body                       -> E_IPC_PAYLOAD_INVALID
    valid JSON, unknown Kind                -> E_IPC_UNKNOWN_KIND
    valid FrameReady, missing frame file    -> E_BE_NOT_FOUND
    valid FrameReady, malformed bundle      -> E_RULE_BUNDLE_INVALID

Every scenario also drops a healthy FrameReady AFTER the poison to
prove the tail loop kept draining (this is the "spec 75 #2 continues
on failure" invariant; without the poison-safe drain in `watch.py`,
the healthy message would sit stuck behind the poison).
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


def _env(log_root: Path, ipc_root: Path) -> dict[str, str]:
    e = os.environ.copy()
    e["APP_LOG_ROOT"] = str(log_root)
    e["APP_IPC_ROOT"] = str(ipc_root)
    return e


def _run_watch(env: dict[str, str], *args: str, timeout: int = 25) -> tuple[int, dict, str]:
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.processing.main", "watch", *args],
        capture_output=True, text=True, timeout=timeout,
        cwd=str(REPO_ROOT), env=env,
    )
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    payload = json.loads(lines[-1]) if lines else {}
    return proc.returncode, payload, proc.stderr


def _drop_frame_ready(ipc_root: Path, *, run_id: str, seq: int, frame_path: Path) -> Path:
    return _ipc.send(
        ipc_root, "processing-in", "FrameReady",
        {
            "FramePath": str(frame_path),
            "Serial": "SN-ERR",
            "ExposureUs": 10000,
            "Gain": 1.0,
            "Roi": {"X": 0, "Y": 0, "W": 640, "H": 480},
            "CapturedAt": "2026-07-21T00:00:00.000000Z",
        },
        run_id=run_id, from_="worker-cli", to="processing-cli", seq=seq,
    )


def _drop_raw(ipc_root: Path, name: str, body: str) -> Path:
    """Write a file directly into processing-in/, bypassing `ipc.send`."""
    drop = ipc_root / "processing-in"
    drop.mkdir(parents=True, exist_ok=True)
    p = drop / name
    p.write_text(body, encoding="utf-8")
    return p


@pytest.fixture()
def frame_png(tmp_path: Path) -> Path:
    p = tmp_path / "frame.png"
    p.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)
    return p


@pytest.fixture()
def bundle_empty(tmp_path: Path) -> Path:
    p = tmp_path / "bundle.json"
    p.write_text(json.dumps({"schemaVersion": 2, "rules": []}))
    return p


@pytest.fixture()
def bundle_bad(tmp_path: Path) -> Path:
    p = tmp_path / "bundle_bad.json"
    p.write_text("{not valid json", encoding="utf-8")
    return p


@pytest.fixture()
def roots(tmp_path: Path) -> dict[str, Path]:
    log = tmp_path / "log"
    ipc = tmp_path / "ipc"
    log.mkdir()
    ipc.mkdir()
    return {"log": log, "ipc": ipc}


def _watch_args(bundle: Path) -> list[str]:
    return [
        "--bundle", str(bundle),
        "--poll-interval", "0.05",
        "--idle-exit", "0.4",
        "--duration", "8",
    ]


def _assert_failure_code(env_out: dict, code: str) -> dict:
    data = env_out["Results"][0]
    failures = data.get("Failures", [])
    matches = [f for f in failures if f.get("Code") == code]
    assert matches, (
        f"expected a Failure with Code={code!r}; got failures={failures!r}, "
        f"processed={data.get('Processed')}"
    )
    return matches[0]


# ---------------------------------------------------------------------------
# E_IPC_PAYLOAD_INVALID: corrupt JSON body
# ---------------------------------------------------------------------------


def test_watch_survives_corrupt_json(roots, bundle_empty, frame_png):
    env = _env(roots["log"], roots["ipc"])

    # Poison file: lexically first ULID prefix so `receive` hits it first.
    _drop_raw(roots["ipc"], "0000000000_poison.msg.json", "{ not: json,")
    # Sibling healthy message: MUST still be processed after the poison
    # is acked, proving the tail loop keeps draining.
    _drop_frame_ready(roots["ipc"], run_id="run-CORRUPT", seq=1, frame_path=frame_png)

    rc, env_out, stderr = _run_watch(env, *_watch_args(bundle_empty))
    assert rc == 0, (env_out, stderr)
    data = env_out["Results"][0]
    _assert_failure_code(env_out, "E_IPC_PAYLOAD_INVALID")
    assert data["Processed"] == 1, data
    # Poison file renamed to `.msg.ack.json` (spec 76 §Message lifecycle).
    live = list((roots["ipc"] / "processing-in").glob("*.msg.json"))
    acked = list((roots["ipc"] / "processing-in").glob("*.msg.ack.json"))
    assert live == [], live
    assert len(acked) == 2, acked  # poison + healthy


# ---------------------------------------------------------------------------
# E_IPC_UNKNOWN_KIND: valid JSON, unrecognised Kind
# ---------------------------------------------------------------------------


def test_watch_survives_unknown_kind(roots, bundle_empty, frame_png):
    env = _env(roots["log"], roots["ipc"])

    body = json.dumps({
        "MsgId": "0000000000unknown",
        "Kind": "MysteryKind",
        "From": "worker-cli", "To": "processing-cli",
        "RunId": "run-U", "Seq": 1, "Ts": "2026-07-21T00:00:00.000000Z",
        "Payload": {"X": 1}, "Envelope": None,
    })
    _drop_raw(roots["ipc"], "0000000000_unknown.msg.json", body)
    _drop_frame_ready(roots["ipc"], run_id="run-U-OK", seq=1, frame_path=frame_png)

    rc, env_out, stderr = _run_watch(env, *_watch_args(bundle_empty))
    assert rc == 0, (env_out, stderr)
    data = env_out["Results"][0]
    _assert_failure_code(env_out, "E_IPC_UNKNOWN_KIND")
    assert data["Processed"] == 1, data
    assert list((roots["ipc"] / "processing-in").glob("*.msg.json")) == []


# ---------------------------------------------------------------------------
# E_BE_NOT_FOUND: valid FrameReady with a missing frame file
# ---------------------------------------------------------------------------


def test_watch_reports_missing_frame(roots, bundle_empty, frame_png, tmp_path):
    env = _env(roots["log"], roots["ipc"])

    ghost = tmp_path / "does_not_exist.png"
    _drop_frame_ready(roots["ipc"], run_id="run-NF", seq=1, frame_path=ghost)
    _drop_frame_ready(roots["ipc"], run_id="run-NF-OK", seq=1, frame_path=frame_png)

    rc, env_out, stderr = _run_watch(env, *_watch_args(bundle_empty))
    assert rc == 0, (env_out, stderr)
    data = env_out["Results"][0]
    fail = _assert_failure_code(env_out, "E_BE_NOT_FOUND")
    assert fail["RunId"] == "run-NF", fail
    assert data["Processed"] == 1, data
    # Both source files acked (poison AND healthy).
    assert list((roots["ipc"] / "processing-in").glob("*.msg.json")) == []


# ---------------------------------------------------------------------------
# E_RULE_BUNDLE_INVALID: malformed bundle applies to every message
# ---------------------------------------------------------------------------


def test_watch_reports_bundle_invalid(roots, bundle_bad, frame_png):
    env = _env(roots["log"], roots["ipc"])

    _drop_frame_ready(roots["ipc"], run_id="run-B", seq=1, frame_path=frame_png)
    _drop_frame_ready(roots["ipc"], run_id="run-B", seq=2, frame_path=frame_png)

    rc, env_out, stderr = _run_watch(env, *_watch_args(bundle_bad))
    assert rc == 0, (env_out, stderr)
    data = env_out["Results"][0]
    # Every message failed with the same bundle-level code.
    fails = [f for f in data.get("Failures", []) if f.get("Code") == "E_RULE_BUNDLE_INVALID"]
    assert len(fails) == 2, data
    assert data["Processed"] == 0, data
    # Both source files acked so a re-run won't spin on them.
    assert list((roots["ipc"] / "processing-in").glob("*.msg.json")) == []
    acked = list((roots["ipc"] / "processing-in").glob("*.msg.ack.json"))
    assert len(acked) == 2, acked
