"""Plan 90 Step 46 tests - `worker-cli stream start|stop` split-phase.

Locks the cross-invocation streaming contract from spec 74 §Subcommands:
- `stream start` requires a held camera lease with matching serial.
- Second same-serial `stream start` is idempotent (AlreadyStreaming=true).
- Conflicting-serial `stream start` (marker or lease) fails E_BE_CONFLICT.
- `stream stop` is idempotent (no marker -> Stopped=false).
- `stream stop --serial` mismatch fails E_BE_CONFLICT.
- `--provider vendor` fails with E_CLI_UNSUPPORTED_HOST + VendorError exit.
- Bad usage (missing action or --serial on start) fails with Usage exit.
- Corrupt marker fails with E_CLI_PREFLIGHT_FAILED at Usage exit.
"""

from __future__ import annotations

import io
import json
import os
from pathlib import Path

import pytest

from BE.cli.common.exit_codes import ExitCode
from BE.cli.worker import stream_marker
from BE.cli.worker.main import build_dispatcher


def _run(argv: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[int, dict]:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1, f"expected single envelope line, got {lines!r}"
    return code, json.loads(lines[0])


def _marker_file(tmp_path: Path) -> Path:
    return tmp_path / "data" / "worker" / stream_marker.MARKER_FILENAME


def _open_cam(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, serial: str = "SN-STUB-0000") -> None:
    code, _env = _run(["open", "--serial", serial], tmp_path, monkeypatch)
    assert code == ExitCode.Ok


# -------- start --------

def test_start_without_lease_fails_conflict(tmp_path, monkeypatch) -> None:
    code, env = _run(["stream", "start", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"
    assert not _marker_file(tmp_path).exists()


def test_start_with_lease_writes_marker(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    code, env = _run(["stream", "start", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok, env
    r = env["Results"][0]
    assert r["Serial"] == "SN-STUB-0000"
    assert r["Pid"] == os.getpid()
    assert r["AlreadyStreaming"] is False
    m = json.loads(_marker_file(tmp_path).read_text())
    assert m["Serial"] == "SN-STUB-0000"


def test_start_same_serial_is_idempotent(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    _run(["stream", "start", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    code, env = _run(["stream", "start", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"][0]["AlreadyStreaming"] is True


def test_start_lease_serial_mismatch_conflicts(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch, serial="SN-STUB-0000")
    code, env = _run(["stream", "start", "--serial", "SN-STUB-0001"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"
    # No marker was written.
    assert not _marker_file(tmp_path).exists()


def test_start_vendor_provider_fails_vendor_exit(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    code, env = _run(
        ["stream", "start", "--serial", "SN-STUB-0000", "--provider", "vendor"],
        tmp_path, monkeypatch,
    )
    assert code == ExitCode.VendorError
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"


def test_start_missing_serial_is_usage_error(tmp_path, monkeypatch) -> None:
    code, env = _run(["stream", "start"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


# -------- stop --------

def test_stop_without_marker_is_noop(tmp_path, monkeypatch) -> None:
    code, env = _run(["stream", "stop"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"][0]["Stopped"] is False
    assert env["Results"][0]["Serial"] is None


def test_stop_clears_marker(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    _run(["stream", "start", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert _marker_file(tmp_path).exists()
    code, env = _run(["stream", "stop"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"][0]["Stopped"] is True
    assert env["Results"][0]["Serial"] == "SN-STUB-0000"
    assert not _marker_file(tmp_path).exists()


def test_stop_with_wrong_expected_serial_conflicts(tmp_path, monkeypatch) -> None:
    _open_cam(tmp_path, monkeypatch)
    _run(["stream", "start", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    code, env = _run(["stream", "stop", "--serial", "SN-STUB-0001"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"
    # Marker still present because stop refused.
    assert _marker_file(tmp_path).exists()


# -------- dispatcher / usage --------

def test_missing_action_is_usage_error(tmp_path, monkeypatch) -> None:
    code, env = _run(["stream"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_corrupt_marker_raises_preflight(tmp_path, monkeypatch) -> None:
    # Seed a corrupt marker so peek() raises during start.
    marker = _marker_file(tmp_path)
    marker.parent.mkdir(parents=True)
    marker.write_text("{not-json")
    _open_cam(tmp_path, monkeypatch)  # lease can be acquired independently
    code, env = _run(["stream", "start", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Errors"]["Code"] == "E_CLI_PREFLIGHT_FAILED"
