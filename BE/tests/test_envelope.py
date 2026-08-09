"""Tests for BE.envelope: Universal Response Envelope shape (spec/03-error-manage)."""

from __future__ import annotations

from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, failure, success

_URL = "http://test/api/thing"


def test_success_single_item_wraps_into_array() -> None:
    wire = success({"port": 8787}, requested_at=_URL).to_wire()
    assert wire["Status"]["IsSuccess"] is True
    assert wire["Status"]["IsFailed"] is False
    assert wire["Status"]["Code"] == 200
    assert wire["Attributes"]["RequestedAt"] == _URL
    assert wire["Attributes"]["HasAnyErrors"] is False
    assert wire["Attributes"]["IsSingle"] is True
    assert wire["Attributes"]["IsMultiple"] is False
    assert wire["Attributes"]["IsEmpty"] is False
    assert wire["Results"] == [{"port": 8787}]
    # conditional sections omitted, not null
    assert "Errors" not in wire
    assert "Navigation" not in wire
    assert "MethodsStack" not in wire


def test_success_empty_list_sets_is_empty() -> None:
    wire = success([], requested_at=_URL).to_wire()
    assert wire["Results"] == []
    assert wire["Attributes"]["IsEmpty"] is True
    assert wire["Attributes"]["IsSingle"] is False
    assert wire["Attributes"]["IsMultiple"] is False


def test_success_multi_item_sets_is_multiple() -> None:
    wire = success([1, 2, 3], requested_at=_URL).to_wire()
    assert wire["Attributes"]["IsMultiple"] is True
    assert wire["Attributes"]["TotalRecords"] == 3


def test_failure_shape_carries_registered_code() -> None:
    wire = failure(
        code="E_BE_NOT_FOUND",
        message="rule missing",
        requested_at=_URL,
        http_status=404,
    ).to_wire()
    assert wire["Status"]["IsSuccess"] is False
    assert wire["Status"]["IsFailed"] is True
    assert wire["Status"]["Code"] == 404
    assert wire["Results"] == []
    assert wire["Attributes"]["HasAnyErrors"] is True
    assert wire["Attributes"]["IsEmpty"] is True
    assert wire["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert wire["Errors"]["BackendMessage"] == "rule missing"
    assert wire["Errors"]["Backend"] == []
    assert wire["Errors"]["Frontend"] == []
    assert wire["Errors"]["DelegatedServiceErrorStack"] == []


def test_failure_carries_backend_frames() -> None:
    frames = ["app.py:10 handler", "svc.py:3 fetch"]
    wire = failure(
        code="E_BE_INTERNAL",
        message="boom",
        requested_at=_URL,
        http_status=500,
        backend_frames=frames,
    ).to_wire()
    assert wire["Errors"]["Backend"] == frames


def test_timestamp_is_iso_z() -> None:
    wire = success(None, requested_at=_URL).to_wire()
    ts = wire["Status"]["Timestamp"]
    assert ts.endswith("Z")
    assert "T" in ts and len(ts) == 20  # YYYY-MM-DDTHH:MM:SSZ


def test_ensure_correlation_id_passes_through_when_present() -> None:
    assert ensure_correlation_id("abc-123") == "abc-123"


def test_ensure_correlation_id_mints_uuid_when_absent() -> None:
    minted = ensure_correlation_id(None)
    assert isinstance(minted, str) and len(minted) == 36


def test_correlation_header_constant() -> None:
    assert CORRELATION_HEADER == "X-Correlation-Id"
