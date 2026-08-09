#!/usr/bin/env python3
"""Plan 90 Step 128 - install-upgrade-plan CLI.

Prints a single JSON line describing the upgrade decision for installing
``--new-version`` over the manifest at ``--install-root``. Optionally
backs up the existing manifest before the wrapper proceeds.

Exit codes
----------
* 0    decision emitted (FRESH_INSTALL / UPGRADE / REINSTALL_SAME / DOWNGRADE_ALLOWED)
* 2    invalid usage / bad flags
* 40   downgrade blocked (E_INSTALL_DOWNGRADE_BLOCKED)
* 41   invalid version string / unreadable manifest (E_INSTALL_UPGRADE_INVALID
       or E_INSTALL_MANIFEST_INVALID)
* 42   backup write failed (E_INSTALL_MANIFEST_UNWRITABLE)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from BE.app.install_manifest import read_manifest
from BE.app.installer_upgrade import (
    UpgradePolicy,
    backup_manifest,
    plan_upgrade,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _parse(argv: list[str] | None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="install-upgrade-plan")
    p.add_argument("--install-root", required=True, type=Path)
    p.add_argument("--new-version", required=True)
    p.add_argument("--force-reinstall", action="store_true")
    p.add_argument("--allow-downgrade", action="store_true")
    p.add_argument(
        "--backup",
        action="store_true",
        help="Copy install.json to install.json.bak.<UTC> after the decision.",
    )
    return p.parse_args(argv)


def _exit_for(code: ErrorCode) -> int:
    if code is ErrorCode.E_INSTALL_DOWNGRADE_BLOCKED:
        return 40
    if code is ErrorCode.E_INSTALL_UPGRADE_INVALID:
        return 41
    if code is ErrorCode.E_INSTALL_MANIFEST_INVALID:
        return 41
    if code is ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE:
        return 42
    return 2


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parse(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2

    try:
        existing = read_manifest(args.install_root)
    except AppError as exc:
        print(f"[install-upgrade-plan] {exc.code.name}: {exc.message}",
              file=sys.stderr)
        return _exit_for(exc.code)

    policy = UpgradePolicy(
        is_force_reinstall=args.force_reinstall,
        is_downgrade_allowed=args.allow_downgrade,
    )
    try:
        decision = plan_upgrade(
            existing=existing, new_version=args.new_version, policy=policy,
        )
    except AppError as exc:
        print(f"[install-upgrade-plan] {exc.code.name}: {exc.message}",
              file=sys.stderr)
        return _exit_for(exc.code)

    backup_path: str | None = None
    if args.backup:
        try:
            bp = backup_manifest(args.install_root)
        except AppError as exc:
            print(f"[install-upgrade-plan] {exc.code.name}: {exc.message}",
                  file=sys.stderr)
            return _exit_for(exc.code)
        backup_path = str(bp) if bp is not None else None

    print(json.dumps({
        "Action": decision.Action.value,
        "PriorVersion": decision.PriorVersion,
        "NewVersion": decision.NewVersion,
        "Reason": decision.Reason,
        "ForceReinstall": policy.is_force_reinstall,
        "AllowDowngrade": policy.is_downgrade_allowed,
        "BackupPath": backup_path,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
