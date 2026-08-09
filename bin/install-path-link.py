#!/usr/bin/env python3
"""Plan 90 Step 126 - PATH-link install/uninstall CLI.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md`` §"PATH linking".

Root cause guarded (one sentence): without a dedicated CLI, both
installers would have to inline shim/symlink logic and drift; this CLI
is the single entry point invoked by ``install.ps1`` / ``install.sh``
in Step 127.

Exit-code contract
------------------
    0   success
    2   argparse / usage error (E_CLI_USAGE)
    30  E_INSTALL_PATH_LINK_FAILED

Usage
-----
    install-path-link.py install   --binaries-dir DIR [--link-dir DIR] [--platform {windows,posix}]
    install-path-link.py uninstall                    [--link-dir DIR] [--platform {windows,posix}]

When ``--link-dir`` is omitted, the per-user default from
``BE.app.installer_path.default_link_dir`` is used. When ``--platform``
is omitted the current OS is auto-detected.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from BE.app.installer_path import (
    LinkPlatform,
    apply_link_install,
    apply_link_uninstall,
    current_platform,
    default_link_dir,
    plan_link_actions,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

EXIT_OK = 0
EXIT_USAGE = 2
EXIT_LINK_FAILED = 30


def _parse_platform(value: str | None) -> LinkPlatform:
    if value is None:
        return current_platform()
    if value == "windows":
        return LinkPlatform.WINDOWS
    if value == "posix":
        return LinkPlatform.POSIX
    raise AppError(
        code=ErrorCode.E_CLI_USAGE,
        message=f"unknown --platform {value!r}; expected 'windows' or 'posix'",
    )


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="install-path-link")
    sub = p.add_subparsers(dest="cmd", required=True)

    inst = sub.add_parser("install", help="create per-binary shims")
    inst.add_argument("--binaries-dir", required=True)
    inst.add_argument("--link-dir", default=None)
    inst.add_argument("--platform", choices=["windows", "posix"], default=None)

    un = sub.add_parser("uninstall", help="remove per-binary shims")
    un.add_argument("--link-dir", default=None)
    un.add_argument("--platform", choices=["windows", "posix"], default=None)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        # argparse already wrote a message to stderr.
        return int(exc.code) if isinstance(exc.code, int) else EXIT_USAGE

    try:
        platform = _parse_platform(args.platform)
        link_dir = Path(args.link_dir) if args.link_dir else default_link_dir(platform)

        if args.cmd == "install":
            binaries_dir = Path(args.binaries_dir)
            actions = plan_link_actions(
                platform=platform, binaries_dir=binaries_dir, link_dir=link_dir
            )
            apply_link_install(actions, platform)
            for a in actions:
                print(f"[path-link] installed {a.LinkPath} -> {a.Source}")
            return EXIT_OK

        if args.cmd == "uninstall":
            # A dummy binaries_dir suffices; uninstall only reads LinkPath.
            actions = plan_link_actions(
                platform=platform,
                binaries_dir=Path("/nonexistent"),
                link_dir=link_dir,
            )
            apply_link_uninstall(actions, platform)
            for a in actions:
                print(f"[path-link] removed {a.LinkPath}")
            return EXIT_OK

        sys.stderr.write(f"[2] unknown subcommand: {args.cmd}\n")
        return EXIT_USAGE

    except AppError as e:
        sys.stderr.write(f"[{e.code.value}] {e.message}\n")
        if e.code is ErrorCode.E_CLI_USAGE:
            return EXIT_USAGE
        if e.code is ErrorCode.E_INSTALL_PATH_LINK_FAILED:
            return EXIT_LINK_FAILED
        return EXIT_LINK_FAILED


if __name__ == "__main__":
    raise SystemExit(main())
