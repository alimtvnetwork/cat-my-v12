"""Plan 90 Step 54 - tests for global `--verbose` / `--quiet` flags.

Anchors:
- `spec/13-generic-cli/16-verbose-logging.md` (off by default, timestamped file
  under tool's default log folder, stderr mirror).
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §11 (verbose file lives at
  `<APP_LOG_ROOT>/verbose/<cli>-verbose-<ts>.log`; `--quiet` suppresses
  stderr human summary; stdout envelope unchanged).
"""

from __future__ import annotations

import io
import json
import re
from pathlib import Path

import pytest

from BE.cli.common import verbose as verbose_mod
from BE.cli.common.dispatcher import Dispatcher, Subcommand
from BE.cli.common.exit_codes import ExitCode
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_TS_RE = re.compile(r"^\[\d{2}:\d{2}:\d{2}\.\d{3}\] ")


@pytest.fixture(autouse=True)
def _reset_verbose_global():
    verbose_mod.close()
    yield
    verbose_mod.close()


def _dispatcher() -> Dispatcher:
    d = Dispatcher(prog="worker-cli", source="worker-cli", description="test")

    def _ok(_ns, _ctx):
        return [{"Hello": "world"}]

    def _boom(_ns, _ctx):
        raise AppError(ErrorCode.E_CAM_NOT_CONNECTED, "no camera")

    d.register(Subcommand(name="ok", handler=_ok, help="ok subcommand"))
    d.register(Subcommand(name="boom", handler=_boom, help="failing subcommand"))
    return d


def _run(argv, log_root: Path):
    out, err = io.StringIO(), io.StringIO()
    rc = _dispatcher().run(argv, stdout=out, stderr=err, log_root=str(log_root))
    return rc, out.getvalue(), err.getvalue()


def test_off_by_default_no_verbose_dir(tmp_path):
    rc, stdout, stderr = _run(["ok"], tmp_path)
    assert rc == int(ExitCode.Ok)
    assert not (tmp_path / "verbose").exists()
    assert stderr.strip() != ""  # human summary present
    assert verbose_mod.is_enabled() is False


def test_verbose_creates_file_and_mirrors_to_stderr(tmp_path):
    rc, stdout, stderr = _run(["--verbose", "ok"], tmp_path)
    assert rc == int(ExitCode.Ok)
    vdir = tmp_path / "verbose"
    assert vdir.is_dir()
    files = list(vdir.glob("worker-cli-verbose-*.log"))
    assert len(files) == 1, files
    content = files[0].read_text()
    assert "dispatch: worker-cli ok" in content
    assert "dispatch: exit code=0" in content
    for line in content.strip().splitlines():
        assert _TS_RE.match(line), line
    # stderr mirror contains the verbose lines AND the human summary
    assert "dispatch: worker-cli ok" in stderr
    assert verbose_mod.is_enabled() is False  # closed after dispatch


def test_verbose_after_subcommand_also_works(tmp_path):
    rc, _, stderr = _run(["ok", "--verbose"], tmp_path)
    assert rc == int(ExitCode.Ok)
    files = list((tmp_path / "verbose").glob("worker-cli-verbose-*.log"))
    assert len(files) == 1
    assert "dispatch: worker-cli ok" in stderr


def test_quiet_suppresses_stderr_but_keeps_stdout_envelope(tmp_path):
    rc, stdout, stderr = _run(["--quiet", "ok"], tmp_path)
    assert rc == int(ExitCode.Ok)
    assert stderr == ""
    payload = json.loads(stdout.strip())
    assert payload["Status"]["IsSuccess"] is True
    assert payload["Results"] == [{"Hello": "world"}]


def test_quiet_on_failure_still_emits_envelope(tmp_path):
    rc, stdout, stderr = _run(["--quiet", "boom"], tmp_path)
    assert rc == int(ExitCode.VendorError)
    assert stderr == ""
    payload = json.loads(stdout.strip())
    assert payload["Status"]["IsSuccess"] is False
    assert payload["Errors"]["Code"] == ErrorCode.E_CAM_NOT_CONNECTED.value


def test_verbose_and_quiet_combined(tmp_path):
    rc, stdout, stderr = _run(["--verbose", "--quiet", "ok"], tmp_path)
    assert rc == int(ExitCode.Ok)
    files = list((tmp_path / "verbose").glob("worker-cli-verbose-*.log"))
    assert len(files) == 1
    # verbose still mirrors to stderr (dim), but the trailing human summary
    # from `_emit` is suppressed. Envelope on stdout is unchanged.
    assert "worker-cli ok" in stderr
    assert not stderr.rstrip().endswith("Ok")  # no human "Ok" summary line at tail
    payload = json.loads(stdout.strip())
    assert payload["Status"]["IsSuccess"] is True


def test_verbose_records_exit_code_on_failure(tmp_path):
    rc, _, stderr = _run(["--verbose", "boom"], tmp_path)
    assert rc == int(ExitCode.VendorError)
    files = list((tmp_path / "verbose").glob("worker-cli-verbose-*.log"))
    body = files[0].read_text()
    assert f"dispatch: exit code={int(ExitCode.VendorError)}" in body


def test_verbose_global_cleared_after_run(tmp_path):
    _run(["--verbose", "ok"], tmp_path)
    assert verbose_mod.is_enabled() is False
    assert verbose_mod.get() is None


def test_double_init_raises(tmp_path):
    verbose_mod.init("worker-cli", log_root=str(tmp_path))
    try:
        with pytest.raises(AppError) as ei:
            verbose_mod.init("worker-cli", log_root=str(tmp_path))
        assert ei.value.code == ErrorCode.E_CLI_PREFLIGHT_FAILED
    finally:
        verbose_mod.close()


def test_log_is_noop_when_disabled():
    assert verbose_mod.is_enabled() is False
    verbose_mod.log("should not raise")  # no-op, no file created
