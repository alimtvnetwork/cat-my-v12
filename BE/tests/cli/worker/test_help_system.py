"""Plan 90 Step 53 tests - `worker-cli` help system.

Locks (spec/13-generic-cli/09-help-system.md):
- Every registered subcommand has a matching `<name>.md` in
  `BE/cli/worker/helptext/` (drift guard for CI Step 95).
- Root help: `worker-cli --help`, `worker-cli -h`, and
  `worker-cli help` all print the same root listing containing
  every registered subcommand name and the top-line description.
- Subcommand help works both ways: `worker-cli <sub> --help` and
  `worker-cli help <sub>` load the packaged Markdown.
- Unknown `help <sub>` -> ExitCode.Usage + E_CLI_USAGE envelope on
  stdout (no crash, no leaked stack).
- Help path never opens a log session (side-effect free): no files
  materialized under APP_LOG_ROOT.
- Help output does NOT contain a Universal Envelope line (would break
  PowerShell wrappers that expect free-form help text).
"""

from __future__ import annotations

import io
import json
from pathlib import Path

from BE.cli.common.exit_codes import ExitCode
from BE.cli.worker.main import build_dispatcher

HELPTEXT_DIR = Path("BE/cli/worker/helptext")


def _run(argv, tmp_path, monkeypatch):
    monkeypatch.setenv("APP_LOG_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("APP_DATA_ROOT", str(tmp_path / "data"))
    out, err = io.StringIO(), io.StringIO()
    code = build_dispatcher().run(argv, stdout=out, stderr=err, log_root=str(tmp_path / "logs"))
    return code, out.getvalue(), err.getvalue()


def test_every_subcommand_has_helptext():
    d = build_dispatcher()
    for name in d.subcommands:
        p = HELPTEXT_DIR / f"{name}.md"
        assert p.exists(), f"missing helptext: {p}"
        body = p.read_text(encoding="utf-8")
        assert body.startswith(f"# worker-cli {name}"), p
        assert "## Usage" in body and "## Examples" in body, p


def test_root_help_flag(tmp_path, monkeypatch):
    code, out, _ = _run(["--help"], tmp_path, monkeypatch)
    assert code == 0
    assert "worker-cli" in out
    for name in build_dispatcher().subcommands:
        assert name in out, f"root help missing '{name}'"
    # No envelope on help path.
    for line in out.splitlines():
        assert not line.startswith("{\"Status\""), line


def test_root_help_h_short(tmp_path, monkeypatch):
    code, out, _ = _run(["-h"], tmp_path, monkeypatch)
    assert code == 0
    assert "Subcommands" in out


def test_root_help_verb(tmp_path, monkeypatch):
    code, out, _ = _run(["help"], tmp_path, monkeypatch)
    assert code == 0
    assert "probe" in out and "version" in out


def test_subcommand_help_flag(tmp_path, monkeypatch):
    code, out, _ = _run(["version", "--help"], tmp_path, monkeypatch)
    assert code == 0
    assert out.startswith("# worker-cli version")


def test_subcommand_help_verb(tmp_path, monkeypatch):
    code, out, _ = _run(["help", "capture"], tmp_path, monkeypatch)
    assert code == 0
    assert out.startswith("# worker-cli capture")


def test_unknown_help_subcommand_is_usage(tmp_path, monkeypatch):
    code, out, _ = _run(["help", "does-not-exist"], tmp_path, monkeypatch)
    assert code == int(ExitCode.Usage)
    env = json.loads(out.strip().splitlines()[0])
    assert env["Status"]["IsSuccess"] is False
    assert env["Errors"]["Code"] == "E_CLI_USAGE"


def test_help_is_side_effect_free(tmp_path, monkeypatch):
    _run(["--help"], tmp_path, monkeypatch)
    _run(["help", "probe"], tmp_path, monkeypatch)
    _run(["version", "--help"], tmp_path, monkeypatch)
    logs = tmp_path / "logs"
    # Help must never open a session or write JSONL.
    if logs.exists():
        assert not any(logs.rglob("*.jsonl")), list(logs.rglob("*"))
    assert not (tmp_path / "data" / "worker" / "camera.lease.json").exists()
