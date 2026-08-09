"""Read-only CLI over `audit_log`.

Usage:
    python -m app.core.security.audit_cli --db path/to.db [--code E_SEC_ROLE_DENIED] [--limit 50] [--json]

Contract:
  - Read-only: never issues INSERT/UPDATE/DELETE. Opens SQLite in URI mode
    with `?mode=ro` so accidental writes fail loudly instead of mutating
    the audit trail.
  - Silent-failure is unacceptable: missing DB / bad code surfaces as a
    non-zero exit and a stderr message.
"""
from __future__ import annotations

import argparse
import json
import logging
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.core.security.audit_sink import AuditSink

log = logging.getLogger("ca.security.audit_cli")


def _open_ro(db_path: str) -> sqlite3.Connection:
    p = Path(db_path)
    if not p.exists():
        raise FileNotFoundError(f"audit db not found: {db_path}")
    uri = f"file:{p.as_posix()}?mode=ro"
    return sqlite3.connect(uri, uri=True)


def render(events, *, as_json: bool) -> str:
    if as_json:
        return json.dumps(
            [
                {
                    "ts": e.ts,
                    "iso": datetime.fromtimestamp(e.ts, tz=timezone.utc).isoformat(),
                    "code": e.code,
                    "user_id": e.user_id,
                    "subject": e.subject,
                    "detail": e.detail,
                }
                for e in events
            ],
            indent=2,
        )
    lines = [f"{'timestamp (utc)':<20}  {'code':<22}  {'user':<12}  subject :: detail"]
    for e in events:
        iso = datetime.fromtimestamp(e.ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        lines.append(f"{iso:<20}  {e.code:<22}  {(e.user_id or '-'): <12}  {e.subject} :: {e.detail}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="audit_cli", description="Read-only audit_log query CLI")
    parser.add_argument("--db", required=True, help="Path to SQLite database containing audit_log")
    parser.add_argument("--code", default=None, help="Filter by event code (e.g. E_SEC_ROLE_DENIED)")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of a text table")
    args = parser.parse_args(argv)

    if args.limit <= 0:
        print("--limit must be > 0", file=sys.stderr)
        return 2

    try:
        conn = _open_ro(args.db)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    try:
        sink = AuditSink.__new__(AuditSink)  # skip __post_init__ (would CREATE TABLE — RO conn)
        sink.conn = conn
        events = sink.query(code=args.code, limit=args.limit)
    except sqlite3.Error as exc:
        log.exception("audit_cli.query_failed", extra={"err": str(exc)})
        print(f"query failed: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()

    print(render(events, as_json=args.json))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
