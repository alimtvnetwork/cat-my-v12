"""Tests for BE.errors.codes: coverage of status map + wire literal shape."""

from __future__ import annotations

import re
from http import HTTPStatus

from BE.errors.codes import ErrorCode, default_http_status, is_registered

WIRE_PATTERN = re.compile(r"^E_[A-Z]+_[A-Z_]+$")


def test_every_code_has_http_status() -> None:
    for code in ErrorCode:
        assert isinstance(default_http_status(code), HTTPStatus)


def test_wire_values_match_pattern() -> None:
    for code in ErrorCode:
        assert WIRE_PATTERN.match(code.value), code.value


def test_wire_value_equals_member_name() -> None:
    for code in ErrorCode:
        assert code.value == code.name


def test_is_registered_true_for_known() -> None:
    assert is_registered("E_BE_NOT_FOUND") is True


def test_is_registered_false_for_unknown() -> None:
    assert is_registered("E_MADE_UP") is False


def test_reserved_families_present() -> None:
    prefixes = {code.value.split("_")[1] for code in ErrorCode}
    assert {"BE", "CAM", "SDK", "SEC", "BUG"}.issubset(prefixes)


def test_be_not_found_is_404() -> None:
    assert default_http_status(ErrorCode.E_BE_NOT_FOUND) == HTTPStatus.NOT_FOUND


def test_sec_unapproved_egress_is_403() -> None:
    assert default_http_status(ErrorCode.E_SEC_UNAPPROVED_EGRESS) == HTTPStatus.FORBIDDEN
