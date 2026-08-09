"""Plan 90 Step 18 tests - `run_session` context manager."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from BE.cli.common.exit_codes import ExitCode
from BE.cli.common.session import run_session
from BE.cli.common.session_index import read_sessions
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _read_log(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def test_clean_exit_records_ok(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with run_session("worker-cli", "capture") as ctx:
        ctx.logger.log("INFO", "work.did", "did the thing")
        run_id = ctx.run_id
        log_path = ctx.log_path
    rows = read_sessions(tmp_path)
    assert len(rows) == 1
    assert rows[0].RunId == run_id
    assert rows[0].ExitCode == ExitCode.Ok.value
    assert rows[0].EndedAt is not None
    events = [r["Event"] for r in _read_log(log_path)]
    assert events[0] == "session.open"
    assert "work.did" in events
    assert events[-1] == "session.close"


def test_apperror_domain_maps_to_domain_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with pytest.raises(AppError):
        with run_session("worker-cli", "capture") as ctx:
            raise AppError(ErrorCode.E_BE_BAD_REQUEST, "bad")
    row = read_sessions(tmp_path)[0]
    assert row.ExitCode == ExitCode.DomainError.value


def test_apperror_io_family_maps_to_io_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with pytest.raises(AppError):
        with run_session("worker-cli", "capture"):
            raise AppError(ErrorCode.E_IPC_WRITE_FAILED, "disk gone")
    row = read_sessions(tmp_path)[0]
    assert row.ExitCode == ExitCode.IoError.value


def test_apperror_vendor_family_maps_to_vendor_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with pytest.raises(AppError):
        with run_session("worker-cli", "capture"):
            raise AppError(ErrorCode.E_CAM_NOT_CONNECTED, "no cam", details={"Serial": "X"})
    row = read_sessions(tmp_path)[0]
    assert row.ExitCode == ExitCode.VendorError.value


def test_unknown_exception_falls_back_to_domain_error(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with pytest.raises(RuntimeError):
        with run_session("worker-cli", "capture") as ctx:
            raise RuntimeError("kaboom")
    row = read_sessions(tmp_path)[0]
    assert row.ExitCode == ExitCode.DomainError.value
    log_events = _read_log(ctx.log_path)
    fatal = [r for r in log_events if r["Level"] == "FATAL"]
    assert len(fatal) == 1
    assert fatal[0]["Event"] == "session.exception"
    assert "Trace" in fatal[0]


def test_session_close_runs_even_on_exception(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with pytest.raises(AppError):
        with run_session("worker-cli", "capture"):
            raise AppError(ErrorCode.E_BE_NOT_FOUND, "gone")
    row = read_sessions(tmp_path)[0]
    assert row.EndedAt is not None


def test_explicit_run_id_is_used(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with run_session("worker-cli", "capture", run_id="FIXED123") as ctx:
        assert ctx.run_id == "FIXED123"
    assert read_sessions(tmp_path)[0].RunId == "FIXED123"


def test_systemexit_zero_maps_to_ok(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with pytest.raises(SystemExit):
        with run_session("worker-cli", "capture"):
            raise SystemExit(0)
    assert read_sessions(tmp_path)[0].ExitCode == ExitCode.Ok.value


def test_systemexit_known_code_preserved(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    with pytest.raises(SystemExit):
        with run_session("worker-cli", "capture"):
            raise SystemExit(int(ExitCode.Usage))
    assert read_sessions(tmp_path)[0].ExitCode == ExitCode.Usage.value
