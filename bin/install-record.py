#!/usr/bin/env python3
"""Plan 90 Step 106 + Step 119 - install-record CLI.

Invoked by ``packaging/installers/install.{ps1,sh}`` and by the release
workflow (Step 121+) to append rows to ``install.json``.

Subcommands
-----------
* ``record-action`` (default when the first argv token starts with ``--``
  so pre-Step-119 callers keep working): append one
  ``ManifestActionRecord`` via
  ``BE.app.install_manifest.record_action`` and then best-effort rotate.
* ``record-binary`` (new in Step 119): fingerprint a shipped exe via
  ``BE.app.installer_signing.compute_binary_signature`` and upsert one
  ``ManifestBinaryRecord`` via
  ``BE.app.install_manifest.record_binary``. This is the missing link
  that lets the Step-118 doctor tamper check ever fire in production:
  before Step 119 the only writer of ``install.json`` was the flat
  action-append path, so ``manifest.Binaries`` stayed empty forever and
  ``BinaryChecksumMismatch`` was structurally unreachable.

Exit codes
----------
* 0    recorded
* 2    invalid usage / validation failed
* 3    manifest unwritable
* 4    referenced exe missing on disk (record-binary only)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from BE.app.install_log_rotator import (
    DEFAULT_ARCHIVE_MAX_BYTES,
    DEFAULT_MAX_ACTIONS,
    rotate_manifest,
)
from BE.app.install_manifest import ManifestActionRecord, record_action, record_binary
from BE.app.installer_signing import compute_binary_signature
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


# --- argparse ---------------------------------------------------------


def _add_action_flags(p: argparse.ArgumentParser) -> None:
    p.add_argument("--install-root", required=True, type=Path)
    p.add_argument("--app-version", required=True)
    p.add_argument("--platform", required=True, choices=["windows", "posix"])
    p.add_argument("--name", required=True)
    p.add_argument("--script", required=True)
    p.add_argument("--args-json", required=True,
                   help="JSON array of string args passed to the action.")
    p.add_argument("--phase", required=True, choices=["install", "uninstall"])
    p.add_argument("--started-at", required=True,
                   help="ISO-8601 timezone-aware timestamp when the action started.")
    p.add_argument("--completed-at", required=True,
                   help="ISO-8601 timezone-aware timestamp when the action completed.")
    p.add_argument("--duration-ms", required=True, type=int)
    p.add_argument("--exit-code", required=True, type=int)
    p.add_argument("--is-critical", required=True, choices=["true", "false"])
    p.add_argument("--max-actions", type=int, default=DEFAULT_MAX_ACTIONS,
                   help="Rotate manifest when Actions exceeds this count.")
    p.add_argument("--archive-max-bytes", type=int, default=DEFAULT_ARCHIVE_MAX_BYTES,
                   help="Roll install-history.log when it exceeds this size.")


def _add_binary_flags(p: argparse.ArgumentParser) -> None:
    p.add_argument("--install-root", required=True, type=Path)
    p.add_argument("--app-version", required=True)
    p.add_argument("--platform", required=True, choices=["windows", "posix"])
    p.add_argument("--name", required=True,
                   help="Inventory Name from BE/app/installer_binaries.py (e.g. db-bootstrap).")
    p.add_argument("--exe-name", required=True,
                   help="On-disk basename without extension (e.g. db-bootstrap).")
    p.add_argument("--exe-path", required=True, type=Path,
                   help="Absolute path to the shipped exe on the target host.")
    p.add_argument("--signed", required=True, choices=["true", "false"],
                   help="Whether the exe carries a valid Authenticode signature.")
    p.add_argument("--cert-thumbprint", default=None,
                   help="Signing cert thumbprint (required when --signed=true).")
    p.add_argument("--timestamped-at", default=None,
                   help="ISO-8601 RFC 3161 timestamp countersignature time, when signed.")


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="install-record")
    sub = p.add_subparsers(dest="mode", required=True)
    _add_action_flags(sub.add_parser("record-action", help="Append one action row."))
    _add_binary_flags(sub.add_parser("record-binary", help="Upsert one binary row."))
    return p


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    argv_list = list(sys.argv[1:] if argv is None else argv)
    # Backward-compat shim: pre-Step-119 callers pass flat --flags with no
    # subcommand. Detect and inject "record-action" so install.ps1 and
    # install.sh keep working without a coordinated rev.
    if argv_list and argv_list[0].startswith("--"):
        argv_list.insert(0, "record-action")
    return _build_parser().parse_args(argv_list)


# --- record-action ----------------------------------------------------


def _run_record_action(args: argparse.Namespace) -> int:
    try:
        parsed_args = json.loads(args.args_json)
        is_str_list = isinstance(parsed_args, list) and all(
            isinstance(a, str) for a in parsed_args
        )
        if not is_str_list:
            raise ValueError("--args-json must be a JSON array of strings")
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"[install-record] --args-json invalid: {exc}", file=sys.stderr)
        return 2

    record = ManifestActionRecord(
        Name=args.name,
        Script=args.script,
        Args=tuple(parsed_args),
        Phase=args.phase,
        StartedAt=args.started_at,
        CompletedAt=args.completed_at,
        DurationMs=args.duration_ms,
        ExitCode=args.exit_code,
        IsCritical=(args.is_critical == "true"),
        IsSuccess=(args.exit_code == 0),
    )

    try:
        record_action(
            args.install_root,
            record,
            app_version=args.app_version,
            platform=args.platform,
        )
    except AppError as exc:
        print(f"[install-record] {exc.code.name}: {exc.message}", file=sys.stderr)
        if exc.code is ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE:
            return 3
        return 2

    # Rotation is best-effort: a rotation failure must not lose the just-
    # recorded action or bounce a healthy install. The next successful
    # append will retry, and `install-log-tail --include-archive` still
    # sees the full history from install.json in the meantime.
    try:
        rotate_manifest(
            args.install_root,
            max_actions=args.max_actions,
            archive_max_bytes=args.archive_max_bytes,
        )
    except AppError as exc:
        print(f"[install-record] rotation-skipped {exc.code.name}: {exc.message}",
              file=sys.stderr)
    return 0


# --- record-binary (Step 119) -----------------------------------------


def _run_record_binary(args: argparse.Namespace) -> int:
    signed = args.signed == "true"
    if signed and not args.cert_thumbprint:
        print(
            "[install-record] --cert-thumbprint is required when --signed=true",
            file=sys.stderr,
        )
        return 2
    if not args.exe_path.is_file():
        print(
            f"[install-record] exe-path missing: {args.exe_path}",
            file=sys.stderr,
        )
        return 4
    try:
        record = compute_binary_signature(
            name=args.name,
            exe_name=args.exe_name,
            exe_path=args.exe_path,
            signed=signed,
            cert_thumbprint=args.cert_thumbprint,
            timestamped_at=args.timestamped_at,
        )
    except AppError as exc:
        print(f"[install-record] {exc.code.name}: {exc.message}", file=sys.stderr)
        return 2

    try:
        record_binary(
            args.install_root,
            record,
            app_version=args.app_version,
            platform=args.platform,
        )
    except AppError as exc:
        print(f"[install-record] {exc.code.name}: {exc.message}", file=sys.stderr)
        if exc.code is ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE:
            return 3
        return 2

    # Emit the recorded fingerprint on stdout so the release workflow can
    # cross-check against its SHA256SUMS.txt (Step 121). Kept small on
    # purpose: one JSON line, no envelope wrapping.
    print(json.dumps({
        "Name": record.Name,
        "Sha256": record.Sha256,
        "SizeBytes": record.SizeBytes,
        "Signed": record.Signed,
    }))
    return 0


# --- entrypoint -------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parse_args(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2
    if args.mode == "record-binary":
        return _run_record_binary(args)
    return _run_record_action(args)


if __name__ == "__main__":
    raise SystemExit(main())
