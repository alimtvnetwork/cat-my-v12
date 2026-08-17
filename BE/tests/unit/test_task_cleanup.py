"""Unit tests for TaskDb cleanup — verify golden images are protected (Task 245)."""
import sqlite3
import tempfile
import time
from pathlib import Path

from BE.app.domain.task_cleanup import cleanup_old_task_entries


def _make_test_db(path: Path) -> None:
    """Create a minimal test DB with TaskEntry table."""
    conn = sqlite3.connect(str(path))
    conn.execute(
        """
        CREATE TABLE TaskEntry (
            Id INTEGER PRIMARY KEY,
            CreatedAt INTEGER NOT NULL,
            IsGolden INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    old_time = int(time.time()) - (40 * 24 * 3600)  # 40 days ago
    # 3 old entries: 1 golden, 2 normal
    conn.execute("INSERT INTO TaskEntry (CreatedAt, IsGolden) VALUES (?, 0)", (old_time,))
    conn.execute("INSERT INTO TaskEntry (CreatedAt, IsGolden) VALUES (?, 0)", (old_time,))
    conn.execute("INSERT INTO TaskEntry (CreatedAt, IsGolden) VALUES (?, 1)", (old_time,))  # golden!
    conn.commit()
    conn.close()


def test_cleanup_deletes_old_non_golden() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "task.db"
        _make_test_db(db_path)

        deleted = cleanup_old_task_entries(max_age_days=30, task_db_path=db_path)
        assert deleted == 2  # only the 2 non-golden rows


def test_cleanup_preserves_golden_images() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "task.db"
        _make_test_db(db_path)

        cleanup_old_task_entries(max_age_days=30, task_db_path=db_path)

        conn = sqlite3.connect(str(db_path))
        remaining = conn.execute("SELECT COUNT(*) FROM TaskEntry WHERE IsGolden = 1").fetchone()[0]
        conn.close()
        assert remaining == 1  # golden image was NOT deleted


def test_cleanup_skips_missing_db() -> None:
    """If DB doesn't exist, return 0 without crashing."""
    deleted = cleanup_old_task_entries(task_db_path=Path("/nonexistent/task.db"))
    assert deleted == 0
