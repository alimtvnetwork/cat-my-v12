"""Tests for the read-only audit_cli."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from app.core.security.audit_cli import main
from app.core.security.audit_sink import (
    CODE_ADMIN_WRITE,
    CODE_ROLE_DENIED,
    AuditSink,
)


def _seed(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    sink = AuditSink(conn)
    sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1", detail="need admin")
    sink.record(CODE_ADMIN_WRITE, "settings:camera", user_id="u2", detail="key=exposure")
    sink.record(CODE_ROLE_DENIED, "settings:trigger", user_id="u3", detail="need admin")
    conn.close()


def test_text_output_lists_all(tmp_path, capsys):
    db = tmp_path / "a.db"
    _seed(db)
    rc = main(["--db", str(db), "--limit", "10"])
    assert rc == 0
    out = capsys.readouterr().out
    assert "E_SEC_ROLE_DENIED" in out
    assert "I_SEC_ADMIN_WRITE" in out
    assert "settings:camera" in out


def test_json_filter_by_code(tmp_path, capsys):
    db = tmp_path / "a.db"
    _seed(db)
    rc = main(["--db", str(db), "--code", "E_SEC_ROLE_DENIED", "--json"])
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert len(payload) == 2
    assert {e["code"] for e in payload} == {"E_SEC_ROLE_DENIED"}
    assert all("iso" in e for e in payload)


def test_missing_db_exits_nonzero(tmp_path, capsys):
    rc = main(["--db", str(tmp_path / "missing.db")])
    assert rc == 2
    assert "not found" in capsys.readouterr().err


def test_readonly_connection_rejects_writes(tmp_path):
    db = tmp_path / "a.db"
    _seed(db)
    from app.core.security.audit_cli import _open_ro

    conn = _open_ro(str(db))
    with pytest.raises(sqlite3.OperationalError):
        conn.execute("INSERT INTO audit_log(ts,code,subject,detail) VALUES (1,'x','y','z')")
        conn.commit()
    conn.close()


def test_bad_limit_rejected(tmp_path, capsys):
    db = tmp_path / "a.db"
    _seed(db)
    rc = main(["--db", str(db), "--limit", "0"])
    assert rc == 2
