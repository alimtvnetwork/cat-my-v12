"""Plan 88 Step 22: InMemoryStorageFacade contract tests.

Covers Protocol conformance, round-trip parity, key + value validation,
missing-key semantics, size ceiling, and clear() isolation.
"""

from __future__ import annotations

import pytest

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.sdk_facade import StorageFacade
from BE.sdk_facade.storage import InMemoryStorageFacade


def test_satisfies_protocol() -> None:
    assert isinstance(InMemoryStorageFacade(), StorageFacade)


def test_put_get_round_trip() -> None:
    s = InMemoryStorageFacade()
    s.put("samples/pcb.png", b"\x89PNG\r\n\x1a\n...")
    assert s.get("samples/pcb.png") == b"\x89PNG\r\n\x1a\n..."


def test_overwrite_replaces_value() -> None:
    s = InMemoryStorageFacade()
    s.put("k", b"first")
    s.put("k", b"second")
    assert s.get("k") == b"second"


def test_get_missing_raises_not_found() -> None:
    s = InMemoryStorageFacade()
    with pytest.raises(AppError) as ei:
        s.get("nope")
    assert ei.value.code is ErrorCode.E_BE_NOT_FOUND
    assert ei.value.details == {"key": "nope"}


@pytest.mark.parametrize(
    "bad_key",
    ["", "/leading", "trailing/", "a//b", "a/./b", "a/../b", "with\x00nul", "\t\n"],
)
def test_invalid_keys_rejected(bad_key: str) -> None:
    s = InMemoryStorageFacade()
    with pytest.raises(AppError) as ei:
        s.put(bad_key, b"x")
    assert ei.value.code is ErrorCode.E_BE_BAD_REQUEST


def test_key_length_ceiling() -> None:
    s = InMemoryStorageFacade()
    with pytest.raises(AppError) as ei:
        s.put("a" * 513, b"x")
    assert ei.value.code is ErrorCode.E_BE_BAD_REQUEST


def test_non_str_key_rejected() -> None:
    s = InMemoryStorageFacade()
    with pytest.raises(AppError) as ei:
        s.put(123, b"x")  # type: ignore[arg-type]
    assert ei.value.code is ErrorCode.E_BE_BAD_REQUEST


@pytest.mark.parametrize("bad_val", ["str-not-bytes", bytearray(b"x"), None, 42])
def test_non_bytes_value_rejected(bad_val: object) -> None:
    s = InMemoryStorageFacade()
    with pytest.raises(AppError) as ei:
        s.put("k", bad_val)  # type: ignore[arg-type]
    assert ei.value.code is ErrorCode.E_BE_BAD_REQUEST


def test_value_size_ceiling() -> None:
    s = InMemoryStorageFacade()
    with pytest.raises(AppError) as ei:
        s.put("big", b"\x00" * (32 * 1024 * 1024 + 1))
    assert ei.value.code is ErrorCode.E_BE_BAD_REQUEST
    assert ei.value.details["max"] == 32 * 1024 * 1024


def test_clear_isolates_state() -> None:
    s = InMemoryStorageFacade()
    s.put("k", b"v")
    s.clear()
    with pytest.raises(AppError) as ei:
        s.get("k")
    assert ei.value.code is ErrorCode.E_BE_NOT_FOUND
