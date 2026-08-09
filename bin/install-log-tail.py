#!/usr/bin/env python3
"""Plan 90 Step 107 - install-log-tail CLI.

Reads ``install.json`` (and, optionally, the archived
``install-history.log[.1]``) at ``--install-root`` and prints the last
N entries oldest-first. Used by operators to answer "what was the
result of the last install action?" without opening JSON in an editor.

Exit codes:
* 0    printed
* 2    invalid usage
* 3    manifest / archive unreadable
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from BE.app.install_log_rotator import read_archive_entries
from BE.app.install_manifest import read_manifest
from BE.errors.apperror import AppError


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="install-log-tail")
    p.add_argument("--install-root", required=True, type=Path)
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--name", default=None)
    p.add_argument("--phase", choices=["install", "uninstall"], default=None)
    p.add_argument("--status", choices=["success", "failure"], default=None)
    p.add_argument("--include-archive", action="store_true")
    p.add_argument("--format", choices=["json", "human"], default="human")
    return p.parse_args(argv)


def _matches(entry: dict[str, Any], *, name: str | None, phase: str | None,
             status: str | None) -> bool:
    if name is not None and entry.get("Name") != name:
        return False
    if phase is not None and entry.get("Phase") != phase:
        return False
    if status == "success" and entry.get("IsSuccess") is not True:
        return False
    if status == "failure" and entry.get("IsSuccess") is not False:
        return False
    return True


def _render_human(entries: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for e in entries:
        tag = "OK  " if e.get("IsSuccess") is True else "FAIL"
        lines.append(
            f"{e.get('StartedAt', '?')}  {tag}  {str(e.get('Phase', '?')):9s}  "
            f"{e.get('Name', '?')}  exit={e.get('ExitCode', '?')} "
            f"dur={e.get('DurationMs', '?')}ms"
        )
    return "\n".join(lines)


def _collect(install_root: Path, *, include_archive: bool) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    if include_archive:
        collected.extend(read_archive_entries(install_root))
    manifest = read_manifest(install_root)
    if manifest is not None:
        collected.extend(manifest.Actions)
    return collected


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parse_args(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2

    if args.limit <= 0:
        print("[install-log-tail] --limit must be > 0", file=sys.stderr)
        return 2

    try:
        collected = _collect(args.install_root, include_archive=args.include_archive)
    except AppError as exc:
        print(f"[install-log-tail] {exc.code.name}: {exc.message}", file=sys.stderr)
        return 3

    filtered = [
        e for e in collected
        if _matches(e, name=args.name, phase=args.phase, status=args.status)
    ]
    tail = filtered[-args.limit:]
    if args.format == "json":
        print(json.dumps(tail, indent=2, ensure_ascii=False))
    else:
        print(_render_human(tail))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
