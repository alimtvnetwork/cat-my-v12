"""Plan 90 Step 11 - pin the CLI/IPC/log error codes added in Step 10.

Anchors:
- `BE/errors/codes.py` (Step 10 registry).
- `spec/21-app/74-worker-cli.md`, `75-processing-cli.md`,
  `76-cli-log-and-ipc.md`, `77-cli-powershell-and-release.md`.
- `spec/03-error-manage/` - every wire code must resolve to a stable HTTP status.

If any assertion here fails, downstream CLI/IPC steps and the FE `types.ts`
mirror are silently drifting from the contract. Do not weaken these tests to
make an unrelated change pass; update the registry and the specs together.
"""

from __future__ import annotations

from http import HTTPStatus

import pytest

from BE.errors.codes import ErrorCode, default_http_status, is_registered

# (wire_value, expected_http_status) - locked contract from Step 10.
NEW_CODE_MAPPINGS: list[tuple[str, HTTPStatus]] = [
    ("E_CLI_PREFLIGHT_FAILED", HTTPStatus.FAILED_DEPENDENCY),
    ("E_CLI_UNSUPPORTED_HOST", HTTPStatus.FAILED_DEPENDENCY),
    ("E_CLI_CHECKSUM_MISMATCH", HTTPStatus.FAILED_DEPENDENCY),
    ("E_CLI_USAGE", HTTPStatus.BAD_REQUEST),
    ("E_IPC_UNKNOWN_KIND", HTTPStatus.INTERNAL_SERVER_ERROR),
    ("E_IPC_WRITE_FAILED", HTTPStatus.BAD_GATEWAY),
    ("E_IPC_PAYLOAD_INVALID", HTTPStatus.BAD_GATEWAY),
    ("E_LOG_ROOT_UNWRITABLE", HTTPStatus.SERVICE_UNAVAILABLE),
    ("E_LOG_INDEX_LOCKED", HTTPStatus.CONFLICT),
    ("E_RULE_BUNDLE_INVALID", HTTPStatus.UNPROCESSABLE_ENTITY),
]


@pytest.mark.parametrize("wire,_status", NEW_CODE_MAPPINGS)
def test_new_code_is_registered(wire: str, _status: HTTPStatus) -> None:
    assert is_registered(wire), f"{wire} missing from ErrorCode enum"


@pytest.mark.parametrize("wire,_status", NEW_CODE_MAPPINGS)
def test_new_code_is_enum_member(wire: str, _status: HTTPStatus) -> None:
    member = ErrorCode(wire)
    assert member.value == wire


@pytest.mark.parametrize("wire,expected", NEW_CODE_MAPPINGS)
def test_new_code_has_stable_http_status(wire: str, expected: HTTPStatus) -> None:
    got = default_http_status(ErrorCode(wire))
    assert got is expected, f"{wire} maps to {got.value}, expected {expected.value}"
    assert isinstance(got.value, int)


def test_every_registered_code_has_status_mapping() -> None:
    """Guard: no ErrorCode member may be missing from `_STATUS`.

    Enforces the invariant declared in `BE/errors/codes.py` module docstring.
    """
    for code in ErrorCode:
        status = default_http_status(code)
        assert isinstance(status, HTTPStatus)
        assert 100 <= status.value <= 599


def test_new_codes_are_disjoint_from_legacy_families() -> None:
    new_prefixes = ("E_CLI_", "E_IPC_", "E_LOG_", "E_RULE_")
    for wire, _ in NEW_CODE_MAPPINGS:
        assert wire.startswith(new_prefixes)
        # None of the new codes collide with the existing BE/CAM/SDK/SEC/BUG families.
        assert not wire.startswith(("E_BE_", "E_CAM_", "E_SDK_", "E_SEC_", "E_BUG_"))
