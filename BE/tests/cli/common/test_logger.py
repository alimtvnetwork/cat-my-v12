"""Plan 90 Step 14 tests - JSONL logger."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pytest

from BE.cli.common.logger import JsonlLogger, open_logger
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _read(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def _mk(tmp_path: Path, **kw) -> JsonlLogger:
    return JsonlLogger(source="worker-cli", subcmd="capture", log_root=tmp_path, **kw)


def test_creates_dated_file_under_source_subdir(tmp_path: Path) -> None:
    lg = _mk(tmp_path)
    try:
        parts = lg.path.relative_to(tmp_path).parts
        assert parts[0] == "worker-cli"
        datetime.strptime(parts[1], "%Y-%m-%d")  # YYYY-MM-DD
        assert parts[2].endswith("-capture.jsonl")
        assert lg.path.exists()
    finally:
        lg.close()


def test_info_record_pascalcase_keys(tmp_path: Path) -> None:
    with _mk(tmp_path) as lg:
        lg.log("INFO", "device.opened", "hello", ctx={"Serial": "SN-1"})
    rec = _read(lg.path)[0]
    assert set(rec) >= {"Ts", "Level", "Source", "Pid", "RunId", "Subcmd", "Event", "Msg", "Ctx"}
    assert rec["Level"] == "INFO"
    assert rec["Source"] == "worker-cli"
    assert rec["Ctx"] == {"Serial": "SN-1"}
    assert "Code" not in rec and "Trace" not in rec


def test_error_requires_registered_code(tmp_path: Path) -> None:
    with _mk(tmp_path) as lg:
        with pytest.raises(AppError) as ei:
            lg.log("ERROR", "boom", "no code")
        assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED or "requires a Code" in ei.value.message


def test_error_with_registered_code_writes_code(tmp_path: Path) -> None:
    with _mk(tmp_path) as lg:
        lg.log("ERROR", "cam.fail", "nope", code="E_CAM_NOT_CONNECTED")
    rec = _read(lg.path)[0]
    assert rec["Code"] == "E_CAM_NOT_CONNECTED"


def test_unregistered_code_rejected(tmp_path: Path) -> None:
    with _mk(tmp_path) as lg:
        with pytest.raises(AppError) as ei:
            lg.log("WARN", "x.y", "msg", code="E_TOTALLY_MADE_UP")
        assert ei.value.code is ErrorCode.E_CLI_PREFLIGHT_FAILED


def test_debug_below_min_level_is_dropped(tmp_path: Path) -> None:
    with _mk(tmp_path, min_level="INFO") as lg:
        lg.log("DEBUG", "d", "dropped")
        lg.log("INFO", "i", "kept")
    recs = _read(lg.path)
    assert [r["Level"] for r in recs] == ["INFO"]


def test_trace_only_on_error_and_fatal(tmp_path: Path) -> None:
    with _mk(tmp_path) as lg:
        try:
            raise RuntimeError("x")
        except RuntimeError as e:
            lg.log("WARN", "w", "warn", exc=e, code="E_CAM_NOT_CONNECTED")
            lg.log("ERROR", "e", "err", exc=e, code="E_CAM_NOT_CONNECTED")
    recs = _read(lg.path)
    assert "Trace" not in recs[0]
    assert isinstance(recs[1]["Trace"], list) and recs[1]["Trace"]


def test_trace_suppressed_when_include_trace_false(tmp_path: Path) -> None:
    with _mk(tmp_path, include_trace=False) as lg:
        try:
            raise RuntimeError("x")
        except RuntimeError as e:
            lg.log("ERROR", "e", "err", exc=e, code="E_CAM_NOT_CONNECTED")
    assert "Trace" not in _read(lg.path)[0]


def test_ts_is_utc_iso_with_ms(tmp_path: Path) -> None:
    with _mk(tmp_path) as lg:
        lg.log("INFO", "e", "m")
    ts = _read(lg.path)[0]["Ts"]
    assert ts.endswith("Z") and "T" in ts
    # parseable
    datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S.%fZ")


def test_run_id_stable_across_lines(tmp_path: Path) -> None:
    with _mk(tmp_path, run_id="RID-FIXED") as lg:
        lg.log("INFO", "a", "1")
        lg.log("INFO", "b", "2")
    recs = _read(lg.path)
    assert {r["RunId"] for r in recs} == {"RID-FIXED"}


def test_open_logger_uses_paths_resolver(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "L"))
    lg = open_logger("processing-cli", "run", min_level="INFO")
    try:
        assert Path(tmp_path / "L") in lg.path.parents
    finally:
        lg.close()


def test_ctx_is_isolated_copy(tmp_path: Path) -> None:
    ctx = {"K": 1}
    with _mk(tmp_path) as lg:
        lg.log("INFO", "e", "m", ctx=ctx)
        ctx["K"] = 999
        lg.log("INFO", "e", "m2", ctx=ctx)
    recs = _read(lg.path)
    assert recs[0]["Ctx"] == {"K": 1}
    assert recs[1]["Ctx"] == {"K": 999}


def test_unwritable_root_raises_apperror(tmp_path: Path) -> None:
    blocker = tmp_path / "file"
    blocker.write_text("x")
    with pytest.raises(AppError) as ei:
        JsonlLogger(source="be", subcmd="api", log_root=blocker / "sub")
    assert ei.value.code is ErrorCode.E_LOG_ROOT_UNWRITABLE


def test_context_manager_closes(tmp_path: Path) -> None:
    with _mk(tmp_path) as lg:
        p = lg.path
    assert p.exists()
    # further logging should fail because fp is closed
    with pytest.raises(Exception):
        lg.log("INFO", "e", "m")
