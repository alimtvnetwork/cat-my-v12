"""Contract tests for operator consent gate (F-44, spec 21-app/44 §5)."""
from __future__ import annotations

import pytest

from app.core.errors.codes import ErrorCode
from app.core.security.consent import (
    ConsentLedger,
    ConsentMissingError,
    ConsentPurpose,
    ConsentReusedError,
)


def _ledger() -> ConsentLedger:
    return ConsentLedger()


def test_grant_then_require_consumes_once() -> None:
    ledger = _ledger()
    rec = ledger.grant(
        task_id="T1", purpose=ConsentPurpose.EXPORT,
        data_classes=["InspectionResult"], destination="/tmp/bundle.zip",
    )
    got = ledger.require(
        consent_id=rec.consent_id, purpose=ConsentPurpose.EXPORT,
        destination="/tmp/bundle.zip",
    )
    assert got.consent_id == rec.consent_id
    # Second require → reuse.
    with pytest.raises(ConsentReusedError) as exc:
        ledger.require(
            consent_id=rec.consent_id, purpose=ConsentPurpose.EXPORT,
            destination="/tmp/bundle.zip",
        )
    assert exc.value.code is ErrorCode.E_SEC_CONSENT_REUSED


def test_missing_consent_raises_typed_error() -> None:
    with pytest.raises(ConsentMissingError) as exc:
        _ledger().require(
            consent_id=None, purpose=ConsentPurpose.AI_REVIEW,
            destination="stub-provider",
        )
    assert exc.value.code is ErrorCode.E_SEC_CONSENT_MISSING


def test_purpose_specific_export_does_not_authorize_ai_review() -> None:
    ledger = _ledger()
    rec = ledger.grant(
        task_id="T1", purpose=ConsentPurpose.EXPORT,
        data_classes=["InspectionResult"], destination="stub-provider",
    )
    with pytest.raises(ConsentReusedError) as exc:
        ledger.require(
            consent_id=rec.consent_id, purpose=ConsentPurpose.AI_REVIEW,
            destination="stub-provider",
        )
    assert exc.value.code is ErrorCode.E_SEC_CONSENT_REUSED


def test_destination_mismatch_rejected() -> None:
    ledger = _ledger()
    rec = ledger.grant(
        task_id="T1", purpose=ConsentPurpose.EXPORT,
        data_classes=["InspectionResult"], destination="/tmp/a.zip",
    )
    with pytest.raises(ConsentReusedError):
        ledger.require(
            consent_id=rec.consent_id, purpose=ConsentPurpose.EXPORT,
            destination="/tmp/b.zip",
        )
