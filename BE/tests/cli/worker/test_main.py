"""Plan 90 Step 20 tests - worker-cli `probe`."""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest

from BE.cli.common.exit_codes import ExitCode
from BE.cli.common.session_index import read_sessions
from BE.cli.worker.main import build_dispatcher, main


def _run(argv: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[int, dict, str]:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1
    return code, json.loads(lines[0]), err.getvalue()


def test_probe_returns_stub_devices(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["probe"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Status"]["IsSuccess"] is True
    serials = [r["Serial"] for r in env["Results"]]
    assert "SN-STUB-0000" in serials and "SN-STUB-0001" in serials
    for r in env["Results"]:
        assert set(r) >= {"Serial", "Model", "Vendor", "Interface", "Status"}


def test_probe_defaults_to_memory_provider(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["probe"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert len(env["Results"]) >= 1


def test_probe_vendor_provider_fails_with_vendor_exit(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["probe", "--provider", "vendor"], tmp_path, monkeypatch)
    assert code == ExitCode.VendorError
    assert env["Errors"]["Code"] == "E_CLI_UNSUPPORTED_HOST"


def test_probe_records_session_with_ok_exit(tmp_path, monkeypatch) -> None:
    _run(["probe"], tmp_path, monkeypatch)
    rows = read_sessions(tmp_path)
    assert len(rows) == 1
    assert rows[0].Source == "worker-cli"
    assert rows[0].Subcmd == "probe"
    assert rows[0].ExitCode == ExitCode.Ok.value


def test_probe_writes_jsonl_log_with_enumerated_event(tmp_path, monkeypatch) -> None:
    _run(["probe"], tmp_path, monkeypatch)
    log_files = list((tmp_path / "worker-cli").rglob("*.jsonl"))
    assert len(log_files) == 1
    events = [json.loads(l)["Event"] for l in log_files[0].read_text().splitlines() if l.strip()]
    assert "probe.enumerated" in events
    assert events[0] == "session.open" and events[-1] == "session.close"


def test_main_returns_int_exit_code(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    # main() uses real sys.stdout/stderr; redirect to avoid noise.
    import contextlib
    buf_out, buf_err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(buf_out), contextlib.redirect_stderr(buf_err):
        code = main(["probe"])
    assert code == 0
    assert json.loads(buf_out.getvalue().splitlines()[0])["Status"]["IsSuccess"] is True


def test_unknown_subcommand_is_usage(tmp_path, monkeypatch) -> None:
    code, env, _ = _run(["nope"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Status"]["IsFailed"] is True
