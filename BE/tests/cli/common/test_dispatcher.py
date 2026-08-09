"""Plan 90 Step 19 tests - `Dispatcher`."""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

import pytest

from BE.cli.common.dispatcher import Dispatcher, Subcommand
from BE.cli.common.exit_codes import ExitCode
from BE.cli.common.session import SessionCtx
from BE.envelope import success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _dispatcher(handler, *, configure=None, name: str = "cmd") -> Dispatcher:
    d = Dispatcher(prog="test-cli", source="worker-cli", description="tests")
    d.register(Subcommand(name=name, handler=handler, configure=configure))
    return d


def _run(d: Dispatcher, argv: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[int, dict, str]:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    out, err = io.StringIO(), io.StringIO()
    code = d.run(argv, stdout=out, stderr=err, log_root=str(tmp_path))
    out_text = out.getvalue().splitlines()
    assert len(out_text) == 1, f"stdout must be exactly one line, got {out_text!r}"
    return code, json.loads(out_text[0]), err.getvalue()


def test_success_wraps_raw_result(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def h(ns: argparse.Namespace, ctx: SessionCtx):
        return {"Hello": "World"}
    code, env, err = _run(_dispatcher(h), ["cmd"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Status"]["IsSuccess"] is True
    assert env["Results"] == [{"Hello": "World"}]
    assert "OK" in err


def test_handler_returning_envelope_is_passed_through(tmp_path, monkeypatch) -> None:
    def h(ns, ctx):
        return success(results=[1, 2, 3], requested_at="2026-01-01T00:00:00.000Z")
    code, env, _ = _run(_dispatcher(h), ["cmd"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Results"] == [1, 2, 3]


def test_apperror_produces_failure_envelope_and_correct_exit(tmp_path, monkeypatch) -> None:
    def h(ns, ctx):
        raise AppError(ErrorCode.E_CAM_NOT_CONNECTED, "no cam", details={"Serial": "X"})
    code, env, err = _run(_dispatcher(h), ["cmd"], tmp_path, monkeypatch)
    assert code == ExitCode.VendorError
    assert env["Status"]["IsFailed"] is True
    assert env["Errors"]["Code"] == "E_CAM_NOT_CONNECTED"
    assert "E_CAM_NOT_CONNECTED" in err


def test_io_apperror_maps_to_io_error(tmp_path, monkeypatch) -> None:
    def h(ns, ctx):
        raise AppError(ErrorCode.E_IPC_WRITE_FAILED, "disk gone")
    code, env, _ = _run(_dispatcher(h), ["cmd"], tmp_path, monkeypatch)
    assert code == ExitCode.IoError
    assert env["Errors"]["Code"] == "E_IPC_WRITE_FAILED"


def test_unknown_exception_never_leaks_stack_to_stdout(tmp_path, monkeypatch) -> None:
    def h(ns, ctx):
        raise RuntimeError("kaboom")
    code, env, _ = _run(_dispatcher(h), ["cmd"], tmp_path, monkeypatch)
    assert code == ExitCode.DomainError
    assert env["Status"]["IsFailed"] is True
    assert "kaboom" in env["Status"]["Message"]
    assert "Traceback" not in json.dumps(env)


def test_argparse_error_emits_envelope_and_usage_exit(tmp_path, monkeypatch) -> None:
    def h(ns, ctx):
        return {}
    def cfg(p): p.add_argument("--required", required=True)
    d = _dispatcher(h, configure=cfg)
    code, env, err = _run(d, ["cmd"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Errors"]["Code"] == "E_CLI_USAGE"
    assert "usage error" in err


def test_unknown_subcommand_is_usage_error(tmp_path, monkeypatch) -> None:
    """Plan 90 Step 43: argparse rejects unknown verbs with envelope + exit=2."""
    def h(ns, ctx): return {}
    code, env, err = _run(_dispatcher(h), ["nope"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Status"]["IsFailed"] is True
    assert env["Errors"]["Code"] == "E_CLI_USAGE"
    # Envelope-only on stdout; human summary lives on stderr.
    assert "usage error" in err


def test_missing_subcommand_is_usage_error(tmp_path, monkeypatch) -> None:
    """Plan 90 Step 43: `worker-cli` with no verb -> envelope + exit=2."""
    def h(ns, ctx): return {}
    code, env, err = _run(_dispatcher(h), [], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_apperror_e_cli_usage_maps_to_usage_exit(tmp_path, monkeypatch) -> None:
    """Plan 90 Step 43: handler-raised E_CLI_USAGE also lands on exit=2."""
    def h(ns, ctx):
        raise AppError(ErrorCode.E_CLI_USAGE, "handler said bad args")
    code, env, _ = _run(_dispatcher(h), ["cmd"], tmp_path, monkeypatch)
    assert code == ExitCode.Usage
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_flags_are_forwarded_to_handler(tmp_path, monkeypatch) -> None:
    seen: dict[str, str] = {}
    def h(ns, ctx):
        seen["v"] = ns.name
        return {"got": ns.name}
    def cfg(p): p.add_argument("--name", required=True)
    d = _dispatcher(h, configure=cfg)
    code, env, _ = _run(d, ["cmd", "--name", "cam-1"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert seen == {"v": "cam-1"}
    assert env["Results"] == [{"got": "cam-1"}]


def test_stdout_is_valid_single_line_json_even_on_failure(tmp_path, monkeypatch) -> None:
    def h(ns, ctx):
        raise AppError(ErrorCode.E_BE_NOT_FOUND, "missing")
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path))
    out, err = io.StringIO(), io.StringIO()
    d = _dispatcher(h)
    d.run(["cmd"], stdout=out, stderr=err, log_root=str(tmp_path))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1
    parsed = json.loads(lines[0])
    assert parsed["Status"]["IsFailed"] is True


def test_duplicate_registration_rejected() -> None:
    d = Dispatcher(prog="x", source="worker-cli")
    d.register(Subcommand(name="a", handler=lambda n, c: {}))
    with pytest.raises(ValueError):
        d.register(Subcommand(name="a", handler=lambda n, c: {}))


def test_session_opened_for_handler(tmp_path, monkeypatch) -> None:
    captured: dict = {}
    def h(ns, ctx):
        captured["run_id"] = ctx.run_id
        captured["log_path"] = str(ctx.log_path)
        return {}
    _run(_dispatcher(h), ["cmd"], tmp_path, monkeypatch)
    assert captured["run_id"]
    assert Path(captured["log_path"]).exists()
