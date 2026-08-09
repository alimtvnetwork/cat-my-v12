"""Contract tests for `SampleFacade` write ops (Plan 90 Step 144).

These exercise the Protocol shape directly (no HTTP), so a regression that
removes `upsert_sample`/`delete_sample` from either provider fails at
collection time via the module-load `isinstance` guard in `sample_facade.py`.
"""

from __future__ import annotations

import pytest

from BE.app.domain.cat_sample import CatSample
from BE.app.facades.sample_facade import (
    InMemorySampleFacade,
    SampleFacade,
    VendorSampleFacade,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _sample(sid: int = 1, rid: int = 10, label: str = "cat") -> CatSample:
    return CatSample(id=sid, rule_id=rid, label=label, captured_at="2026-07-21T00:00:00Z")


def test_protocol_shape_lists_all_write_ops() -> None:
    # Structural typing guard: both providers must satisfy the Protocol
    # including the new write methods, or module-load asserts would have
    # already blown up. Restate here so a future Protocol edit that drops
    # a method is caught even if someone silences the assert.
    for provider in (InMemorySampleFacade(), VendorSampleFacade()):
        assert isinstance(provider, SampleFacade)
        for op in ("list_samples", "get_sample", "upsert_sample", "delete_sample"):
            assert callable(getattr(provider, op)), f"{provider!r} missing {op}"


def test_upsert_inserts_then_updates() -> None:
    facade = InMemorySampleFacade()
    facade.upsert_sample(_sample(1, 10, "cat-a"))
    assert facade.get_sample(1).label == "cat-a"
    facade.upsert_sample(_sample(1, 10, "cat-b"))
    assert facade.get_sample(1).label == "cat-b"
    # No duplicate row created by the update path.
    assert [s.id for s in facade.list_samples()] == [1]


def test_upsert_rejects_bad_ids_and_empty_label() -> None:
    facade = InMemorySampleFacade()
    with pytest.raises(AppError) as e1:
        facade.upsert_sample(_sample(0, 10, "cat"))
    assert e1.value.code == ErrorCode.E_BE_BAD_REQUEST
    with pytest.raises(AppError) as e2:
        facade.upsert_sample(_sample(1, 0, "cat"))
    assert e2.value.code == ErrorCode.E_BE_BAD_REQUEST
    with pytest.raises(AppError) as e3:
        facade.upsert_sample(_sample(1, 10, "   "))
    assert e3.value.code == ErrorCode.E_BE_BAD_REQUEST
    # Store still empty: bad payloads never mutated state.
    assert facade.list_samples() == []


def test_delete_removes_existing_and_404s_missing() -> None:
    facade = InMemorySampleFacade(seed=[_sample(1), _sample(2)])
    facade.delete_sample(1)
    assert [s.id for s in facade.list_samples()] == [2]
    with pytest.raises(AppError) as e:
        facade.delete_sample(999)
    assert e.value.code == ErrorCode.E_BE_NOT_FOUND


def test_vendor_provider_raises_init_failed_for_writes() -> None:
    v = VendorSampleFacade()
    with pytest.raises(AppError) as e1:
        v.upsert_sample(_sample())
    assert e1.value.code == ErrorCode.E_SDK_INIT_FAILED
    with pytest.raises(AppError) as e2:
        v.delete_sample(1)
    assert e2.value.code == ErrorCode.E_SDK_INIT_FAILED
