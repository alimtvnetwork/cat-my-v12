"""Plan 90 Step 56 - guard that the `worker-cli` console script stays wired.

Anchor: `BE/pyproject.toml` `[project.scripts]` line binds
`worker-cli = "BE.cli.worker.main:main"`. Downstream consumers (PowerShell
wrappers, PyInstaller specs, `install.ps1`, CI `verify.yml`) invoke
`worker-cli` on `$PATH`; a stray edit that drops that line silently breaks
every published artifact.

Two-part test:
    1. Static: parse `BE/pyproject.toml`, assert the entry stays pinned to
       the canonical `main` callable.
    2. Runtime (skip when not installed): shell out to `worker-cli --help`
       and assert exit 0 + non-empty stdout. Skips cleanly on sandboxes
       that never ran `pip install -e BE`.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[4]


def _pyproject() -> dict:
    return tomllib.loads((REPO_ROOT / "BE" / "pyproject.toml").read_text())


def test_worker_cli_entrypoint_declared_in_pyproject():
    scripts = _pyproject().get("project", {}).get("scripts", {})
    assert scripts.get("worker-cli") == "BE.cli.worker.main:main", (
        "worker-cli console-script must remain pinned to BE.cli.worker.main:main; "
        f"got scripts={scripts!r}. PowerShell wrappers and PyInstaller specs "
        "resolve the binary by this name."
    )


def test_worker_cli_module_entry_runs():
    """`python -m BE.cli.worker.main --help` must exit 0 - proves the
    dotted path in `[project.scripts]` still resolves even when the
    console script is not on PATH (sandbox / fresh checkout)."""
    proc = subprocess.run(
        [sys.executable, "-m", "BE.cli.worker.main", "--help"],
        capture_output=True, text=True, timeout=15, cwd=str(REPO_ROOT),
    )
    assert proc.returncode == 0, (proc.returncode, proc.stderr)
    assert proc.stdout.strip() != ""


def test_worker_cli_console_script_when_installed():
    exe = shutil.which("worker-cli")
    if exe is None:
        pytest.skip("worker-cli not on PATH (pip install -e BE not run in this env)")
    proc = subprocess.run([exe, "--help"], capture_output=True, text=True, timeout=15)
    assert proc.returncode == 0
    assert proc.stdout.strip() != ""
