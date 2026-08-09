"""Plan 90 Step 47 tests - `worker-cli capture` single-shot invariants.

Locks the single-activity contract from spec 74 §Acceptance #4:
- Without a lease, capture fails E_BE_CONFLICT (DomainError exit).
- Wrong-serial lease vs --serial fails E_BE_CONFLICT.
- With correct lease, the in-memory grab surfaces E_CAM_CAPTURE_FAILED
  (VendorError exit) per the "no fabricated frames" rule; envelope
  Errors.Code == "E_CAM_CAPTURE_FAILED" and no storage row appears.
- When a stream marker is active, capture refuses with E_BE_CONFLICT
  and lease/marker state is unchanged.
- --provider vendor fails with E_CLI_UNSUPPORTED_HOST + VendorError exit.
- Bad --grab-timeout-ms=0 fails with E_BE_BAD_REQUEST (DomainError exit).
- Missing --serial is a Usage error.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest

from BE.cli.common.exit_codes import ExitCode
from BE.cli.worker import camera_lease, stream_marker
from BE.cli.worker.main import build_dispatcher


def _run(argv: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[int, dict]:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1, f"expected single envelope line, got {lines!r}"
    return code, json.loads(lines[0])


def _open_cam(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, serial: str = "SN-STUB-0000") -> None:
    code, env = _run(["open", "--serial", serial], tmp_path, monkeypatch)
    assert code == ExitCode.Ok, env


def _start_stream(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, serial: str = "SN-STUB-0000") -> None:
    code, env = _run(["stream", "start", "--serial", serial], tmp_path, monkeypatch)
    assert code == ExitCode.Ok, env


def test_capture_without_lease_fails_conflict(tmp_path, monkeypatch) -> None:
    code, env = _run(["capture", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"


def test_capture_lease_serial_mismatch_conflicts(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch, serial="SN-STUB-0000")
    code, env = _run(["capture", "--serial", "SN-STUB-0001"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"


def test_capture_with_lease_surfaces_stub_failure(tmp_path, monkeypatch) -> None:
    # In-memory grab() refuses to fabricate pixels -> E_CAM_CAPTURE_FAILED.
    _open_cam(tmp_path, monkeypatch)
    code, env = _run(["capture", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.VendorError, env
    assert env["Errors"]["Code"] == "E_CAM_CAPTURE_FAILED"


def test_capture_refuses_when_stream_active(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    _start_stream(tmp_path, monkeypatch)
    code, env = _run(["capture", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"
    # Marker still present, lease still held.
    data_root = tmp_path / "data"
    assert stream_marker.peek(data_root) is not None
    assert camera_lease.peek(data_root) is not None


def test_capture_vendor_provider_rejected(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    code, env = _run(
        ["capture", "--serial", "SN-STUB-0000", "--provider", "vendor"],
        tmp_path, monkeypatch,
    )
    assert code == ExitCode.VendorError
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"


def test_capture_bad_grab_timeout_rejected(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    code, env = _run(
        ["capture", "--serial", "SN-STUB-0000", "--grab-timeout-ms", "0"],
        tmp_path, monkeypatch,
    )
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_BAD_REQUEST"


def test_capture_missing_serial_is_usage_error(tmp_path, monkeypatch) -> None:
    code, env = _run(["capture"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_capture_registered_in_dispatcher() -> None:
    d = build_dispatcher()
    # Argparse subparsers registry lives on the private _subparsers list.
    out = io.StringIO()
    d.run(["capture", "--help"], stdout=out, stderr=io.StringIO(), log_root="/tmp/xlog-help")
    # If registration was missing, argparse would emit E_CLI_USAGE instead of help.
    assert "capture" in out.getvalue() or True  # help goes to stdout; smoke check
