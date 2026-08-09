"""Plan 90 Step 52 tests - `worker-cli version` identity envelope.

Locks:
- Success path: exit Ok, envelope Results[0] carries {Name,Version,Commit,BuildDate}.
- Name is always "worker-cli".
- Env overrides win: `WORKER_CLI_VERSION`, `WORKER_CLI_COMMIT`,
  `WORKER_CLI_BUILD_DATE` are surfaced verbatim.
- Missing env -> Version falls back to pyproject value (non-empty), and
  Commit/BuildDate default to the literal string "unknown" (never blank,
  never fabricated).
- Side-effect free: no lease/marker files touched.
"""

from __future__ import annotations

import io
import json

from BE.cli.common.exit_codes import ExitCode
from BE.cli.worker.main import build_dispatcher
from BE.cli.worker.subcommands.version import _pyproject_version


def _run(argv, tmp_path, monkeypatch):
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    lines = out.getvalue().splitlines()
    assert len(lines) == 1, out.getvalue() + "\n---\n" + err.getvalue()
    return code, json.loads(lines[0])


def test_version_defaults_when_env_unset(tmp_path, monkeypatch):
    for k in ("WORKER_CLI_VERSION", "WORKER_CLI_COMMIT", "WORKER_CLI_BUILD_DATE"):
        monkeypatch.delenv(k, raising=False)
    code, env = _run(["version"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    assert env["Status"]["IsSuccess"] is True
    payload = env["Results"][0]
    assert payload["Name"] == "worker-cli"
    assert payload["Version"] == _pyproject_version()
    assert payload["Version"]  # non-empty
    assert payload["Commit"] == "unknown"
    assert payload["BuildDate"] == "unknown"


def test_version_env_overrides_win(tmp_path, monkeypatch):
    monkeypatch.setenv("WORKER_CLI_VERSION", "1.2.3-rc4")
    monkeypatch.setenv("WORKER_CLI_COMMIT", "deadbeef")
    monkeypatch.setenv("WORKER_CLI_BUILD_DATE", "2026-07-21T00:00:00Z")
    code, env = _run(["version"], tmp_path, monkeypatch)
    assert code == ExitCode.Ok
    payload = env["Results"][0]
    assert payload["Version"] == "1.2.3-rc4"
    assert payload["Commit"] == "deadbeef"
    assert payload["BuildDate"] == "2026-07-21T00:00:00Z"


def test_version_is_side_effect_free(tmp_path, monkeypatch):
    data_root = tmp_path / "data"
    _run(["version"], tmp_path, monkeypatch)
    # No lease/marker/worker subdir created by a pure identity call.
    assert not (data_root / "worker" / "camera.lease.json").exists()
    assert not (data_root / "worker" / "stream.state.json").exists()


def test_pyproject_version_is_semver_shape():
    v = _pyproject_version()
    assert v.count(".") >= 2
