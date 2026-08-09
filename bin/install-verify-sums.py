#!/usr/bin/env python3
"""Plan 90 Step 124 - Pre-install SHA256SUMS cross-check CLI.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md`` §4.

Called by ``packaging/installers/install.ps1`` and ``install.sh`` BEFORE
the pre-flight doctor and the plan renderer, so a tampered exe is
refused before any file is laid down or ``install.json`` row recorded.

CLI-only numeric exit codes (per spec 77 §4 + `.lovable/memory/26-*` §12):
    0  every BINARIES entry matched its SHA256SUMS row.
    2  usage error (missing flags, bad platform).
   10  SHA256SUMS file not found (E_INSTALL_MANIFEST_MISSING).
   11  SHA256SUMS malformed / duplicate / inventory-missing
       (E_INSTALL_MANIFEST_INVALID).
   12  binary file present in inventory + sums but missing on disk
       (E_INSTALL_MANIFEST_MISSING).
   13  digest mismatch (E_CLI_CHECKSUM_MISMATCH). This is the
       spec-77 §4 wire code the installers translate to 9533 (ps1) / 6 (sh).

Every failure prints one ``[NN] <message>`` line to stderr so the
installers' assertions on numeric exits are backed by a
truncation-immune marker (mirrors the wrapper convention from Step 116).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Repo root on sys.path so `python bin/install-verify-sums.py` works
# without editable install (matches bin/install-doctor.py / install-record.py).
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from BE.app.installer_checksums import verify_release_binaries  # noqa: E402
from BE.errors.apperror import AppError  # noqa: E402
from BE.errors.codes import ErrorCode  # noqa: E402


_EXIT_OK = 0
_EXIT_USAGE = 2
_EXIT_SUMS_MISSING = 10
_EXIT_SUMS_INVALID = 11
_EXIT_BINARY_MISSING = 12
_EXIT_CHECKSUM_MISMATCH = 13


def _classify(err: AppError) -> int:
    """Map an AppError to a numeric exit code per the contract above."""
    if err.code is ErrorCode.E_CLI_CHECKSUM_MISMATCH:
        return _EXIT_CHECKSUM_MISMATCH
    if err.code is ErrorCode.E_INSTALL_MANIFEST_INVALID:
        return _EXIT_SUMS_INVALID
    if err.code is ErrorCode.E_INSTALL_MANIFEST_MISSING:
        reason = str(err.details.get("Reason", ""))
        if reason == "binary-file-missing":
            return _EXIT_BINARY_MISSING
        return _EXIT_SUMS_MISSING
    # Unknown AppError: surface as usage rather than 0 so callers never
    # mistake it for success.
    return _EXIT_USAGE


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Verify SHA256SUMS.txt against a directory of PyInstaller "
            "onefile artefacts. Every BINARIES entry must match."
        ),
    )
    parser.add_argument("--sums-path", required=True, type=Path)
    parser.add_argument("--binaries-dir", required=True, type=Path)
    parser.add_argument(
        "--platform",
        required=True,
        choices=("windows", "posix"),
        help="Which release-workflow matrix leg produced these artefacts.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit the verified rows as JSON on stdout (audit trail).",
    )
    args = parser.parse_args(argv)

    try:
        verified = verify_release_binaries(
            sums_path=args.sums_path,
            binaries_dir=args.binaries_dir,
            platform=args.platform,
        )
    except AppError as exc:
        code = _classify(exc)
        print(f"[{code}] {exc.code.value}: {exc.message}", file=sys.stderr)
        if exc.details:
            print(json.dumps(exc.details, sort_keys=True), file=sys.stderr)
        return code

    if args.json:
        print(
            json.dumps(
                [
                    {
                        "Name": v.Name,
                        "ExeFilename": v.ExeFilename,
                        "Sha256": v.Sha256,
                        "SizeBytes": v.SizeBytes,
                    }
                    for v in verified
                ],
                sort_keys=True,
            )
        )
    else:
        for v in verified:
            print(f"[install-verify-sums] ok {v.ExeFilename} {v.Sha256}")
    return _EXIT_OK


if __name__ == "__main__":  # pragma: no cover - CLI entry
    sys.exit(main())
