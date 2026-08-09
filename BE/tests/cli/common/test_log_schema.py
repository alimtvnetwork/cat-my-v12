"""Plan 90 Step 16 tests - JSONL log-line lint."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from BE.cli.common.log_schema import lint_file, lint_line, lint_record
from BE.cli.common.logger import JsonlLogger
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _good(**over) -> dict:
    base = {
        "Ts": "2026-07-21T09:12:34.567Z",
        "Level": "INFO",
        "Source": "worker-cli",
        "Pid": 12345,
        "RunId": "R1",
        "Subcmd": "capture",
        "Event": "device.opened",
        "Msg": "hello",
        "Ctx": {"Serial": "SN"},
    }
    base.update(over)
    return base


def test_valid_info_record_passes() -> None:
    lint_record(_good())


def test_valid_error_with_code_and_trace() -> None:
    lint_record(_good(Level="ERROR", Code="E_CAM_NOT_CONNECTED", Trace=["f.py:1: g"]))


def test_missing_required_key_fails() -> None:
    r = _good()
    del r["Msg"]
    with pytest.raises(AppError) as ei:
        lint_record(r)
    assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED
    assert "Msg" in ei.value.message or "Msg" in str(ei.value.details)


def test_unknown_key_fails() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Extra=1))


def test_bad_level_fails() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Level="TRACE"))


def test_bad_source_fails() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Source="worker"))


def test_bad_ts_fails() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Ts="2026-07-21 09:12:34Z"))


def test_pid_must_be_positive_int() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Pid=0))
    with pytest.raises(AppError):
        lint_record(_good(Pid="12345"))


def test_ctx_must_be_object() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Ctx=[]))


def test_warn_error_fatal_require_code() -> None:
    for lvl in ("WARN", "ERROR", "FATAL"):
        with pytest.raises(AppError):
            lint_record(_good(Level=lvl))


def test_code_forbidden_on_info_and_debug() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Level="INFO", Code="E_CAM_NOT_CONNECTED"))


def test_unregistered_code_fails() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Level="ERROR", Code="E_TOTALLY_MADE_UP"))


def test_trace_only_on_error_or_fatal() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Level="WARN", Code="E_CAM_NOT_CONNECTED", Trace=["x"]))
    lint_record(_good(Level="FATAL", Code="E_CAM_NOT_CONNECTED", Trace=["x"]))


def test_trace_must_be_list_of_strings() -> None:
    with pytest.raises(AppError):
        lint_record(_good(Level="ERROR", Code="E_CAM_NOT_CONNECTED", Trace=[1, 2]))


def test_lint_line_parses_json() -> None:
    assert lint_line(json.dumps(_good()))["Event"] == "device.opened"


def test_lint_line_rejects_bad_json() -> None:
    with pytest.raises(AppError):
        lint_line("{not json}")


def test_lint_file_missing_raises(tmp_path: Path) -> None:
    with pytest.raises(AppError):
        lint_file(tmp_path / "nope.jsonl")


def test_lint_file_reports_line_numbers(tmp_path: Path) -> None:
    p = tmp_path / "a.jsonl"
    lines = [json.dumps(_good()), "{bad}", json.dumps(_good(Level="ERROR"))]  # 3rd missing Code
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    findings = lint_file(p)
    nums = sorted(f.LineNumber for f in findings)
    assert nums == [2, 3]


def test_logger_output_lints_clean(tmp_path: Path) -> None:
    with JsonlLogger(source="worker-cli", subcmd="capture", log_root=tmp_path) as lg:
        lg.log("INFO", "boot", "ok")
        lg.log("ERROR", "cam.fail", "nope", code="E_CAM_NOT_CONNECTED")
    assert lint_file(lg.path) == []


def test_stop_on_first_returns_single_finding(tmp_path: Path) -> None:
    p = tmp_path / "b.jsonl"
    p.write_text("{bad}\n{alsobad}\n", encoding="utf-8")
    assert len(lint_file(p, stop_on_first=True)) == 1
