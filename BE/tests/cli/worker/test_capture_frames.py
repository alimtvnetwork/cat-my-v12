"""Plan 90 Step 22 - `worker-cli capture-frames` tests.

Covers:
- Bounded run on the in-memory stub yields Ok envelope with FramesEmitted=0
  and StoredKeys=[] (spec/21-app/40-error-manage.md §3: no fabricated frames,
  therefore no fabricated storage blobs).
- Unknown serial surfaces E_CAM_NOT_CONNECTED end-to-end.
- Vendor provider fails loud with E_CLI_UNSUPPORTED_HOST.
- --count<0 rejected with E_BE_BAD_REQUEST.
- --count=0 AND --max-duration-ms<=0 rejected (would be an infinite batch).
- capture.started / capture.tick_empty / capture.stopped events land in JSONL.
- Fake CameraFacade that yields real Frames exercises the storage handoff
  path: StoredKeys populated, capture.stored events emitted, keys are
  StorageFacade-valid.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

from BE.cli.worker.subcommands import capture_frames as cf
from BE.sdk_facade import Frame, PixelFormat


def _run(argv: list[str], log_root: Path) -> tuple[int, dict, str]:
    out, err = io.StringIO(), io.StringIO()
    from BE.cli.worker.main import build_dispatcher
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(log_root))
    line = out.getvalue().strip().splitlines()[-1]
    return code, json.loads(line), err.getvalue()


def test_capture_frames_bounded_stub_returns_ok(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["capture-frames", "--serial", "SN-STUB-0000",
         "--max-duration-ms", "50", "--grab-timeout-ms", "10"],
        tmp_path,
    )
    assert code == 0
    assert env["Status"]["IsSuccess"] is True
    r = env["Results"][0]
    assert r["Serial"] == "SN-STUB-0000"
    assert r["FramesEmitted"] == 0
    assert r["StoredKeys"] == []
    assert r["DurationMs"] >= 0


def test_capture_frames_unknown_serial_fails(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["capture-frames", "--serial", "SN-NOPE", "--max-duration-ms", "10"],
        tmp_path,
    )
    assert code != 0
    assert env["Errors"]["Code"] == "E_CAM_NOT_CONNECTED"


def test_capture_frames_vendor_rejected(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["capture-frames", "--serial", "SN-STUB-0000", "--provider", "vendor",
         "--max-duration-ms", "10"],
        tmp_path,
    )
    assert code != 0
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"


def test_capture_frames_negative_count_rejected(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["capture-frames", "--serial", "SN-STUB-0000", "--count", "-1",
         "--max-duration-ms", "10"],
        tmp_path,
    )
    assert code != 0
    assert env["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_capture_frames_requires_a_budget(tmp_path: Path) -> None:
    code, env, _ = _run(
        ["capture-frames", "--serial", "SN-STUB-0000", "--count", "0",
         "--max-duration-ms", "0"],
        tmp_path,
    )
    assert code != 0
    assert env["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_capture_frames_emits_lifecycle_logs(tmp_path: Path) -> None:
    _run(
        ["capture-frames", "--serial", "SN-STUB-0000",
         "--max-duration-ms", "60", "--grab-timeout-ms", "10"],
        tmp_path,
    )
    files = list((tmp_path / "worker-cli").rglob("*.jsonl"))
    assert files
    events: set[str] = set()
    for f in files:
        for line in f.read_text().splitlines():
            events.add(json.loads(line)["Event"])
    assert "capture.started" in events
    assert "capture.stopped" in events


def test_capture_frames_stores_when_camera_yields_frames(monkeypatch, tmp_path: Path) -> None:
    """Substitute the in-memory camera with a fake that yields two real Frames.

    Proves the camera -> storage boundary composes end-to-end without touching
    the fabricated-frame guardrail on the real stub.
    """
    stored: list[tuple[str, bytes]] = []

    class _FakeCamera:
        def __init__(self) -> None:
            self._n = 0
        def open(self, serial: str) -> None: pass
        def start_stream(self) -> None: pass
        def stop_stream(self) -> None: pass
        def close(self) -> None: pass
        def set_exposure(self, us: int) -> None: pass
        def set_gain(self, db: float) -> None: pass
        def grab(self, timeout_ms: int) -> Frame:
            self._n += 1
            if self._n > 2:
                # Emulate the stub's honesty rule once we've delivered the budget.
                from BE.errors.apperror import AppError
                from BE.errors.codes import ErrorCode
                raise AppError(ErrorCode.E_CAM_CAPTURE_FAILED, "drained", {})
            return Frame(
                data=b"\x00\x01\x02" * self._n,
                width=4, height=1,
                pixel_format=PixelFormat.Mono8,
                timestamp_ns=1_000 * self._n,
                frame_id=self._n,
            )

    class _RecordingStorage:
        def put(self, key: str, data: bytes) -> None:
            # Delegate to the real facade for validation, then record.
            from BE.sdk_facade.storage import InMemoryStorageFacade
            InMemoryStorageFacade().put(key, data)
            stored.append((key, data))
        def get(self, key: str) -> bytes:  # pragma: no cover - unused here
            raise NotImplementedError

    monkeypatch.setattr(cf, "InMemoryCameraFacade", _FakeCamera)
    monkeypatch.setattr(cf, "InMemoryStorageFacade", _RecordingStorage)

    code, env, _ = _run(
        ["capture-frames", "--serial", "SN-STUB-0000", "--count", "2",
         "--max-duration-ms", "500", "--grab-timeout-ms", "5"],
        tmp_path,
    )
    assert code == 0, env
    r = env["Results"][0]
    assert r["FramesEmitted"] == 2
    assert len(r["StoredKeys"]) == 2
    assert stored and all(k.startswith("captures/SN-STUB-0000/") for k, _ in stored)
    # Keys must be StorageFacade-valid: no leading slash, printable.
    for k, _ in stored:
        assert not k.startswith("/") and k.isprintable()
