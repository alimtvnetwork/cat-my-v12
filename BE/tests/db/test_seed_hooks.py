"""Plan 90 Step 38 - tests for tier-scoped seed hooks.

Anchors:
- ``BE/db/seed_hooks.py`` (contract under test).
- ``spec/21-app/26-migrations.md`` §"Seed vs migration" (idempotence
  requirement; ``SchemaVersion`` untouched by seeds).
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §9 (per-tier
  isolation; hooks receive an already-open connection).

Coverage:
  1. Each hook is a no-op on a freshly migrated tier (row counts
     unchanged, ``SchemaVersion`` untouched).
  2. Each hook is idempotent - calling twice yields identical DB state.
  3. Each hook refuses non-``sqlite3.Connection`` inputs with a
     ``TypeError`` naming the tier (guardrail against passing a path
     or a cursor).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from BE.db.connections import get_root_conn, get_task_conn, get_rules_conn
from BE.db.seed_hooks import seed_root, seed_task, seed_rules

MIGRATIONS_ROOT = Path(__file__).resolve().parents[2] / "db" / "migrations"


def _apply_tier(conn, tier: str) -> None:
    tier_dir = MIGRATIONS_ROOT / tier
    if not tier_dir.exists():
        return
    for sql_path in sorted(tier_dir.glob("*.sql")):
        conn.executescript(sql_path.read_text(encoding="utf-8"))


def _snapshot(conn) -> dict[str, int | list[tuple]]:
    """Capture per-table row counts + SchemaVersion contents."""
    tables = [
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
    ]
    snap: dict[str, int | list[tuple]] = {}
    for t in tables:
        snap[f"count:{t}"] = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    if "SchemaVersion" in tables:
        snap["SchemaVersion"] = sorted(
            conn.execute("SELECT Version, AppliedAt FROM SchemaVersion").fetchall()
        )
    return snap


@pytest.fixture
def db_root(tmp_path: Path) -> Path:
    root = tmp_path / "vision-db"
    root.mkdir()
    with get_root_conn(db_root=root) as c:
        _apply_tier(c, "root")
    with get_task_conn(db_root=root) as c:
        _apply_tier(c, "task")
    with get_rules_conn(db_root=root) as c:
        _apply_tier(c, "rules")
    return root


@pytest.mark.parametrize(
    "opener,hook,tier",
    [
        (get_root_conn, seed_root, "root"),
        (get_task_conn, seed_task, "task"),
        (get_rules_conn, seed_rules, "rules"),
    ],
)
def test_seed_hook_is_noop_and_idempotent(db_root: Path, opener, hook, tier) -> None:
    with opener(db_root=db_root) as conn:
        before = _snapshot(conn)
        hook(conn)
        after_first = _snapshot(conn)
        hook(conn)
        after_second = _snapshot(conn)
    assert before == after_first, f"seed_{tier} mutated a freshly migrated tier"
    assert after_first == after_second, f"seed_{tier} is not idempotent"


@pytest.mark.parametrize(
    "hook,tier",
    [(seed_root, "root"), (seed_task, "task"), (seed_rules, "rules")],
)
def test_seed_hook_rejects_non_connection(hook, tier) -> None:
    with pytest.raises(TypeError) as exc_info:
        hook("/tmp/not-a-connection.db")
    assert tier in str(exc_info.value)


def test_seed_hooks_do_not_open_transactions(db_root: Path) -> None:
    """Contract §"MUST NOT run inside their own BEGIN/COMMIT".

    Verified by opening an explicit transaction, running the hook, and
    confirming the outer transaction is still live (in_transaction True)
    and rolls back cleanly.
    """
    with get_root_conn(db_root=db_root) as conn:
        conn.execute("BEGIN")
        assert conn.in_transaction
        seed_root(conn)
        assert conn.in_transaction, "seed_root() must not COMMIT the caller's txn"
        conn.execute("ROLLBACK")
