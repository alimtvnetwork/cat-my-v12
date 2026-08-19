"""Plan 90 Step 37 - split-DB isolation runtime proof.

Anchors:
- ``spec/05-split-db-architecture/**`` (each tier is a distinct SQLite
  file; NO cross-tier joins, NO cross-tier FKs, NO ``ATTACH DATABASE``).
- ``spec/21-app/76-cli-log-and-ipc.md`` §"Database ownership"
  (Root owns ``CliInvocation``, ``Device``, ``CaptureSession``; Task
  owns ``Capture``, ``Frame``, ``Result``, ``ResultDetail``,
  ``IpcMessage``; Rules owns the rule bundles).
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §9 (cross-tier
  references are opaque INTEGERs; the guard on ``_GuardedConnection``
  trips on ``ATTACH``).

These are runtime tests, not static scanners: Step 36 already lints the
DDL. This suite proves the *actual* file split does what the spec says
by applying every migration to a temp ``db_root`` and asserting:

1. Each tier's ``sqlite_master`` reports only its own tables (plus the
   shared ``SchemaVersion`` bookkeeping row).
2. A write into Task-DB is invisible from Root-DB, and vice versa.
3. ``ATTACH DATABASE`` from any tier connection raises
   ``AppError(E_CLI_PREFLIGHT_FAILED)`` (belt-and-braces on top of the
   unit test in ``test_connections.py``; verifies the guard survives
   the migration bootstrap path).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from BE.db.connections import get_root_conn, get_rules_conn, get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

MIGRATIONS_ROOT = Path(__file__).resolve().parents[2] / "db" / "migrations"

# Tables owned by each tier per spec 76 §"Database ownership". These are
# the assertions - if the ownership matrix changes, update the spec first
# and then this list; the test is the enforcement point.
ROOT_TABLES = {"CliInvocation", "Device", "CaptureSession"}
TASK_TABLES = {"Capture", "Frame", "Result", "ResultDetail", "IpcMessage", "RunSession", "RuleResult", "FrameArtifact"}
RULES_TABLES: set[str] = set()  # no rules migrations yet as of Step 37


def _apply_tier(conn, tier: str) -> None:
    tier_dir = MIGRATIONS_ROOT / tier
    if not tier_dir.exists():
        return
    for sql_path in sorted(tier_dir.glob("*.sql")):
        conn.executescript(sql_path.read_text(encoding="utf-8"))


@pytest.fixture
def db_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Isolated ``APP_DB_ROOT`` per test; all three tiers materialised."""
    root = tmp_path / "vision-db"
    root.mkdir()
    # Bootstrap each tier by applying its migrations through the guarded
    # connection - that way we also prove the guard tolerates real DDL.
    with get_root_conn(db_root=root) as c:
        _apply_tier(c, "root")
    with get_task_conn(db_root=root) as c:
        _apply_tier(c, "task")
    with get_rules_conn(db_root=root) as c:
        _apply_tier(c, "rules")
    return root


def _user_tables(conn) -> set[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master "
        "WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'SchemaVersion'"
    ).fetchall()
    return {r[0] for r in rows}


def test_each_tier_sees_only_its_own_tables(db_root: Path) -> None:
    with get_root_conn(db_root=db_root) as root:
        assert _user_tables(root) == ROOT_TABLES
    with get_task_conn(db_root=db_root) as task:
        assert _user_tables(task) == TASK_TABLES
    with get_rules_conn(db_root=db_root) as rules:
        assert _user_tables(rules) == RULES_TABLES


def test_task_write_is_invisible_to_root(db_root: Path) -> None:
    with get_task_conn(db_root=db_root) as task:
        task.execute(
            "INSERT INTO Capture (RunId, CaptureSessionId, FrameKey, Width, Height, "
            "PixelFormat, ByteSize, Sha256) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("run-A", 12345, "frames/run-A/0001.png", 1920, 1080, "BayerRG8", 0, "0" * 64),
        )
        assert task.execute("SELECT COUNT(*) FROM Capture").fetchone()[0] == 1
    with get_root_conn(db_root=db_root) as root:
        with pytest.raises(Exception) as exc_info:
            root.execute("SELECT COUNT(*) FROM Capture").fetchone()
        assert "no such table" in str(exc_info.value).lower()


def test_root_write_is_invisible_to_task(db_root: Path) -> None:
    with get_root_conn(db_root=db_root) as root:
        root.execute(
            "INSERT INTO Device (Serial, Vendor, Model) VALUES (?, ?, ?)",
            ("SN-TEST-001", "Daheng", "MER2-160"),
        )
        assert root.execute("SELECT COUNT(*) FROM Device").fetchone()[0] == 1
    with get_task_conn(db_root=db_root) as task:
        with pytest.raises(Exception) as exc_info:
            task.execute("SELECT COUNT(*) FROM Device").fetchone()
        assert "no such table" in str(exc_info.value).lower()


def test_attach_database_is_rejected_on_every_tier(db_root: Path, tmp_path: Path) -> None:
    sibling = tmp_path / "sibling.db"
    for opener in (get_root_conn, get_task_conn, get_rules_conn):
        with opener(db_root=db_root) as conn:
            res = conn.safe_execute(f"ATTACH DATABASE '{sibling}' AS sibling")
            assert res.hasError
            assert res.isFail
            assert isinstance(res.error, AppError)
            assert res.error.code is ErrorCode.E_CLI_PREFLIGHT_FAILED
