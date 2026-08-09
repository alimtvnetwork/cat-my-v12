"""Tests for `BE.cli.common.exit_codes.ExitCode`.

Locks the contract from `spec/21-app/74-worker-cli.md` §Acceptance #6
so a silent renumber or accidental value drift fails CI before it can
break PowerShell wrappers (memory §12) or downstream dispatchers.
"""

from __future__ import annotations

import sys

import pytest

from BE.cli.common.exit_codes import ExitCode


def test_canonical_values_match_spec_74_acceptance_6() -> None:
    # spec/21-app/74-worker-cli.md §Acceptance #6 pins these five.
    assert ExitCode.Ok == 0
    assert ExitCode.Usage == 2
    assert ExitCode.DomainError == 3
    assert ExitCode.IoError == 4
    assert ExitCode.VendorError == 5


def test_values_are_unique() -> None:
    values = [e.value for e in ExitCode]
    assert len(values) == len(set(values)), values


def test_no_success_alias_reserved_1() -> None:
    # Generic CLI spec uses 1 for "failure"; app spec deliberately
    # omits it so wrappers can distinguish domain vs IO vs vendor.
    assert 1 not in {e.value for e in ExitCode}


def test_no_overlap_with_powershell_wrapper_range() -> None:
    # spec/11-powershell-integration/04-error-codes.md reserves
    # 9500-9599 for the wrapper layer.
    for e in ExitCode:
        assert not (9500 <= int(e) <= 9599), e


def test_is_intenum_so_sys_exit_accepts_it() -> None:
    # `sys.exit(ExitCode.Ok)` must behave identically to `sys.exit(0)`.
    with pytest.raises(SystemExit) as excinfo:
        sys.exit(ExitCode.DomainError)
    assert excinfo.value.code == 3


def test_membership_by_int_and_name() -> None:
    assert ExitCode(4) is ExitCode.IoError
    assert ExitCode["VendorError"] is ExitCode.VendorError


def test_all_export_is_frozen() -> None:
    from BE.cli.common import exit_codes as mod

    assert mod.__all__ == ["ExitCode"]
