"""Plan 90 Step 124 - contract tests for installer_checksums + CLI wrapper.

Locks the parser grammar, the failure -> ErrorCode mapping used by
``bin/install-verify-sums.py`` to translate to numeric exits (10 / 11 /
12 / 13), and asserts the inventory-driven happy path so a new
``BinaryEntry`` under ``BE.app.installer_binaries`` auto-participates.
"""

from __future__ import annotations

import hashlib
import subprocess
import sys
from pathlib import Path

import pytest

from BE.app.installer_binaries import BINARIES
from BE.app.installer_checksums import (
    VerifiedBinary,
    parse_sums_file,
    verify_release_binaries,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _write_binary(dirpath: Path, name: str, payload: bytes) -> str:
    """Write ``payload`` to ``dirpath/name`` and return its digest."""
    dirpath.mkdir(parents=True, exist_ok=True)
    (dirpath / name).write_bytes(payload)
    return _sha256(payload)


def _sums_for_windows(tmp: Path) -> tuple[Path, dict[str, str]]:
    """Populate a fake Windows release dir + SHA256SUMS.txt."""
    bins = tmp / "release-win"
    sums_path = bins / "SHA256SUMS.txt"
    lines: list[str] = []
    digests: dict[str, str] = {}
    for entry in BINARIES:
        exe = f"{entry.ExeName}.exe"
        payload = f"payload:{entry.Name}\n".encode()
        digest = _write_binary(bins, exe, payload)
        digests[exe] = digest
        lines.append(f"{digest}  {exe}")
    sums_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return bins, digests


# ---------------------------------------------------------------------
# parse_sums_file
# ---------------------------------------------------------------------


def test_parse_sums_accepts_text_and_binary_mode(tmp_path: Path) -> None:
    sums = tmp_path / "SHA256SUMS.txt"
    a = _sha256(b"a")
    b = _sha256(b"b")
    sums.write_text(
        f"# header comment\n"
        f"\n"
        f"{a}  file-a.exe\n"    # GNU text mode (two spaces)
        f"{b} *file-b.exe\n",   # GNU binary mode (space + asterisk)
        encoding="utf-8",
    )
    assert parse_sums_file(sums) == {"file-a.exe": a, "file-b.exe": b}


def test_parse_sums_missing_file_raises_manifest_missing(tmp_path: Path) -> None:
    with pytest.raises(AppError) as ei:
        parse_sums_file(tmp_path / "no-such.txt")
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_MISSING
    assert ei.value.details["Reason"] == "sums-file-missing"


def test_parse_sums_malformed_line_reports_lineno(tmp_path: Path) -> None:
    sums = tmp_path / "SHA256SUMS.txt"
    sums.write_text(f"{_sha256(b'a')}  ok.exe\nnot a hash line\n", encoding="utf-8")
    with pytest.raises(AppError) as ei:
        parse_sums_file(sums)
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID
    assert ei.value.details["LineNumber"] == 2


def test_parse_sums_rejects_duplicate_filename(tmp_path: Path) -> None:
    sums = tmp_path / "SHA256SUMS.txt"
    d = _sha256(b"x")
    sums.write_text(f"{d}  dup.exe\n{d}  dup.exe\n", encoding="utf-8")
    with pytest.raises(AppError) as ei:
        parse_sums_file(sums)
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID
    assert ei.value.details["Filename"] == "dup.exe"


# ---------------------------------------------------------------------
# verify_release_binaries
# ---------------------------------------------------------------------


def test_verify_release_binaries_happy_path_windows(tmp_path: Path) -> None:
    bins, digests = _sums_for_windows(tmp_path)
    verified = verify_release_binaries(
        sums_path=bins / "SHA256SUMS.txt",
        binaries_dir=bins,
        platform="windows",
    )
    assert [v.Name for v in verified] == [e.Name for e in BINARIES]
    for v in verified:
        assert isinstance(v, VerifiedBinary)
        assert v.Sha256 == digests[v.ExeFilename]
        assert v.SizeBytes > 0


def test_verify_release_binaries_missing_binary_file(tmp_path: Path) -> None:
    bins, _ = _sums_for_windows(tmp_path)
    # Delete the first exe; the sums line still points at it.
    first = BINARIES[0]
    (bins / f"{first.ExeName}.exe").unlink()
    with pytest.raises(AppError) as ei:
        verify_release_binaries(
            sums_path=bins / "SHA256SUMS.txt",
            binaries_dir=bins,
            platform="windows",
        )
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_MISSING
    assert ei.value.details["Reason"] == "binary-file-missing"


def test_verify_release_binaries_checksum_mismatch(tmp_path: Path) -> None:
    bins, _ = _sums_for_windows(tmp_path)
    # Tamper with the first exe so its digest no longer matches.
    first = BINARIES[0]
    (bins / f"{first.ExeName}.exe").write_bytes(b"TAMPERED")
    with pytest.raises(AppError) as ei:
        verify_release_binaries(
            sums_path=bins / "SHA256SUMS.txt",
            binaries_dir=bins,
            platform="windows",
        )
    assert ei.value.code is ErrorCode.E_CLI_CHECKSUM_MISMATCH
    assert ei.value.details["Actual"] != ei.value.details["Expected"]


def test_verify_release_binaries_inventory_missing_from_sums(tmp_path: Path) -> None:
    bins = tmp_path / "release-win"
    bins.mkdir()
    # SHA256SUMS lists an unrelated file only, so every inventory entry is absent.
    fake = _sha256(b"other")
    (bins / "SHA256SUMS.txt").write_text(f"{fake}  other.exe\n", encoding="utf-8")
    for entry in BINARIES:
        (bins / f"{entry.ExeName}.exe").write_bytes(b"present")
    with pytest.raises(AppError) as ei:
        verify_release_binaries(
            sums_path=bins / "SHA256SUMS.txt",
            binaries_dir=bins,
            platform="windows",
        )
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID
    assert ei.value.details["Reason"] == "inventory-missing-from-sums"


def test_verify_release_binaries_posix_uses_bare_exename(tmp_path: Path) -> None:
    bins = tmp_path / "release-posix"
    bins.mkdir()
    lines: list[str] = []
    for entry in BINARIES:
        payload = f"posix:{entry.Name}".encode()
        digest = _write_binary(bins, entry.ExeName, payload)
        lines.append(f"{digest}  {entry.ExeName}")
    (bins / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    verified = verify_release_binaries(
        sums_path=bins / "SHA256SUMS.txt",
        binaries_dir=bins,
        platform="posix",
    )
    assert {v.ExeFilename for v in verified} == {e.ExeName for e in BINARIES}


# ---------------------------------------------------------------------
# bin/install-verify-sums.py numeric-exit contract
# ---------------------------------------------------------------------

_CLI = Path(__file__).resolve().parents[3] / "bin" / "install-verify-sums.py"


def _run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(_CLI), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def test_cli_returns_0_on_happy_path(tmp_path: Path) -> None:
    bins, _ = _sums_for_windows(tmp_path)
    r = _run_cli(
        "--sums-path", str(bins / "SHA256SUMS.txt"),
        "--binaries-dir", str(bins),
        "--platform", "windows",
    )
    assert r.returncode == 0, r.stderr


def test_cli_returns_10_when_sums_missing(tmp_path: Path) -> None:
    r = _run_cli(
        "--sums-path", str(tmp_path / "nope.txt"),
        "--binaries-dir", str(tmp_path),
        "--platform", "windows",
    )
    assert r.returncode == 10
    assert "[10]" in r.stderr
    assert "E_INSTALL_MANIFEST_MISSING" in r.stderr


def test_cli_returns_11_on_malformed_sums(tmp_path: Path) -> None:
    (tmp_path / "SHA256SUMS.txt").write_text("garbage line\n", encoding="utf-8")
    r = _run_cli(
        "--sums-path", str(tmp_path / "SHA256SUMS.txt"),
        "--binaries-dir", str(tmp_path),
        "--platform", "windows",
    )
    assert r.returncode == 11
    assert "[11]" in r.stderr


def test_cli_returns_12_when_binary_absent(tmp_path: Path) -> None:
    bins, _ = _sums_for_windows(tmp_path)
    (bins / f"{BINARIES[0].ExeName}.exe").unlink()
    r = _run_cli(
        "--sums-path", str(bins / "SHA256SUMS.txt"),
        "--binaries-dir", str(bins),
        "--platform", "windows",
    )
    assert r.returncode == 12
    assert "[12]" in r.stderr


def test_cli_returns_13_on_checksum_mismatch(tmp_path: Path) -> None:
    bins, _ = _sums_for_windows(tmp_path)
    (bins / f"{BINARIES[0].ExeName}.exe").write_bytes(b"TAMPERED")
    r = _run_cli(
        "--sums-path", str(bins / "SHA256SUMS.txt"),
        "--binaries-dir", str(bins),
        "--platform", "windows",
    )
    assert r.returncode == 13
    assert "[13]" in r.stderr
    assert "E_CLI_CHECKSUM_MISMATCH" in r.stderr
