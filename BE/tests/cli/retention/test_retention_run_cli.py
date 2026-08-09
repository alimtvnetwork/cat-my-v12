"""Tests for `bin/retention-run.py` loop-mode flag validation.

The single-shot path is covered indirectly by `test_retention.py` (the
underlying `run_retention` function); these tests pin the additive
Step 102 flag surface and the exit-code table.
"""

from __future__ import annotations

import importlib.util
import io
import json
import sys
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

import pytest

_BIN = Path(__file__).resolve().parents[4] / "bin" / "retention-run.py"


def _load_cli():
    spec = importlib.util.spec_from_file_location("retention_run_cli", _BIN)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def cli():
    return _load_cli()


def _run(cli, argv):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = cli.main(argv)
    return code, out.getvalue(), err.getvalue()


def test_interval_hours_without_loop_is_usage(cli):
    code, out, _ = _run(cli, ["--interval-hours", "2"])
    assert code == int(cli.ExitCode.Usage)
    payload = json.loads(out.strip().splitlines()[-1])
    assert payload["Status"]["IsFailed"] is True
    assert payload["Errors"]["Code"] == "E_CLI_USAGE"


def test_max_passes_without_loop_is_usage(cli):
    code, out, _ = _run(cli, ["--max-passes", "3"])
    assert code == int(cli.ExitCode.Usage)
    assert json.loads(out.strip().splitlines()[-1])["Errors"]["Code"] == "E_CLI_USAGE"


def test_loop_out_of_range_interval_is_usage(cli, tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    monkeypatch.setenv("APP_DB_ROOT", str(tmp_path / "db"))
    code, out, _ = _run(cli, ["--loop", "--interval-hours", "999", "--max-passes", "1"])
    assert code == int(cli.ExitCode.Usage)
    assert json.loads(out.strip().splitlines()[-1])["Errors"]["Code"] == "E_CLI_USAGE"


def test_bad_env_interval_is_usage(cli, tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    monkeypatch.setenv("APP_DB_ROOT", str(tmp_path / "db"))
    monkeypatch.setenv("APP_RETENTION_INTERVAL_HOURS", "not-an-int")
    code, out, _ = _run(cli, ["--loop", "--max-passes", "1"])
    assert code == int(cli.ExitCode.Usage)
    assert json.loads(out.strip().splitlines()[-1])["Errors"]["Code"] == "E_CLI_USAGE"
