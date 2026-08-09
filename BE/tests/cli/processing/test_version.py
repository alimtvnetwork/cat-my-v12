"""Plan 90 Step 65 - `processing-cli version` acceptance tests.

Mirrors `BE/tests/cli/worker/test_version.py` for the processing-cli
substrate (`BE/cli/processing/main.py::_handle_version`). Locks:

- Success path: exit `Ok`, envelope `Results[0]` carries
  `{Name, Version, Commit, BuildDate}` (spec 75 §Subcommands, mirrored
  from spec 74 identity contract).
- Name is always the literal `"processing-cli"`.
- Env overrides win: `PROCESSING_CLI_VERSION`, `PROCESSING_CLI_COMMIT`,
  `PROCESSING_CLI_BUILD_DATE` are surfaced verbatim.
- Missing env: `Version` falls back to the pyproject value (non-empty),
  and `Commit` / `BuildDate` default to the literal `"unknown"` per the
  "no fabricated commit hash" rule in `_handle_version`.
- Side-effect free: no IPC drop-dir, no results dir, no lease files
  materialise. `version` is a pure identity probe.
"""

from __future__ import annotations

import io
import json

from BE.cli.common.exit_codes import ExitCode
from BE.cli.processing.main import _pyproject_version, build_dispatcher


def _run(argv, tmp_path, monkeypatch):
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    monkeypatch.setenv("APP_IPC_ROOT", str(tmp_path / "ipc"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(
        argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"),
    )
    lines = [ln for ln in out.getvalue().splitlines() if ln.strip()]
    assert len(lines) == 1, out.getvalue() + "\n---\n" + err.getvalue()
    return code, json.loads(lines[-1])


def test_version_defaults_when_env_unset(tmp_path, monkeypatch):
    for k in ("PROCESSING_CLI_VERSION", "PROCESSING_CLI_COMMIT", "PROCESSING_CLI_BUILD_DATE"):
        monkeypatch.delenv(k, raising=False)
    code, env = _run(["version"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Status"]["IsSuccess"] is True
    payload = env["Results"][0]
    assert payload["Name"] == "processing-cli"
    assert payload["Version"] == _pyproject_version()
    assert payload["Version"]
    assert payload["Commit"] == "unknown"
    assert payload["BuildDate"] == "unknown"


def test_version_env_overrides_win(tmp_path, monkeypatch):
    monkeypatch.setenv("PROCESSING_CLI_VERSION", "9.9.9-rc1")
    monkeypatch.setenv("PROCESSING_CLI_COMMIT", "cafef00d")
    monkeypatch.setenv("PROCESSING_CLI_BUILD_DATE", "2026-07-21T12:00:00Z")
    code, env = _run(["version"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    payload = env["Results"][0]
    assert payload["Version"] == "9.9.9-rc1"
    assert payload["Commit"] == "cafef00d"
    assert payload["BuildDate"] == "2026-07-21T12:00:00Z"


def test_version_is_side_effect_free(tmp_path, monkeypatch):
    _run(["version"], tmp_path, monkeypatch)
    # No IPC drop-dirs, no results dir, no data-root subtree materialised
    # by a pure identity call.
    assert not (tmp_path / "ipc" / "processing-out").exists()
    assert not (tmp_path / "data" / "results").exists()


def test_pyproject_version_is_semver_shape():
    v = _pyproject_version()
    assert v.count(".") >= 2
