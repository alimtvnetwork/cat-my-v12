#!/usr/bin/env python3
"""Plan 90 Step 130 - install-rollback CLI.

Consumes the ``BackupPath`` emitted by ``bin/install-upgrade-plan.py
--backup`` when a critical action in the per-action loop fails. Prints a
single JSON line describing the rollback decision and, unless
``--dry-run`` is passed, atomically restores ``install.json`` from the
backup.

Exit codes
----------
* 0    rollback decision emitted (and restore performed unless --dry-run)
* 2    invalid usage / bad flags
* 50   backup missing / unreadable / invalid JSON / diverged history
       (E_INSTALL_ROLLBACK_FAILED)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from BE.app.install_manifest import read_manifest_strict
from BE.app.installer_rollback import (
    load_backup,
    plan_rollback,
    restore_manifest,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _parse(argv: list[str] | None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="install-rollback")
    p.add_argument("--install-root", required=True, type=Path)
    p.add_argument("--backup-path", required=True, type=Path)
    p.add_argument("--failed-action", required=True)
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Emit the decision JSON but do not touch install.json.",
    )
    return p.parse_args(argv)


def _exit_for(code: ErrorCode) -> int:
    if code is ErrorCode.E_INSTALL_ROLLBACK_FAILED:
        return 50
    return 2


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parse(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2

    try:
        current = read_manifest_strict(args.install_root)
    except AppError as exc:
        print(f"[install-rollback] {exc.code.name}: {exc.message}",
              file=sys.stderr)
        return 50

    try:
        backup = load_backup(args.backup_path)
        decision = plan_rollback(
            current=current,
            backup=backup,
            failed_action=args.failed_action,
            backup_path=args.backup_path,
        )
    except AppError as exc:
        print(f"[install-rollback] {exc.code.name}: {exc.message}",
              file=sys.stderr)
        return _exit_for(exc.code)

    restored_path: str | None = None
    if not args.dry_run:
        try:
            restored = restore_manifest(args.install_root, args.backup_path)
        except AppError as exc:
            print(f"[install-rollback] {exc.code.name}: {exc.message}",
                  file=sys.stderr)
            return _exit_for(exc.code)
        restored_path = str(restored)

    print(json.dumps({
        "FailedAction": decision.FailedAction,
        "ActionsToReverse": list(decision.ActionsToReverse),
        "PriorVersion": decision.PriorVersion,
        "CurrentVersion": decision.CurrentVersion,
        "BackupPath": decision.BackupPath,
        "RestoredPath": restored_path,
        "DryRun": bool(args.dry_run),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
