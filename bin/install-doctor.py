#!/usr/bin/env python3
"""Plan 90 Step 106 - install-doctor CLI.

Invoked by ``packaging/installers/install.{ps1,sh}`` BEFORE the action
loop runs. Renders the current plan, reads ``install.json``, and prints
a JSON report on stdout plus a human summary on stderr.

Exit codes (aligned with ``.lovable/memory/26-split-db-cli-cheatsheet.md``
§12 wrapper reservations 9500-9599):

* 0    ok (info-only findings)
* 20   warnings present (wrapper may continue with `--force-warn`)
* 21   errors present (wrapper MUST refuse to proceed)
* 2    invalid usage
* 3    plan renderer failed
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from BE.app.installer_doctor import DoctorSeverity, render_human, run_doctor
from BE.app.installer_plan import (
    InstallerPhase,
    InstallerPlatform,
    plan_install_actions,
)


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="install-doctor")
    p.add_argument("--install-root", required=True, type=Path)
    p.add_argument("--platform", required=True, choices=[e.value for e in InstallerPlatform])
    p.add_argument("--phase", required=True, choices=[e.value for e in InstallerPhase])
    p.add_argument("--interval-hours", type=int, default=24)
    p.add_argument("--retention-days", type=int, default=30)
    p.add_argument(
        "--binaries-dir",
        default=None,
        help=(
            "Release binaries directory (required for --phase install so the "
            "Step-127 path-link action can render its --binaries-dir arg)."
        ),
    )
    p.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Repo root used to check wrapper-inventory presence (Step 115).",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parse_args(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2

    # Doctor tolerates a missing binaries_dir on install: it uses a
    # placeholder so plan rendering succeeds and the report can flag
    # any real preflight problems (missing wrappers, platform drift,
    # tampered binaries) BEFORE the wrapper's own binaries-dir guard
    # runs. The wrapper still refuses to proceed without an explicit
    # $APP_BINARIES_DIR / -BinariesDir (Plan 90 Step 125).
    binaries_dir = args.binaries_dir
    if args.phase == "install" and not binaries_dir:
        binaries_dir = "<unset>"

    try:
        planned = plan_install_actions(
            platform=InstallerPlatform(args.platform),
            phase=InstallerPhase(args.phase),
            interval_hours=args.interval_hours,
            retention_days=args.retention_days,
            binaries_dir=binaries_dir,
        )
    except Exception as exc:  # noqa: BLE001 - surface as wrapper exit 3
        print(f"[install-doctor] plan renderer failed: {exc}", file=sys.stderr)
        return 3

    report = run_doctor(
        args.install_root,
        platform=InstallerPlatform(args.platform),
        planned_actions=planned,
        repo_root=args.repo_root,
    )
    # Machine-readable on stdout, human on stderr - wrappers may parse stdout.
    print(json.dumps(report.to_dict(), ensure_ascii=False))
    print(render_human(report), file=sys.stderr)

    if report.has_errors:
        return 21
    if report.has_warnings:
        return 20
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
