"""Unit test — migrate runner applies root DB and reports PascalCase-consistent schema.

Closes audit finding F-54 (unit tier of pytest pyramid).
Anchor: spec/21-app/26-migrations.md §3.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.core.io.migrate import migrate  # noqa: E402


def test_root_db_migration_applies(tmp_path: Path) -> None:
    db = tmp_path / "root.db"
    migrations = ROOT / "app" / "core" / "io" / "migrations" / "root"
    version = migrate(db, migrations)
    assert version >= 0, f"expected non-negative version, got {version}"
    conn = sqlite3.connect(str(db))
    try:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    finally:
        conn.close()
    assert "SchemaVersion" in tables
    assert "Job" in tables
    assert "Task" in tables


def test_migration_is_idempotent(tmp_path: Path) -> None:
    db = tmp_path / "root.db"
    migrations = ROOT / "app" / "core" / "io" / "migrations" / "root"
    first = migrate(db, migrations)
    second = migrate(db, migrations)
    assert first == second, f"replay changed version: {first} → {second}"
