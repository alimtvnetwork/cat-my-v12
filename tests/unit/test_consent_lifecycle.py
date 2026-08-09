"""Consent lifecycle depth — reuse, purpose/destination mismatch, persistence side effects."""
from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app.core.security.consent import (
    ConsentLedger,
    ConsentMissingError,
    ConsentPurpose,
    ConsentReusedError,
)
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


def _grant(ledger: ConsentLedger, purpose=ConsentPurpose.EXPORT, dest="usb:/dev/sda1"):
    return ledger.grant(task_id="TASK1", purpose=purpose, data_classes=["images"], destination=dest)


def test_missing_consent_id_raises():
    ledger = ConsentLedger()
    with pytest.raises(ConsentMissingError):
        ledger.require(consent_id=None, purpose=ConsentPurpose.EXPORT, destination="usb:/x")
    with pytest.raises(ConsentMissingError):
        ledger.require(consent_id="unknown", purpose=ConsentPurpose.EXPORT, destination="usb:/x")


def test_second_consume_is_rejected_and_not_repersisted():
    conn = _open_db()
    ledger = ConsentLedger(sink=SqliteConsentSink(conn))
    rec = _grant(ledger)
    ledger.require(consent_id=rec.consent_id, purpose=ConsentPurpose.EXPORT, destination="usb:/dev/sda1")
    with pytest.raises(ConsentReusedError):
        ledger.require(consent_id=rec.consent_id, purpose=ConsentPurpose.EXPORT, destination="usb:/dev/sda1")
    # Persisted row must still show exactly one consume.
    row = conn.execute(
        "SELECT consumedAt, consumedDestination FROM ConsentGrant WHERE consentId=?",
        (rec.consent_id,),
    ).fetchone()
    assert row[0] is not None and row[1] == "usb:/dev/sda1"


def test_purpose_mismatch_blocks_consume():
    ledger = ConsentLedger()
    rec = _grant(ledger, purpose=ConsentPurpose.EXPORT)
    with pytest.raises(ConsentReusedError):
        ledger.require(consent_id=rec.consent_id, purpose=ConsentPurpose.AI_REVIEW, destination="usb:/dev/sda1")


def test_destination_mismatch_blocks_consume():
    ledger = ConsentLedger()
    rec = _grant(ledger, dest="usb:/dev/sda1")
    with pytest.raises(ConsentReusedError):
        ledger.require(consent_id=rec.consent_id, purpose=ConsentPurpose.EXPORT, destination="usb:/dev/sdb2")


def test_sink_failure_does_not_break_ledger():
    class BoomSink:
        def on_grant(self, record):
            raise RuntimeError("disk full")

        def on_consume(self, *_a, **_kw):
            raise RuntimeError("disk full")

    ledger = ConsentLedger(sink=BoomSink())
    rec = _grant(ledger)  # must not raise despite sink failure
    ledger.require(consent_id=rec.consent_id, purpose=ConsentPurpose.EXPORT, destination="usb:/dev/sda1")
