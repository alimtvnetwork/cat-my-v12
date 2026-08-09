"""Plan 90 Step 124 - SHA256SUMS.txt parsing and pre-install verification.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md`` §4 ("Verify
SHA256; abort with ``E_CLI_CHECKSUM_MISMATCH`` on failure").

Root cause guarded (one sentence): Step 123 published ``SHA256SUMS.txt``
alongside the PyInstaller onefile artefacts but neither
``packaging/installers/install.ps1`` nor ``install.sh`` opened it, so a
tampered ``.exe`` slipped into ``%APP_BINARIES_DIR%`` between download and
install would only be caught by the post-install doctor tamper check
(Step 118) after files were already laid down and ``install.json`` rows
recorded.

Design invariants
-----------------
1. **Pure data.** No I/O beyond reading the caller-supplied
   ``sums_path`` and ``binaries_dir/<ExeName>``; no manifest writes.
2. **Deterministic parser.** GNU coreutils ``sha256sum`` format is
   ``<64 lowercase hex><space><space|asterisk><filename>``. The
   optional ``asterisk`` marks binary mode which is what
   ``.github/workflows/release.yml`` §"Compute SHA256SUMS.txt" emits on
   Windows (via ``Get-FileHash``) even though the Linux leg uses two
   spaces. We accept both to keep the two release-workflow legs
   symmetric.
3. **Strict validation.** Any malformed line -> ``AppError`` with
   ``E_INSTALL_MANIFEST_INVALID``; any missing file (sums or binary) ->
   ``E_INSTALL_MANIFEST_MISSING``; any digest mismatch ->
   ``E_CLI_CHECKSUM_MISMATCH`` (spec 77 §4).
4. **Inventory-driven.** ``verify_release_binaries`` iterates
   ``BE.app.installer_binaries.BINARIES`` so a new frozen entry is
   picked up with zero installer edits, mirroring the release workflow
   loop from Step 123.
5. **Streaming digest.** Re-use ``installer_signing.sha256_of_file`` so
   the doctor tamper check (Step 118) and the pre-install verifier
   compute hashes the exact same way.

Anchors
-------
- ``BE/app/installer_signing.py`` (Plan 90 Step 118) - streaming SHA256.
- ``BE/app/installer_binaries.py`` (Plan 90 Step 117) - source of truth.
- ``.github/workflows/release.yml`` §"Compute SHA256SUMS.txt" (Step 123).
- ``bin/install-verify-sums.py`` (Plan 90 Step 124) - CLI adapter.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from BE.app.installer_binaries import BINARIES, BinaryEntry
from BE.app.installer_signing import sha256_of_file
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# GNU coreutils sha256sum line: "<hex>  <name>" (two spaces = text mode)
# or "<hex> *<name>" (single space + asterisk = binary mode). PowerShell's
# release-workflow emitter renders text mode; we tolerate both so the two
# matrix legs from Step 123 can converge on the same file format.
_SUMS_LINE_RE: Final = re.compile(r"^([0-9a-f]{64})[ \t]+\*?([^\r\n]+?)\s*$")


@dataclass(frozen=True)
class VerifiedBinary:
    """Result of a successful per-binary verification.

    Callers (release CI, install-verify-sums CLI) log these so the
    audit trail records exactly which artefact digest was accepted.
    """

    Name: str
    ExeFilename: str
    Sha256: str
    SizeBytes: int


def parse_sums_file(sums_path: Path) -> dict[str, str]:
    """Parse a ``SHA256SUMS.txt`` file into ``{filename: hex_digest}``.

    Blank lines and ``#``-prefixed comments are skipped. Any other line
    that fails the strict grammar above raises
    ``AppError(E_INSTALL_MANIFEST_INVALID)`` with the 1-based line
    number in ``details`` so operators can jq the offending row.
    """
    if not sums_path.exists():
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_MISSING,
            message=f"SHA256SUMS file not found: {sums_path}",
            details={"SumsPath": str(sums_path), "Reason": "sums-file-missing"},
        )
    try:
        raw = sums_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message=f"SHA256SUMS file unreadable: {sums_path}",
            details={"SumsPath": str(sums_path), "OSError": str(exc)},
            cause=exc,
        ) from exc

    out: dict[str, str] = {}
    for lineno, raw_line in enumerate(raw.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        m = _SUMS_LINE_RE.match(line)
        if not m:
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
                message=(
                    f"Malformed SHA256SUMS line {lineno} in {sums_path.name}: "
                    "expected '<64hex> <filename>'"
                ),
                details={
                    "SumsPath": str(sums_path),
                    "LineNumber": lineno,
                    "OffendingLine": raw_line,
                },
            )
        digest, filename = m.group(1), m.group(2)
        # Duplicate filenames are a producer bug: the release workflow
        # emits one line per BINARY entry and platform folder. Refuse
        # rather than silently take the last one.
        if filename in out:
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
                message=(
                    f"Duplicate filename in SHA256SUMS: {filename!r} appears twice"
                ),
                details={
                    "SumsPath": str(sums_path),
                    "Filename": filename,
                    "LineNumber": lineno,
                },
            )
        out[filename] = digest
    return out


def _exe_filename_for(entry: BinaryEntry, platform: str) -> str:
    """Return the on-disk filename the release workflow produced.

    Windows matrix leg appends ``.exe``; POSIX matrix leg leaves the
    entry stem unchanged. Matches ``.github/workflows/release.yml``
    §"Build each onefile spec".
    """
    if platform == "windows":
        return f"{entry.ExeName}.exe"
    if platform == "posix":
        return entry.ExeName
    raise AppError(
        code=ErrorCode.E_CLI_USAGE,
        message=f"Unknown platform for checksum verification: {platform!r}",
        details={"Platform": platform, "Allowed": ["windows", "posix"]},
    )


def verify_release_binaries(
    *,
    sums_path: Path,
    binaries_dir: Path,
    platform: str,
    inventory: tuple[BinaryEntry, ...] = BINARIES,
) -> list[VerifiedBinary]:
    """Verify every ``BINARIES`` entry against ``SHA256SUMS.txt``.

    Failure modes (all raise ``AppError``, never returning partial results):
      * sums file missing            -> ``E_INSTALL_MANIFEST_MISSING``
      * sums file malformed          -> ``E_INSTALL_MANIFEST_INVALID``
      * required name absent in sums -> ``E_INSTALL_MANIFEST_INVALID``
      * binary file missing on disk  -> ``E_INSTALL_MANIFEST_MISSING``
      * digest mismatch              -> ``E_CLI_CHECKSUM_MISMATCH``

    Returns the accepted ``VerifiedBinary`` rows in inventory order so
    the caller can log a stable audit line per artefact.
    """
    sums = parse_sums_file(sums_path)
    verified: list[VerifiedBinary] = []
    for entry in inventory:
        filename = _exe_filename_for(entry, platform)
        expected = sums.get(filename)
        if expected is None:
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
                message=(
                    f"Binary {filename!r} listed in inventory but absent from "
                    f"SHA256SUMS ({sums_path.name})"
                ),
                details={
                    "Name": entry.Name,
                    "Filename": filename,
                    "SumsPath": str(sums_path),
                    "Reason": "inventory-missing-from-sums",
                },
            )
        exe_path = binaries_dir / filename
        if not exe_path.exists():
            raise AppError(
                code=ErrorCode.E_INSTALL_MANIFEST_MISSING,
                message=f"Binary file not found: {exe_path}",
                details={
                    "Name": entry.Name,
                    "ExpectedPath": str(exe_path),
                    "Reason": "binary-file-missing",
                },
            )
        actual_hex, size_bytes = sha256_of_file(exe_path)
        if actual_hex != expected:
            raise AppError(
                code=ErrorCode.E_CLI_CHECKSUM_MISMATCH,
                message=(
                    f"SHA256 mismatch for {filename!r}: expected {expected}, "
                    f"got {actual_hex}"
                ),
                details={
                    "Name": entry.Name,
                    "Filename": filename,
                    "Path": str(exe_path),
                    "Expected": expected,
                    "Actual": actual_hex,
                    "SizeBytes": size_bytes,
                },
            )
        verified.append(
            VerifiedBinary(
                Name=entry.Name,
                ExeFilename=filename,
                Sha256=actual_hex,
                SizeBytes=size_bytes,
            )
        )
    return verified


__all__ = [
    "VerifiedBinary",
    "parse_sums_file",
    "verify_release_binaries",
]
