"""Plan 90 Step 45 tests - `worker-cli open` / `close` lease invariant.

Locks the cross-invocation single-camera contract from spec 74
§Acceptance #3:
- `open --serial X` writes a lease under `<APP_DATA_ROOT>/worker/`.
- Second `open --serial X` in a fresh invocation is idempotent.
- `open --serial Y` while X is held (live PID) fails with
  `E_BE_CONFLICT` at `ExitCode.DomainError`.
- `close` is idempotent (no lease -> success with `Released=false`).
- `close --serial Y` while X is held raises `E_BE_CONFLICT`.
- Bad serial fails with `E_CAM_NOT_CONNECTED` and does NOT touch the
  lease file.
- Stale-PID lease is reclaimed with a `lease.reclaimed` log event.
"""

from __future__ import annotations

import io
import json
import os
from pathlib import Path

import pytest

from BE.cli.common.exit_codes import ExitCode
from BE.cli.worker import camera_lease
from BE.cli.worker.main import build_dispatcher


def _run(argv: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[int, dict]:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1
    return code, json.loads(lines[0])


def _lease_file(tmp_path: Path) -> Path:
    return tmp_path / "data" / "worker" / "camera.lease.json"


def test_open_writes_lease_file(tmp_path, monkeypatch) -> None:
    code, env = _run(["open", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"][0]["Serial"] == "SN-STUB-0000"
    assert env["Results"][0]["Reclaimed"] is False
    lease = json.loads(_lease_file(tmp_path).read_text())
    assert lease["Serial"] == "SN-STUB-0000"
    assert lease["Pid"] == os.getpid()


def test_open_same_serial_is_idempotent(tmp_path, monkeypatch) -> None:
    _run(["open", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    code, env = _run(["open", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Status"]["IsSuccess"] is True


def test_open_conflicting_serial_returns_conflict(tmp_path, monkeypatch) -> None:
    _run(["open", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    code, env = _run(["open", "--serial", "SN-STUB-0001"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"


def test_open_unknown_serial_raises_cam_not_connected(tmp_path, monkeypatch) -> None:
    code, env = _run(["open", "--serial", "SN-BOGUS"], tmp_path, monkeypatch)
    assert code == ExitCode.VendorError  # E_CAM_NOT_CONNECTED is vendor-class per dispatcher mapping
    assert env["Errors"]["Code"] == "E_CAM_NOT_CONNECTED"
    # Bad serial must NOT touch the lease file.
    assert not _lease_file(tmp_path).exists()


def test_close_without_lease_is_noop(tmp_path, monkeypatch) -> None:
    code, env = _run(["close"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"][0]["Released"] is False


def test_close_releases_held_lease(tmp_path, monkeypatch) -> None:
    _run(["open", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    code, env = _run(["close"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"][0]["Released"] is True
    assert env["Results"][0]["Serial"] == "SN-STUB-0000"
    assert not _lease_file(tmp_path).exists()


def test_close_wrong_expected_serial_conflicts(tmp_path, monkeypatch) -> None:
    _run(["open", "--serial", "SN-STUB-0000"], tmp_path, monkeypatch)
    code, env = _run(["close", "--serial", "SN-STUB-0001"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Errors"]["Code"] == "E_BE_CONFLICT"


def test_open_vendor_provider_fails_with_vendor_exit(tmp_path, monkeypatch) -> None:
    code, env = _run(["open", "--serial", "SN-STUB-0000", "--provider", "vendor"], tmp_path, monkeypatch)
    assert code == ExitCode.VendorError
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"


def test_stale_pid_lease_is_reclaimed(tmp_path, monkeypatch) -> None:
    data_root = tmp_path / "data"
    (data_root / "worker").mkdir(parents=True)
    # Seed a lease with a definitely-dead PID.
    stale = {"Serial": "SN-STUB-0000", "Pid": 999999999, "RunId": "old", "AcquiredAt": "2020-01-01T00:00:00Z"}
    _lease_file(tmp_path).write_text(json.dumps(stale))

    code, env = _run(["open", "--serial", "SN-STUB-0001"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"][0]["Reclaimed"] is True
    assert env["Results"][0]["Serial"] == "SN-STUB-0001"


def test_lease_module_peek_returns_none_for_missing(tmp_path) -> None:
    assert camera_lease.peek(tmp_path) is None


def test_lease_module_corrupt_lease_raises_preflight(tmp_path) -> None:
    p = tmp_path / "worker" / "camera.lease.json"
    p.parent.mkdir(parents=True)
    p.write_text("not-json")
    from BE.errors.apperror import AppError
    with pytest.raises(AppError) as ei:
        camera_lease.peek(tmp_path)
    assert ei.value.code.value == "E_CLI_PREFLIGHT_FAILED"
