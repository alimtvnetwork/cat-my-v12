"""Verify SqliteConsentSink persists grant + consume rows."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from app.core.security.consent import ConsentLedger, ConsentPurpose
from app.core.security.consent_sqlite import SqliteConsentSink

MIGRATION = Path("app/core/io/migrations/task/001_consent_grants.sql")


def _open_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript(
        "CREATE TABLE IF NOT EXISTS SchemaVersion(version INTEGER PRIMARY KEY,"
        " appliedAt TEXT NOT NULL);"
    )
    conn.executescript(MIGRATION.read_text())
    return conn


def test_grant_then_consume_persists_row():
    conn = _open_db()
    ledger = ConsentLedger(sink=SqliteConsentSink(conn))
    rec = ledger.grant(
        task_id="TASK1",
        purpose=ConsentPurpose.EXPORT,
        data_classes=["images"],
        destination="usb:/dev/sda1",
    )
    row = conn.execute(
        "SELECT purpose, destination, dataClassesJson, consumedAt FROM ConsentGrant"
        " WHERE consentId=?",
        (rec.consent_id,),
    ).fetchone()
    assert row == ("EXPORT", "usb:/dev/sda1", json.dumps(["images"]), None)

    ledger.require(
        consent_id=rec.consent_id,
        purpose=ConsentPurpose.EXPORT,
        destination="usb:/dev/sda1",
    )
    consumed = conn.execute(
        "SELECT consumedAt, consumedDestination FROM ConsentGrant WHERE consentId=?",
        (rec.consent_id,),
    ).fetchone()
    assert consumed[0] is not None
    assert consumed[1] == "usb:/dev/sda1"
