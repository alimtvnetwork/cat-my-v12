"""CLI wrapper for the migration runner.

Usage:
    python -m app.core.io.migrate_cli --db root|task|rules --path <file.db> [--dir <migrations>]

Contract: spec/21-app/26-migrations.md §4.
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from app.core.io.migrate import migrate, MigrationError

DB_KINDS = ("root", "task", "rules")
DEFAULT_DIRS = {
    "root": "app/core/io/migrations/root",
    "task": "app/core/io/migrations/task",
    "rules": "app/core/io/migrations/rules",
}


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="migrate")
    p.add_argument("--db", required=True, choices=DB_KINDS)
    p.add_argument("--path", required=True, type=Path)
    p.add_argument("--dir", type=Path, default=None)
    return p.parse_args(argv)


def _resolve_dir(kind: str, override: Path | None) -> Path:
    if override is not None:
        return override
    return Path(DEFAULT_DIRS[kind])


def run(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO)
    args = _parse_args(argv)
    migrations_dir = _resolve_dir(args.db, args.dir)
    try:
        version = migrate(args.path, migrations_dir)
    except MigrationError as err:
        logging.error("migrate.cli failed code=%s err=%s", err.code, err)
        return 2
    logging.info("migrate.cli done db=%s path=%s version=%d", args.db, args.path, version)
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
