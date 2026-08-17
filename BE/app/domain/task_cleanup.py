"""TaskDb Cleanup CLI Command.

Provides `worker cleanup` subcommand to truncate old TaskDb entries
and prevent disk full issues (Task 177).
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def cleanup_old_task_entries(
    max_age_days: int = 30,
    task_db_path: Optional[Path] = None,
) -> int:
    """
    Delete TaskDb entries older than `max_age_days`.

    Returns the number of rows deleted.
    """
    import sqlite3
    from datetime import datetime, timedelta, timezone

    if task_db_path is None:
        task_db_path = Path("data/task.db")

    if not task_db_path.exists():
        logger.warning("TaskDb not found at %s, skipping cleanup", task_db_path)
        return 0

    cutoff = int(
        (datetime.now(timezone.utc) - timedelta(days=max_age_days)).timestamp()
    )

    conn = sqlite3.connect(str(task_db_path))
    try:
        cursor = conn.execute(
            # Task 244: golden images (IsGolden=1) are protected from retention cleanup
            "DELETE FROM TaskEntry WHERE CreatedAt < ? AND (IsGolden IS NULL OR IsGolden = 0)",
            (cutoff,)
        )
        deleted = cursor.rowcount
        conn.commit()
        logger.info("cleanup_task_db: deleted %d rows older than %d days", deleted, max_age_days)
        return deleted
    finally:
        conn.close()
