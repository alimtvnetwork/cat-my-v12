"""Tests for `BE.app.facades` (rule + sample slices).

Covers the Protocol/in-memory/vendor triad and route integration: default
route response uses the empty in-memory facade; a seeded facade returns real
data; vendor facade raises `E_SDK_INIT_FAILED`.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from BE.app.domain import CatRule, CatSample
from BE.app.facades import (
    InMemoryRuleFacade,
    InMemorySampleFacade,
    RuleFacade,
    SampleFacade,
    VendorRuleFacade,
    VendorSampleFacade,
    get_rule_facade,
    get_sample_facade,
    set_rule_facade,
    set_sample_facade,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.main import create_app

client = TestClient(create_app())


# ---------- Protocol / adapter unit tests ----------------------------------


def test_inmemory_and_vendor_satisfy_protocols() -> None:
    assert isinstance(InMemoryRuleFacade(), RuleFacade)
    assert isinstance(VendorRuleFacade(), RuleFacade)
    assert isinstance(InMemorySampleFacade(), SampleFacade)
    assert isinstance(VendorSampleFacade(), SampleFacade)


def test_inmemory_rule_seed_and_get() -> None:
    facade = InMemoryRuleFacade([CatRule(id=2, name="b", version=1), CatRule(id=1, name="a", version=1)])
    assert [r.id for r in facade.list_rules()] == [1, 2]  # sorted by id
    assert facade.get_rule(1).name == "a"


def test_inmemory_rule_missing_raises_not_found() -> None:
    with pytest.raises(AppError) as ei:
        InMemoryRuleFacade().get_rule(99)
    assert ei.value.code == ErrorCode.E_BE_NOT_FOUND


def test_inmemory_sample_seed_and_get() -> None:
    facade = InMemorySampleFacade(
        [CatSample(id=1, rule_id=1, label="ok", captured_at="2026-07-21T00:00:00Z")]
    )
    assert facade.get_sample(1).label == "ok"


def test_inmemory_sample_missing_raises_not_found() -> None:
    with pytest.raises(AppError) as ei:
        InMemorySampleFacade().get_sample(42)
    assert ei.value.code == ErrorCode.E_BE_NOT_FOUND


@pytest.mark.parametrize(
    "call",
    [
        lambda: VendorRuleFacade().list_rules(),
        lambda: VendorRuleFacade().get_rule(1),
        lambda: VendorSampleFacade().list_samples(),
        lambda: VendorSampleFacade().get_sample(1),
    ],
)
def test_vendor_stub_raises_sdk_init_failed(call) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(AppError) as ei:
        call()
    assert ei.value.code == ErrorCode.E_SDK_INIT_FAILED


# ---------- Route integration ----------------------------------------------


@pytest.fixture()
def restore_facades():  # type: ignore[no-untyped-def]
    original_rule = get_rule_facade()
    original_sample = get_sample_facade()
    yield
    set_rule_facade(original_rule)
    set_sample_facade(original_sample)


def test_get_rules_default_empty_envelope(restore_facades) -> None:  # type: ignore[no-untyped-def]
    set_rule_facade(InMemoryRuleFacade())
    resp = client.get("/rules")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Status"]["IsSuccess"] is True
    payload = body["Results"][0]
    assert payload == {"items": [], "total": 0, "provider": "InMemoryRuleFacade"}


def test_get_rules_seeded_returns_items(restore_facades) -> None:  # type: ignore[no-untyped-def]
    set_rule_facade(InMemoryRuleFacade([CatRule(id=1, name="alpha", version=1)]))
    resp = client.get("/rules")
    payload = resp.json()["Results"][0]
    assert payload["total"] == 1
    assert payload["items"][0] == {"id": 1, "name": "alpha", "version": 1, "enabled": True}


def test_get_rule_by_id_returns_single(restore_facades) -> None:  # type: ignore[no-untyped-def]
    set_rule_facade(InMemoryRuleFacade([CatRule(id=7, name="seven", version=2, enabled=False)]))
    resp = client.get("/rules/7")
    assert resp.status_code == 200
    body = resp.json()
    assert body["Attributes"]["IsSingle"] is True
    assert body["Results"][0] == {"id": 7, "name": "seven", "version": 2, "enabled": False}


def test_get_rule_missing_returns_404_envelope(restore_facades) -> None:  # type: ignore[no-untyped-def]
    set_rule_facade(InMemoryRuleFacade())
    resp = client.get("/rules/1")
    assert resp.status_code == 404
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"


def test_get_samples_default_empty(restore_facades) -> None:  # type: ignore[no-untyped-def]
    set_sample_facade(InMemorySampleFacade())
    body = client.get("/samples").json()
    assert body["Results"][0] == {"items": [], "total": 0, "provider": "InMemorySampleFacade"}


def test_get_sample_by_id_returns_single(restore_facades) -> None:  # type: ignore[no-untyped-def]
    set_sample_facade(
        InMemorySampleFacade(
            [CatSample(id=3, rule_id=1, label="pass", captured_at="2026-07-21T12:00:00Z")]
        )
    )
    body = client.get("/samples/3").json()
    assert body["Results"][0]["label"] == "pass"


def test_vendor_facade_bubbles_503(restore_facades) -> None:  # type: ignore[no-untyped-def]
    set_rule_facade(VendorRuleFacade())
    resp = client.get("/rules")
    assert resp.status_code == 503
    assert resp.json()["Errors"]["Code"] == "E_SDK_INIT_FAILED"
