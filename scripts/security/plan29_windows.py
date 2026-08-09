"""Plan 29 windows writer.

Thin wrapper over `export_denial_events.percentile_payload`. Reads a JSONL of
denial rows and writes a JSON payload with per-window percentiles, row counts,
and first/last ts to a target path (default `.lovable/memory/v2/plan29/20-windows.json`).

Plan 33 step 13. Deterministic: same JSONL in, same JSON out.

Usage:
    python3 scripts/security/plan29_windows.py \\
        --jsonl tests/fixtures/security/denial_sample.jsonl \\
        --out .lovable/memory/v2/plan29/20-windows.json
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from scripts.security.export_denial_events import percentile_payload

log = logging.getLogger("ca.scripts.plan29_windows")

DEFAULT_OUT = Path(".lovable/memory/v2/plan29/20-windows.json")


def build(jsonl_path: Path) -> dict[str, object]:
    payload = percentile_payload(jsonl_path)
    log.info("plan29_windows.built jsonl=%s windows=%d", jsonl_path, len(payload))
    return {"source": str(jsonl_path), "windows": payload}


def write(jsonl_path: Path, out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = build(jsonl_path)
    out_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    log.info("plan29_windows.wrote out=%s", out_path)
    return out_path


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Write Plan 29 windows JSON")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--jsonl", type=Path, help="Path to denial-events JSONL input")
    src.add_argument("--input", dest="jsonl_alias", type=Path,
                     help="Alias for --jsonl (Plan 48 step 5 verification command)")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--check", action="store_true",
                        help="Verify DEFAULT_OUT matches the fixture without writing")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(name)s %(message)s")
    jsonl_path: Path = args.jsonl or args.jsonl_alias
    try:
        if args.check:
            expected = build(jsonl_path)
            if not args.out.exists():
                log.error("plan29_windows.check_missing_out out=%s", args.out)
                return 3
            on_disk = json.loads(args.out.read_text(encoding="utf-8"))
            if on_disk != expected:
                log.error("plan29_windows.check_mismatch out=%s", args.out)
                return 4
            log.info("plan29_windows.check_ok out=%s", args.out)
        else:
            write(jsonl_path, args.out)
    except Exception:  # noqa: BLE001
        log.exception("plan29_windows.failed")
        return 2
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main(sys.argv[1:]))
