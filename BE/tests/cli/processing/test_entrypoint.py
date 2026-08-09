"""Plan 90 Step 57 - processing-cli entrypoint parity guard.

Mirror of `BE/tests/cli/worker/test_entrypoint.py`. Locks:
    1. `[project.scripts]` binds `processing-cli` to
       `BE.cli.processing.main:main` (installer + PyInstaller resolve by name).
    2. `python -m BE.cli.processing.main --help` exits 0 with non-empty stdout
       from a fresh checkout (no `pip install -e` needed).
    3. `version` subcommand emits a Universal Envelope on stdout with the
       expected `{Name, Version, Commit, BuildDate}` payload - proves the
       dispatcher spine works for a second CLI.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[4]


def _pyproject() -> dict:
    return tomllib.loads((REPO_ROOT / "BE" / "pyproject.toml").read_text())


def test_processing_cli_entrypoint_declared_in_pyproject():
    scripts = _pyproject().get("project", {}).get("scripts", {})
    assert scripts.get("processing-cli") == "BE.cli.processing.main:main", (
        "processing-cli console-script must be pinned to "
        f"BE.cli.processing.main:main; got scripts={scripts!r}."
    )


def test_processing_cli_module_entry_runs():
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.processing.main", "--help"],
        capture_output=True, text=True, timeout=15, cwd=str(REPO_ROOT),
    )
    assert proc.returncode == 0, (proc.returncode, proc.stderr)
    assert proc.stdout.strip() != ""


def test_processing_cli_version_envelope():
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.processing.main", "version"],
        capture_output=True, text=True, timeout=15, cwd=str(REPO_ROOT),
    )
    assert proc.returncode == 0, (proc.returncode, proc.stderr)
    # Stdout contract: exactly one JSON envelope line.
    payload = json.loads(proc.stdout.strip().splitlines()[-1])
    assert payload["Status"]["IsSuccess"] is True, payload
    results = payload["Results"]
    assert isinstance(results, list) and len(results) == 1, payload
    v = results[0]
    assert v["Name"] == "processing-cli"
    assert isinstance(v["Version"], str) and v["Version"]
    assert v["Commit"]
    assert v["BuildDate"]


def test_processing_cli_console_script_when_installed():
    exe = shutil.which("processing-cli")
    if exe is None:
        pytest.skip("processing-cli not on PATH (pip install -e BE not run in this env)")
    proc = subprocess.run([exe, "--help"], capture_output=True, text=True, timeout=15)
    assert proc.returncode == 0
    assert proc.stdout.strip() != ""
