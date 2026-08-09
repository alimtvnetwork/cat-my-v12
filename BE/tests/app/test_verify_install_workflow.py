"""Plan 90 Step 125 - contract tests for verify-install CI gate.

Root cause guarded (one sentence): Step 124 added a pre-doctor
SHA256SUMS block to both installers behind an "unset -> skip" fallback,
so a future edit re-introducing the skip path, dropping ``--verify-only``,
or forgetting to require ``APP_BINARIES_DIR`` on ``--install`` would
land undetected until a human ran the installer on Windows. This test
locks the shape of ``.github/workflows/verify-install.yml`` and the
installer flags/exit codes it depends on.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

pytest.importorskip("yaml")
import yaml  # noqa: E402

_REPO = Path(__file__).resolve().parents[3]
_WORKFLOW = _REPO / ".github/workflows/verify-install.yml"
_INSTALL_SH = _REPO / "packaging/installers/install.sh"
_INSTALL_PS1 = _REPO / "packaging/installers/install.ps1"


def test_workflow_exists_and_parses() -> None:
    assert _WORKFLOW.is_file(), _WORKFLOW
    doc = yaml.safe_load(_WORKFLOW.read_text())
    assert doc["name"] == "verify-install"
    # PyYAML parses the YAML key `on:` as the Python bool True.
    triggers = doc.get(True) or doc.get("on")
    assert "pull_request" in triggers and "push" in triggers
    assert set(doc["jobs"]) == {"posix", "windows"}
    assert doc["jobs"]["posix"]["runs-on"] == "ubuntu-latest"
    assert doc["jobs"]["windows"]["runs-on"] == "windows-latest"


@pytest.mark.parametrize("job", ["posix", "windows"])
def test_each_job_asserts_three_exit_cases(job: str) -> None:
    """HAPPY (0) + TAMPERED (6/9533) + MISSING BINARIES DIR (2)."""
    doc = yaml.safe_load(_WORKFLOW.read_text())
    names = [s.get("name", "") for s in doc["jobs"][job]["steps"]]
    joined = "\n".join(names)
    assert "HAPPY" in joined, joined
    assert "TAMPERED" in joined, joined
    assert "MISSING BINARIES DIR" in joined, joined


def test_install_sh_removed_skip_fallback() -> None:
    body = _INSTALL_SH.read_text()
    # The Step-124 fallback log line must be gone (Step 125 removal).
    assert "cross-check skipped" not in body, "Step 124 skip fallback must be removed"
    # The mandatory guard + --verify-only flag must be present.
    assert "APP_BINARIES_DIR is required for --install" in body
    assert "--verify-only" in body


def test_install_ps1_removed_skip_fallback() -> None:
    body = _INSTALL_PS1.read_text()
    assert "cross-check skipped" not in body, "Step 124 skip fallback must be removed"
    assert "-BinariesDir / APP_BINARIES_DIR is required for -Install" in body
    assert "-VerifyOnly" in body
    assert "$EXIT_USAGE" in body and "= 2" in body


@pytest.mark.skipif(shutil.which("bash") is None, reason="bash required")
def test_install_sh_verify_only_end_to_end(tmp_path: Path) -> None:
    """Smoke-test the three exit-code paths locally (mirror of CI job)."""
    import hashlib
    from BE.app.installer_binaries import BINARIES

    rel = tmp_path / "release"
    rel.mkdir()
    lines: list[str] = []
    for b in BINARIES:
        payload = f"pytest:{b.Name}\n".encode()
        (rel / b.ExeName).write_bytes(payload)
        lines.append(f"{hashlib.sha256(payload).hexdigest()}  {b.ExeName}")
    (rel / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n")

    env_ok = {
        "PATH": "/usr/bin:/bin:/usr/local/bin",
        "PYTHON_EXE": sys.executable,
        "APP_BINARIES_DIR": str(rel),
    }
    # HAPPY -> 0
    r = subprocess.run(
        ["bash", str(_INSTALL_SH), "--install", "--verify-only"],
        env=env_ok, capture_output=True, text=True,
    )
    assert r.returncode == 0, r.stderr

    # TAMPERED -> 6
    target = rel / BINARIES[0].ExeName
    target.write_bytes(target.read_bytes() + b"x")
    r = subprocess.run(
        ["bash", str(_INSTALL_SH), "--install", "--verify-only"],
        env=env_ok, capture_output=True, text=True,
    )
    assert r.returncode == 6, (r.returncode, r.stderr)

    # MISSING APP_BINARIES_DIR -> 2
    env_missing = {k: v for k, v in env_ok.items() if k != "APP_BINARIES_DIR"}
    r = subprocess.run(
        ["bash", str(_INSTALL_SH), "--install"],
        env=env_missing, capture_output=True, text=True,
    )
    assert r.returncode == 2, (r.returncode, r.stderr)
