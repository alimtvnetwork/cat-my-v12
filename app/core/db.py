import logging
import sqlite3
from typing import Any, Tuple

log = logging.getLogger("db.safe_execute")

def safe_execute(conn: sqlite3.Connection, sql: str, parameters: tuple = ()) -> sqlite3.Cursor:
    """Centralized query wrapper that handles automatic failure logging."""
    try:
        return conn.execute(sql, parameters)
    except sqlite3.Error as exc:
        log.error("db.query_failed", extra={"sql": sql, "err": str(exc)})
        raise

def safe_executescript(conn: sqlite3.Connection, sql_script: str) -> sqlite3.Cursor:
    """Centralized query wrapper for executing scripts."""
    try:
        return conn.executescript(sql_script)
    except sqlite3.Error as exc:
        log.error("db.script_failed", extra={"err": str(exc)})
        raise
