"""ULID validator contract (spec/21-app/20)."""
from __future__ import annotations

import pytest

from app.core.ids import UlidFormatError, assert_ulid, is_ulid


VALID = "01H8YXKQZ9M6NBP7TV3RSJC4KE"  # 26 chars, Crockford Base32


def test_valid_ulid_accepted() -> None:
    assert is_ulid(VALID)
    assert assert_ulid(VALID) == VALID


@pytest.mark.parametrize(
    "bad",
    [
        "",                                    # empty
        "01H8YXKQZ9M6NBP7TV3RSJC4K",           # 25 chars
        "01H8YXKQZ9M6NBP7TV3RSJC4KEZ",         # 27 chars
        "01H8YXKQZ9M6NBP7TV3RSJC4KI",          # 'I' excluded
        "01H8YXKQZ9M6NBP7TV3RSJC4KL",          # 'L' excluded
        "01H8YXKQZ9M6NBP7TV3RSJC4KO",          # 'O' excluded
        "01h8yxkqz9m6nbp7tv3rsjc4ke",          # lower-case
        None,
        12345,
    ],
)
def test_invalid_ulid_rejected(bad: object) -> None:
    assert not is_ulid(bad)
    with pytest.raises(UlidFormatError):
        assert_ulid(bad, field="jobId")
