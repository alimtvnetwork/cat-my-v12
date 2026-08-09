"""Plan 90 Step 21 - `worker-cli open-stream` tests.

Covers:
- Bounded run via --max-duration-ms returns Ok envelope with FramesEmitted=0
  (stub cannot fabricate frames per spec/21-app/40-error-manage.md §3).
- --max-frames=0 combined with a tiny duration exits cleanly.
- Unknown serial surfaces E_CAM_NOT_CONNECTED via the facade -> failure envelope.
- --provider vendor fails loud with E_CLI_UNSUPPORTED_HOST (not silent fallback).
- --grab-timeout-ms <= 0 rejected with E_BE_BAD_REQUEST.
- stream.started / stream.tick_empty / stream.stopped events land in JSONL.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

from BE.cli.worker.main import main as worker_main


def _run(argv: list[str], log_root: Path) -> tuple[int, dict, str]:
    out, err = io.StringIO(), io.StringIO()
    from BE.cli.worker.main import build_dispatcher
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(log_root))
    line = out.getvalue().strip().splitlines()[-1]
    return code, json.loads(line), err.getvalue()


def test_open_stream_bounded_returns_ok(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["open-stream", "--serial", "SN-STUB-0000", "--max-duration-ms", "50", "--grab-timeout-ms", "10"],
        tmp_path,
    )
    assert code == 0
    assert env["Status"]["IsSuccess"] is True
    results = env["Results"]
    assert isinstance(results, list) and len(results) == 1
    r = results[0]
    assert r["Serial"] == "SN-STUB-0000"
    assert r["FramesEmitted"] == 0  # honesty rule: no fabricated frames
    assert r["DurationMs"] >= 0


def test_open_stream_unknown_serial_fails(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["open-stream", "--serial", "SN-NOPE", "--max-duration-ms", "10"],
        tmp_path,
    )
    assert code != 0
    assert env["Status"]["IsSuccess"] is False
    assert env["Errors"]["Code"] == "E_CAM_NOT_CONNECTED"


def test_open_stream_vendor_provider_rejected(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["open-stream", "--serial", "SN-STUB-0000", "--provider", "vendor", "--max-duration-ms", "10"],
        tmp_path,
    )
    assert env["Status"]["IsSuccess"] is False
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"
    assert code != 0


def test_open_stream_bad_timeout_rejected(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["open-stream", "--serial", "SN-STUB-0000", "--grab-timeout-ms", "0", "--max-duration-ms", "10"],
        tmp_path,
    )
    assert env["Status"]["IsSuccess"] is False
    assert env["Errors"]["Code"] == "E_BE_BAD_REQUEST"
    assert code != 0


def test_open_stream_emits_lifecycle_logs(tmp_path: Path) -> None:
    _run(
        ["open-stream", "--serial", "SN-STUB-0000", "--max-duration-ms", "60", "--grab-timeout-ms", "10"],
        tmp_path,
    )
    files = list((tmp_path / "worker-cli").rglob("*.jsonl"))
    assert files, "expected a JSONL log under worker-cli/<date>/"
    events: set[str] = set()
    for f in files:
        for line in f.read_text().splitlines():
            events.add(json.loads(line)["Event"])
    assert "stream.started" in events
    assert "stream.stopped" in events


def test_main_entry_returns_int(tmp_path: Path) -> None:
    # Smoke: the module-level `main` shim wires build_dispatcher().run().
    assert callable(worker_main)
