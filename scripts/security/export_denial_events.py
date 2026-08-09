"""One-shot exporter: dump denial-related audit events to JSON Lines.

Plan 29 Step 8. Reads `E_SEC_ROLE_DENIED` and `E_SEC_NOAUTH` from an
`AuditSink` SQLite database and emits one JSON object per line. No mutation
of the sink. Every step is logged; failures are re-raised.

Usage:
    python3 scripts/security/export_denial_events.py \\
        --db path/to/audit.sqlite \\
        --window-hours 2160 \\
        --out /tmp/denial_events.jsonl

The 90-day default window (2160h) matches Plan 29 Step 7 ("rolling 90 days").
"""
from __future__ import annotations

import argparse
import json
import logging
import sqlite3
import sys
import time
from dataclasses import asdict
from pathlib import Path

from app.core.security.audit_sink import (
    AuditSink,
    CODE_NOT_AUTHENTICATED,
    CODE_ROLE_DENIED,
)
from app.core.security.denial_metrics import load_rows, percentiles_by_window

log = logging.getLogger("ca.scripts.export_denial_events")

CODES = (CODE_ROLE_DENIED, CODE_NOT_AUTHENTICATED)
WINDOWS = (("window_1m", 60), ("window_5m", 300), ("window_15m", 900))


def export(db_path: Path, out_path: Path, window_hours: int, now: int | None = None) -> int:
    """Return the number of rows exported. Log every step."""
    if window_hours <= 0:
        raise ValueError("window_hours must be positive")
    cutoff = (now if now is not None else int(time.time())) - window_hours * 3600
    log.info("export.start db=%s out=%s cutoff_ts=%d", db_path, out_path, cutoff)

    conn = sqlite3.connect(str(db_path))
    try:
        sink = AuditSink(conn=conn)
        count = 0
        with out_path.open("w", encoding="utf-8") as fh:
            for code in CODES:
                # `.query` orders DESC by id and caps at `limit`; use a large
                # cap so a 90-day pull is not silently truncated.
                rows = sink.query(code=code, limit=10_000_000)
                log.info("export.code code=%s rows_fetched=%d", code, len(rows))
                for ev in rows:
                    if ev.ts < cutoff:
                        continue
                    fh.write(
                        json.dumps(
                            {
                                "ts": ev.ts,
                                "code": ev.code,
                                "user_id": ev.user_id,
                                "subject": ev.subject,
                                "detail": ev.detail,
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                    count += 1
        log.info("export.done rows_written=%d", count)
        return count
    finally:
        conn.close()


def percentile_payload(jsonl_path: Path) -> dict[str, dict[str, int | None]]:
    rows = load_rows(jsonl_path)
    return {
        name: asdict(percentiles_by_window(rows, seconds))
        for name, seconds in WINDOWS
    }


def write_percentiles(jsonl_path: Path, out_path: Path | None) -> None:
    payload = json.dumps(percentile_payload(jsonl_path), indent=2, sort_keys=True)
    if out_path is not None:
        out_path.write_text(payload + "\n", encoding="utf-8")
        return
    print(payload)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Export denial events to JSONL")
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--window-hours", type=int, default=2160)
    parser.add_argument("--percentiles", action="store_true")
    parser.add_argument("--percentiles-out", type=Path)
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(name)s %(message)s")
    try:
        n = export(args.db, args.out, args.window_hours)
        if args.percentiles:
            write_percentiles(args.out, args.percentiles_out)
    except Exception:  # noqa: BLE001
        log.exception("export.failed")
        return 2
    log.info("export.exit rows=%d", n)
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main(sys.argv[1:]))
