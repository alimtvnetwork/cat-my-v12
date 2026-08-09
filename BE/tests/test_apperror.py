"""Tests for BE.errors.apperror on the Universal Response Envelope."""

from __future__ import annotations

from http import HTTPStatus

import pytest

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_URL = "http://test/api/thing"


def test_apperror_carries_typed_code() -> None:
    err = AppError(ErrorCode.E_BE_NOT_FOUND, "rule 42 missing", {"rule_id": 42})
    assert err.code is ErrorCode.E_BE_NOT_FOUND
    assert err.message == "rule 42 missing"
    assert err.details == {"rule_id": 42}


def test_apperror_is_an_exception() -> None:
    err = AppError(ErrorCode.E_BE_INTERNAL, "boom")
    assert isinstance(err, Exception)
    assert str(err) == "boom"


def test_details_defaults_to_empty_dict() -> None:
    assert AppError(ErrorCode.E_BE_BAD_REQUEST, "x").details == {}


def test_http_status_derives_from_registry() -> None:
    assert AppError(ErrorCode.E_BE_NOT_FOUND, "x").http_status == HTTPStatus.NOT_FOUND
    assert AppError(ErrorCode.E_SEC_UNAPPROVED_EGRESS, "x").http_status == HTTPStatus.FORBIDDEN
    assert AppError(ErrorCode.E_CAM_TIMEOUT, "x").http_status == HTTPStatus.GATEWAY_TIMEOUT


def test_to_envelope_matches_wire_contract() -> None:
    err = AppError(ErrorCode.E_BE_CONFLICT, "duplicate rule id", {"rule_id": 7})
    wire = err.to_envelope(requested_at=_URL).to_wire()
    assert wire["Status"]["IsFailed"] is True
    assert wire["Status"]["Code"] == 409
    assert wire["Results"] == []
    assert wire["Errors"]["Code"] == "E_BE_CONFLICT"
    assert wire["Errors"]["BackendMessage"] == "duplicate rule id"


def test_cause_is_preserved() -> None:
    original = ValueError("vendor blew up")
    try:
        raise AppError(ErrorCode.E_CAM_CAPTURE_FAILED, "capture failed", cause=original)
    except AppError as caught:
        assert caught.cause is original
        assert caught.__cause__ is original


def test_raise_from_pattern_still_works() -> None:
    original = TimeoutError("vendor timeout")
    with pytest.raises(AppError) as exc:
        try:
            raise original
        except TimeoutError as vendor_exc:
            raise AppError(
                ErrorCode.E_CAM_TIMEOUT, "capture timed out", cause=vendor_exc
            ) from vendor_exc
    assert exc.value.cause is original


def test_repr_is_diagnostic() -> None:
    text = repr(AppError(ErrorCode.E_BUG_UNKNOWN_CODE, "?", {"k": 1}))
    assert "E_BUG_UNKNOWN_CODE" in text and "'k': 1" in text
