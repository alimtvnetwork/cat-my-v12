"""Plan 90 Step 118 - Manifest v2 Binaries + signing helper + doctor tamper.

Root cause guarded: pre-Step-118 the manifest never recorded the
SHA256 of shipped exes, so a swapped/corrupted binary was invisible to
`install.json` and every uninstall assumed the on-disk file was still
the released one. These tests pin the v2 schema, forward-migration
from v1, signing invariants, and the doctor tamper cross-check.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from BE.app.install_manifest import (
    MANIFEST_FILENAME,
    MANIFEST_SCHEMA_VERSION,
    ManifestBinaryRecord,
    init_manifest,
    latest_binary,
    read_manifest,
    record_binary,
    write_manifest,
)
from BE.app.installer_doctor import DoctorSeverity, run_doctor
from BE.app.installer_plan import (
    InstallerPhase,
    InstallerPlatform,
    plan_install_actions,
)
from BE.app.installer_signing import compute_binary_signature, sha256_of_file
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _now() -> datetime:
    return datetime(2026, 7, 21, 12, 0, tzinfo=UTC)


def _make_exe(tmp: Path, body: bytes = b"MZ\x90\x00fake-exe-bytes") -> Path:
    p = tmp / "db-bootstrap.exe"
    p.write_bytes(body)
    return p


# --- schema v2 --------------------------------------------------------


def test_schema_version_bumped_to_v2() -> None:
    assert MANIFEST_SCHEMA_VERSION == 2


def test_init_manifest_writes_v2_with_binaries_field(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.58.0", platform="windows", now=_now())
    data = json.loads((tmp_path / MANIFEST_FILENAME).read_text())
    assert data["SchemaVersion"] == 2
    assert data["Binaries"] == []


def test_v1_manifest_reads_and_upgrades_on_write(tmp_path: Path) -> None:
    # Simulate an on-disk v1 manifest from a pre-Step-118 install.
    (tmp_path / MANIFEST_FILENAME).write_text(json.dumps({
        "SchemaVersion": 1,
        "AppVersion": "4.57.0",
        "Platform": "windows",
        "InstalledAt": "2026-07-20T10:00:00+00:00",
        "LastUpdatedAt": "2026-07-20T10:00:00+00:00",
        "Actions": [],
    }))
    m = read_manifest(tmp_path)
    assert m is not None
    assert m.SchemaVersion == 1
    assert m.Binaries == []
    # Writing normalises to v2.
    write_manifest(tmp_path, m)
    data = json.loads((tmp_path / MANIFEST_FILENAME).read_text())
    assert data["SchemaVersion"] == 2
    assert data["Binaries"] == []


# --- signing helper ---------------------------------------------------


def test_sha256_of_file_streams_and_returns_size(tmp_path: Path) -> None:
    exe = _make_exe(tmp_path, body=b"x" * 5000)
    digest, size = sha256_of_file(exe)
    assert size == 5000
    assert digest == hashlib.sha256(b"x" * 5000).hexdigest()


def test_sha256_of_file_missing_raises_manifest_missing(tmp_path: Path) -> None:
    with pytest.raises(AppError) as ei:
        sha256_of_file(tmp_path / "nope.exe")
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_MISSING


def test_compute_binary_signature_populates_record(tmp_path: Path) -> None:
    exe = _make_exe(tmp_path)
    rec = compute_binary_signature(
        name="db-bootstrap",
        exe_name="db-bootstrap",
        exe_path=exe,
        signed=True,
        cert_thumbprint="ABCD1234",
        timestamped_at="2026-07-21T12:00:00+00:00",
        now=_now(),
    )
    assert rec.Sha256 == hashlib.sha256(exe.read_bytes()).hexdigest()
    assert rec.SizeBytes == len(exe.read_bytes())
    assert rec.Signed is True
    assert rec.CertThumbprint == "ABCD1234"
    assert rec.Path.endswith("/db-bootstrap.exe")


# --- record_binary ----------------------------------------------------


def test_record_binary_upserts_by_name(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.58.0", platform="windows", now=_now())
    exe = _make_exe(tmp_path, body=b"v1")
    r1 = compute_binary_signature(
        name="db-bootstrap", exe_name="db-bootstrap", exe_path=exe, now=_now()
    )
    record_binary(tmp_path, r1)
    exe.write_bytes(b"v2-replaced")
    r2 = compute_binary_signature(
        name="db-bootstrap", exe_name="db-bootstrap", exe_path=exe, now=_now()
    )
    m = record_binary(tmp_path, r2)
    assert len(m.Binaries) == 1
    assert latest_binary(m, "db-bootstrap")["Sha256"] == r2.Sha256


def test_record_binary_validates_sha_and_signed_pair(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.58.0", platform="windows", now=_now())
    bad = ManifestBinaryRecord(
        Name="x", ExeName="x", Path="x", Sha256="short",
        SizeBytes=1, Signed=False, CertThumbprint=None,
        TimestampedAt=None, RecordedAt="2026-07-21T12:00:00+00:00",
    )
    with pytest.raises(AppError) as ei:
        record_binary(tmp_path, bad)
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID

    signed_no_cert = ManifestBinaryRecord(
        Name="x", ExeName="x", Path="x", Sha256="a" * 64,
        SizeBytes=1, Signed=True, CertThumbprint=None,
        TimestampedAt=None, RecordedAt="2026-07-21T12:00:00+00:00",
    )
    with pytest.raises(AppError):
        record_binary(tmp_path, signed_no_cert)


# --- doctor tamper cross-check ----------------------------------------


def _plan_win() -> list:
    return plan_install_actions(
        platform=InstallerPlatform.WINDOWS, phase=InstallerPhase.INSTALL,
        binaries_dir="C:/fake-release",
    )


def test_doctor_flags_binary_checksum_mismatch(tmp_path: Path) -> None:
    install_root = tmp_path / "root"
    install_root.mkdir()
    init_manifest(install_root, app_version="4.58.0", platform="windows", now=_now())
    exe = _make_exe(install_root, body=b"original-bytes")
    rec = compute_binary_signature(
        name="db-bootstrap", exe_name="db-bootstrap", exe_path=exe, now=_now()
    )
    record_binary(install_root, rec)
    # Tamper on disk.
    exe.write_bytes(b"totally-different-bytes")
    report = run_doctor(
        install_root,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan_win(),
    )
    codes = [f.Code for f in report.Findings]
    assert "BinaryChecksumMismatch" in codes
    finding = next(f for f in report.Findings if f.Code == "BinaryChecksumMismatch")
    assert finding.Severity is DoctorSeverity.ERROR
    assert finding.Context["RecordedSha256"] == rec.Sha256


def test_doctor_flags_binary_file_missing(tmp_path: Path) -> None:
    install_root = tmp_path / "root"
    install_root.mkdir()
    init_manifest(install_root, app_version="4.58.0", platform="windows", now=_now())
    exe = _make_exe(install_root)
    rec = compute_binary_signature(
        name="db-bootstrap", exe_name="db-bootstrap", exe_path=exe, now=_now()
    )
    record_binary(install_root, rec)
    exe.unlink()
    report = run_doctor(
        install_root,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan_win(),
    )
    assert any(f.Code == "BinaryFileMissing" for f in report.Findings)


def test_doctor_clean_when_binary_matches(tmp_path: Path) -> None:
    install_root = tmp_path / "root"
    install_root.mkdir()
    init_manifest(install_root, app_version="4.58.0", platform="windows", now=_now())
    exe = _make_exe(install_root)
    rec = compute_binary_signature(
        name="db-bootstrap", exe_name="db-bootstrap", exe_path=exe, now=_now()
    )
    record_binary(install_root, rec)
    report = run_doctor(
        install_root,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan_win(),
    )
    codes = [f.Code for f in report.Findings]
    assert "BinaryChecksumMismatch" not in codes
    assert "BinaryFileMissing" not in codes
