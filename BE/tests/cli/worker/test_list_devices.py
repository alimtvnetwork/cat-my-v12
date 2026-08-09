"""Plan 90 Step 44 tests - `worker-cli list-devices`.

Locks the operator-facing verb named in `spec/21-app/74-worker-cli.md`
§Acceptance #2: single-line Universal Envelope on stdout, PascalCase
DeviceInfo records, stub serials present, vendor provider fails with
`E_CLI_UNSUPPORTED_HOST` at `ExitCode.VendorError`, and the session log
records the `list_devices.enumerated` event.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest

from BE.cli.common.exit_codes import ExitCode
from BE.cli.common.session_index import read_sessions
from BE.cli.worker.main import build_dispatcher


def _run(argv: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[int, dict, str]:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1, f"expected exactly one envelope line, got {lines!r}"
    return code, json.loads(lines[0]), err.getvalue()


def test_list_devices_returns_stub_devices(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["list-devices"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Status"]["IsSuccess"] is True
    serials = [r["Serial"] for r in env["Results"]]
    assert "SN-STUB-0000" in serials and "SN-STUB-0001" in serials


def test_list_devices_records_are_pascalcase(tmp_path, monkeypatch) -> None:
    _, env, _ = _run(["list-devices"], tmp_path, monkeypatch)
    for r in env["Results"]:
        assert set(r) == {"Serial", "Model", "Vendor", "Interface", "Status"}


def test_list_devices_defaults_to_memory_provider(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["list-devices"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert len(env["Results"]) >= 1


def test_list_devices_vendor_provider_fails_with_vendor_exit(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["list-devices", "--provider", "vendor"], tmp_path, monkeypatch)
    assert code == ExitCode.VendorError
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"


def test_list_devices_records_session_with_ok_exit(tmp_path, monkeypatch) -> None:
    _run(["list-devices"], tmp_path, monkeypatch)
    rows = read_sessions(tmp_path)
    assert len(rows) == 1
    assert rows[0].Source == "worker-cli"
    assert rows[0].Subcmd == "list-devices"
    assert rows[0].ExitCode == ExitCode.Ok.value


def test_list_devices_writes_enumerated_event_to_jsonl(tmp_path, monkeypatch) -> None:
    _run(["list-devices"], tmp_path, monkeypatch)
    log_files = list((tmp_path / "worker-cli").rglob("*.jsonl"))
    assert len(log_files) == 1
    events = [json.loads(l)["Event"] for l in log_files[0].read_text().splitlines() if l.strip()]
    assert "list_devices.enumerated" in events
    assert events[0] == "session.open" and events[-1] == "session.close"


def test_list_devices_unknown_provider_is_usage(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["list-devices", "--provider", "bogus"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Status"]["IsFailed"] is True
