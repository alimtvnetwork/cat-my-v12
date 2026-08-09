"""Plan 90 Step 115 - Wrapper inventory + doctor enforcement tests.

Root cause guarded: pre-Step-115 doctor never checked wrapper presence,
so a Windows install with a missing ``.ps1`` sailed past preflight and
died deep inside the action loop. These tests pin the inventory
contract and the WrapperMissing severity so a wrapper deletion cannot
regress silently.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from BE.app.installer_doctor import DoctorSeverity, run_doctor
from BE.app.installer_plan import (
    InstallerPhase,
    InstallerPlatform,
    plan_install_actions,
)
from BE.app.installer_wrappers import (
    WRAPPERS,
    WrapperEntry,
    wrapper_presence,
    wrappers_for_platform,
)

REPO_ROOT = Path(__file__).resolve().parents[3]


def _plan(platform: InstallerPlatform) -> list:
    return plan_install_actions(
        platform=platform, phase=InstallerPhase.INSTALL,
        binaries_dir="/tmp/fake-release",
    )


# --- inventory shape --------------------------------------------------


def test_wrappers_are_frozen_tuple() -> None:
    assert isinstance(WRAPPERS, tuple)
    assert len(WRAPPERS) >= 3
    names = {w.Name for w in WRAPPERS}
    assert {"Invoke-DbBootstrap", "Invoke-RetentionRun", "Register-RetentionTask"} <= names


def test_wrapper_entries_are_frozen_dataclasses() -> None:
    w = WRAPPERS[0]
    with pytest.raises(Exception):
        w.Name = "mutated"  # type: ignore[misc]


def test_wrappers_for_platform_filters() -> None:
    assert all(w.Platform == "windows" for w in wrappers_for_platform("windows"))
    assert wrappers_for_platform("posix") == ()


# --- presence check against the real checkout ------------------------


def test_all_shipped_wrappers_exist_in_repo() -> None:
    for w in WRAPPERS:
        assert (REPO_ROOT / w.Path).is_file(), f"missing {w.Path!r}"


def test_wrapper_presence_reports_all_true_in_repo() -> None:
    rows = wrapper_presence(REPO_ROOT)
    assert len(rows) == len(WRAPPERS)
    assert all(r["Present"] is True for r in rows)


def test_wrapper_presence_reports_false_for_empty_root(tmp_path: Path) -> None:
    rows = wrapper_presence(tmp_path)
    assert all(r["Present"] is False for r in rows)


# --- doctor integration ----------------------------------------------


def test_doctor_flags_wrapper_missing_on_windows(tmp_path: Path) -> None:
    # tmp_path has no scripts/ps/*.ps1 -> every Windows wrapper missing.
    report = run_doctor(
        tmp_path,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
        repo_root=tmp_path,
    )
    codes = [f.Code for f in report.Findings]
    assert codes.count("WrapperMissing") == len(wrappers_for_platform("windows"))
    assert all(
        f.Severity is DoctorSeverity.ERROR
        for f in report.Findings if f.Code == "WrapperMissing"
    )
    assert report.has_errors is True


def test_doctor_wrappers_clean_when_repo_root_is_real(tmp_path: Path) -> None:
    report = run_doctor(
        tmp_path,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
        repo_root=REPO_ROOT,
    )
    assert not any(f.Code == "WrapperMissing" for f in report.Findings)
    assert len(report.Wrappers) == len(WRAPPERS)


def test_doctor_posix_never_flags_windows_wrappers(tmp_path: Path) -> None:
    # Even with an empty repo root, posix platform skips .ps1 checks.
    report = run_doctor(
        tmp_path,
        platform=InstallerPlatform.POSIX,
        planned_actions=_plan(InstallerPlatform.POSIX),
        repo_root=tmp_path,
    )
    assert not any(f.Code == "WrapperMissing" for f in report.Findings)


def test_doctor_report_to_dict_includes_wrappers(tmp_path: Path) -> None:
    report = run_doctor(
        tmp_path,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
        repo_root=REPO_ROOT,
    )
    payload = report.to_dict()
    assert "Wrappers" in payload
    assert isinstance(payload["Wrappers"], list)
    assert all("Present" in row for row in payload["Wrappers"])


def test_doctor_backward_compatible_without_repo_root(tmp_path: Path) -> None:
    # Legacy callers that omit repo_root get no wrapper findings and no inventory.
    report = run_doctor(
        tmp_path,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
    )
    assert report.Wrappers == []
    assert not any(f.Code == "WrapperMissing" for f in report.Findings)
