#!/usr/bin/env python3
"""Plan 90 Step 109 - unified `log-tail` CLI over any JSONL rotator pair.

Reads a ``<name>.log`` current file and its ``<name>.log.1`` archive via
``BE.app.jsonl_rotator.read_pair`` and prints the last N entries
oldest-first. Works for the installer manifest overflow, retention loop
summaries (Step 110), future IPC audit tails, or any other stream
produced by ``jsonl_rotator.append_and_roll``.

Root cause guarded (one sentence): the Step 107 installer tail
(`bin/install-log-tail.py`) hard-coded the manifest schema, so every
future JSONL audit stream would need its own bespoke tail helper
(drift risk + operator UX fragmentation).

Exit codes:
* 0 - printed
* 2 - invalid usage
* 3 - unreadable input (OSError surfaced from the primitive)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from BE.app.jsonl_rotator import read_pair


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="log-tail")
    p.add_argument("--current", required=True, type=Path,
                   help="Path to the live JSONL file (e.g. install-history.log).")
    p.add_argument("--previous", type=Path, default=None,
                   help="Path to the rolled archive. Default: <current>.1")
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--filter", action="append", default=[],
                   metavar="Key=Value",
                   help="Repeatable equality filter on top-level fields.")
    p.add_argument("--format", choices=["json", "human"], default="human")
    return p.parse_args(argv)


def _parse_filters(raw: list[str]) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for item in raw:
        if "=" not in item:
            raise ValueError(f"--filter must be Key=Value, got: {item!r}")
        k, v = item.split("=", 1)
        if not k:
            raise ValueError(f"--filter key must be non-empty: {item!r}")
        out.append((k, v))
    return out


def _matches(entry: dict[str, Any], filters: list[tuple[str, str]]) -> bool:
    for key, value in filters:
        if str(entry.get(key, "")) != value:
            return False
    return True


def _render_human(entries: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for e in entries:
        if "_ParseError" in e:
            lines.append(f"POISON  {e.get('_ParseError', '?')}  {e.get('_Raw', '')}")
            continue
        lines.append(json.dumps(e, ensure_ascii=False, sort_keys=True))
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    try:
        args = _parse_args(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2

    if args.limit <= 0:
        print("[log-tail] --limit must be > 0", file=sys.stderr)
        return 2

    try:
        filters = _parse_filters(args.filter)
    except ValueError as exc:
        print(f"[log-tail] {exc}", file=sys.stderr)
        return 2

    previous = args.previous if args.previous is not None else Path(
        str(args.current) + ".1"
    )

    try:
        entries = read_pair(args.current, previous)
    except OSError as exc:
        print(f"[log-tail] unreadable input: {exc}", file=sys.stderr)
        return 3

    filtered = [e for e in entries if _matches(e, filters)]
    tail = filtered[-args.limit:]
    if args.format == "json":
        print(json.dumps(tail, indent=2, ensure_ascii=False, sort_keys=True))
    else:
        print(_render_human(tail))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
