"""Plan 90 Step 119 - install-record record-binary subcommand.

Root cause guarded (one sentence): before Step 119 the only writer of
``install.json`` was the flat action-append path, so ``manifest.Binaries``
stayed empty forever and the Step-118 ``BinaryChecksumMismatch`` doctor
check was structurally unreachable in production.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from BE.app.install_manifest import MANIFEST_FILENAME, read_manifest_strict

REPO_ROOT = Path(__file__).resolve().parents[3]
RECORD_CLI = REPO_ROOT / "bin" / "install-record.py"


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.run(
        [sys.executable, str(RECORD_CLI), *args],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        env=env,
        check=False,
    )


def _make_exe(dir_: Path, body: bytes = b"MZ\x90\x00sample-exe") -> Path:
    p = dir_ / "db-bootstrap.exe"
    p.write_bytes(body)
    return p


# --- backward-compat shim: flat --flags still work --------------------


def test_flat_flags_shim_still_records_action(tmp_path: Path) -> None:
    # Simulates the pre-Step-119 install.ps1 / install.sh invocation:
    # no subcommand token, just flat --flags. Must implicitly route to
    # record-action.
    r = _run(
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0",
        "--platform", "posix",
        "--name", "compat-shim",
        "--script", "bin/compat.py",
        "--args-json", "[]",
        "--phase", "install",
        "--started-at", "2026-07-21T12:00:00+00:00",
        "--completed-at", "2026-07-21T12:00:01+00:00",
        "--duration-ms", "1000",
        "--exit-code", "0",
        "--is-critical", "false",
    )
    assert r.returncode == 0, r.stderr
    m = read_manifest_strict(tmp_path)
    assert len(m.Actions) == 1
    assert m.Actions[0]["Name"] == "compat-shim"


# --- record-binary happy path -----------------------------------------


def test_record_binary_writes_manifest_row_and_stdout(tmp_path: Path) -> None:
    exe = _make_exe(tmp_path)
    r = _run(
        "record-binary",
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0",
        "--platform", "windows",
        "--name", "db-bootstrap",
        "--exe-name", "db-bootstrap",
        "--exe-path", str(exe),
        "--signed", "false",
    )
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout.strip())
    assert payload["Sha256"] == hashlib.sha256(exe.read_bytes()).hexdigest()
    assert payload["SizeBytes"] == len(exe.read_bytes())
    assert payload["Signed"] is False

    m = read_manifest_strict(tmp_path)
    assert len(m.Binaries) == 1
    assert m.Binaries[0]["Name"] == "db-bootstrap"
    assert m.Binaries[0]["Sha256"] == payload["Sha256"]


def test_record_binary_upserts_by_name(tmp_path: Path) -> None:
    exe = _make_exe(tmp_path, body=b"v1")
    _run(
        "record-binary",
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0", "--platform", "windows",
        "--name", "db-bootstrap", "--exe-name", "db-bootstrap",
        "--exe-path", str(exe), "--signed", "false",
    )
    exe.write_bytes(b"v2-replaced-bytes")
    r = _run(
        "record-binary",
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0", "--platform", "windows",
        "--name", "db-bootstrap", "--exe-name", "db-bootstrap",
        "--exe-path", str(exe), "--signed", "false",
    )
    assert r.returncode == 0
    m = read_manifest_strict(tmp_path)
    assert len(m.Binaries) == 1
    assert m.Binaries[0]["Sha256"] == hashlib.sha256(b"v2-replaced-bytes").hexdigest()


# --- record-binary validation boundaries ------------------------------


def test_record_binary_missing_exe_returns_4(tmp_path: Path) -> None:
    r = _run(
        "record-binary",
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0", "--platform", "windows",
        "--name", "db-bootstrap", "--exe-name", "db-bootstrap",
        "--exe-path", str(tmp_path / "nope.exe"), "--signed", "false",
    )
    assert r.returncode == 4, r.stderr
    assert (tmp_path / MANIFEST_FILENAME).exists() is False


def test_record_binary_signed_true_requires_cert_thumbprint(tmp_path: Path) -> None:
    exe = _make_exe(tmp_path)
    r = _run(
        "record-binary",
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0", "--platform", "windows",
        "--name", "db-bootstrap", "--exe-name", "db-bootstrap",
        "--exe-path", str(exe), "--signed", "true",
    )
    assert r.returncode == 2
    assert "cert-thumbprint" in r.stderr.lower()


def test_record_binary_signed_true_with_cert_persists_metadata(tmp_path: Path) -> None:
    exe = _make_exe(tmp_path)
    r = _run(
        "record-binary",
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0", "--platform", "windows",
        "--name", "db-bootstrap", "--exe-name", "db-bootstrap",
        "--exe-path", str(exe), "--signed", "true",
        "--cert-thumbprint", "AB12CD34EF56",
        "--timestamped-at", "2026-07-21T12:00:00+00:00",
    )
    assert r.returncode == 0, r.stderr
    row = read_manifest_strict(tmp_path).Binaries[0]
    assert row["Signed"] is True
    assert row["CertThumbprint"] == "AB12CD34EF56"
    assert row["TimestampedAt"] == "2026-07-21T12:00:00+00:00"


def test_explicit_record_action_subcommand_works(tmp_path: Path) -> None:
    r = _run(
        "record-action",
        "--install-root", str(tmp_path),
        "--app-version", "4.59.0",
        "--platform", "posix",
        "--name", "explicit-sub",
        "--script", "bin/x.py",
        "--args-json", "[]",
        "--phase", "install",
        "--started-at", "2026-07-21T12:00:00+00:00",
        "--completed-at", "2026-07-21T12:00:01+00:00",
        "--duration-ms", "5",
        "--exit-code", "0",
        "--is-critical", "false",
    )
    assert r.returncode == 0, r.stderr
    m = read_manifest_strict(tmp_path)
    assert m.Actions[0]["Name"] == "explicit-sub"
