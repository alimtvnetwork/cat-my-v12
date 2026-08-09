"""Plan 90 Step 104 - Installer plan tests.

Owning module: ``BE/app/installer_plan.py``.
Spec: ``spec/21-app/79-installer-retention-timing.md`` §"Orchestrator".
"""

from __future__ import annotations

import pytest

from BE.app.installer_plan import (
    InstallerAction,
    InstallerPhase,
    InstallerPlatform,
    plan_install_actions,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


# ---------------------------------------------------------------------------
# Ordering invariants (the whole point of the module)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "platform", [InstallerPlatform.WINDOWS, InstallerPlatform.POSIX]
)
def test_install_puts_db_bootstrap_first_pathlink_middle_retention_last(platform):
    plan = plan_install_actions(
        platform=platform,
        phase=InstallerPhase.INSTALL,
        binaries_dir="/tmp/fake-release",
    )
    assert [a.name for a in plan] == ["db-bootstrap", "path-link", "retention-timer"]


@pytest.mark.parametrize(
    "platform", [InstallerPlatform.WINDOWS, InstallerPlatform.POSIX]
)
def test_uninstall_puts_retention_first_pathlink_middle_db_bootstrap_last(platform):
    plan = plan_install_actions(platform=platform, phase=InstallerPhase.UNINSTALL)
    assert [a.name for a in plan] == ["retention-timer", "path-link", "db-bootstrap"]


# ---------------------------------------------------------------------------
# Criticality flags
# ---------------------------------------------------------------------------

def test_install_retention_is_critical():
    plan = plan_install_actions(
        platform=InstallerPlatform.POSIX, phase=InstallerPhase.INSTALL,
        binaries_dir="/tmp/x",
    )
    retention = next(a for a in plan if a.name == "retention-timer")
    assert retention.critical is True


def test_uninstall_retention_is_not_critical_for_idempotency():
    plan = plan_install_actions(
        platform=InstallerPlatform.POSIX, phase=InstallerPhase.UNINSTALL,
    )
    retention = next(a for a in plan if a.name == "retention-timer")
    assert retention.critical is False


# ---------------------------------------------------------------------------
# Platform-specific script + arg wiring
# ---------------------------------------------------------------------------

def test_windows_install_uses_ps_script_with_dash_install_flag():
    plan = plan_install_actions(
        platform=InstallerPlatform.WINDOWS,
        phase=InstallerPhase.INSTALL,
        interval_hours=12,
        retention_days=45,
        binaries_dir="C:/rel",
    )
    retention = next(a for a in plan if a.name == "retention-timer")
    assert retention.script == "scripts/ps/Register-RetentionTask.ps1"
    assert retention.args == (
        "-Install", "-IntervalHours", "12", "-RetentionDays", "45",
    )


def test_windows_uninstall_omits_knobs():
    plan = plan_install_actions(
        platform=InstallerPlatform.WINDOWS, phase=InstallerPhase.UNINSTALL,
    )
    retention = next(a for a in plan if a.name == "retention-timer")
    assert retention.args == ("-Uninstall",)


def test_posix_install_uses_bash_script_with_dashdash_install():
    plan = plan_install_actions(
        platform=InstallerPlatform.POSIX, phase=InstallerPhase.INSTALL,
        binaries_dir="/tmp/rel",
    )
    retention = next(a for a in plan if a.name == "retention-timer")
    assert retention.script == "scripts/systemd/install-retention-timer.sh"
    assert retention.args == ("--install",)


def test_posix_uninstall_uses_dashdash_uninstall():
    plan = plan_install_actions(
        platform=InstallerPlatform.POSIX, phase=InstallerPhase.UNINSTALL,
    )
    retention = next(a for a in plan if a.name == "retention-timer")
    assert retention.args == ("--uninstall",)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("bad", [0, -1, 169, 200])
def test_rejects_interval_out_of_range(bad):
    with pytest.raises(AppError) as ei:
        plan_install_actions(
            platform=InstallerPlatform.POSIX,
            phase=InstallerPhase.INSTALL,
            interval_hours=bad,
            binaries_dir="/tmp/x",
        )
    assert ei.value.code is ErrorCode.E_CLI_USAGE


@pytest.mark.parametrize("bad", [0, -5, 3651])
def test_rejects_retention_days_out_of_range(bad):
    with pytest.raises(AppError) as ei:
        plan_install_actions(
            platform=InstallerPlatform.POSIX,
            phase=InstallerPhase.INSTALL,
            retention_days=bad,
        )
    assert ei.value.code is ErrorCode.E_CLI_USAGE


def test_rejects_bool_interval_even_though_bool_is_int():
    with pytest.raises(AppError):
        plan_install_actions(
            platform=InstallerPlatform.POSIX,
            phase=InstallerPhase.INSTALL,
            interval_hours=True,  # type: ignore[arg-type]
        )


def test_rejects_non_enum_platform():
    with pytest.raises(AppError):
        plan_install_actions(
            platform="windows",  # type: ignore[arg-type]
            phase=InstallerPhase.INSTALL,
        )


def test_rejects_non_enum_phase():
    with pytest.raises(AppError):
        plan_install_actions(
            platform=InstallerPlatform.POSIX,
            phase="install",  # type: ignore[arg-type]
        )


# ---------------------------------------------------------------------------
# Return-type discipline
# ---------------------------------------------------------------------------

def test_returns_frozen_dataclasses():
    plan = plan_install_actions(
        platform=InstallerPlatform.POSIX, phase=InstallerPhase.INSTALL,
        binaries_dir="/tmp/x",
    )
    assert all(isinstance(a, InstallerAction) for a in plan)
    with pytest.raises(Exception):
        plan[0].name = "mutated"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Path-link action (Plan 90 Step 127)
# ---------------------------------------------------------------------------

def test_install_missing_binaries_dir_raises_usage():
    with pytest.raises(AppError) as ei:
        plan_install_actions(
            platform=InstallerPlatform.POSIX,
            phase=InstallerPhase.INSTALL,
            binaries_dir=None,
        )
    assert ei.value.code is ErrorCode.E_CLI_USAGE


@pytest.mark.parametrize(
    "platform,expected_flag",
    [(InstallerPlatform.WINDOWS, "windows"), (InstallerPlatform.POSIX, "posix")],
)
def test_install_path_link_args_include_binaries_dir_and_platform(platform, expected_flag):
    plan = plan_install_actions(
        platform=platform,
        phase=InstallerPhase.INSTALL,
        binaries_dir="/opt/rel",
    )
    link = next(a for a in plan if a.name == "path-link")
    assert link.script == "bin/install-path-link.py"
    assert link.args == (
        "install", "--binaries-dir", "/opt/rel", "--platform", expected_flag,
    )
    assert link.critical is True


@pytest.mark.parametrize(
    "platform,expected_flag",
    [(InstallerPlatform.WINDOWS, "windows"), (InstallerPlatform.POSIX, "posix")],
)
def test_uninstall_path_link_omits_binaries_dir_and_is_not_critical(platform, expected_flag):
    plan = plan_install_actions(platform=platform, phase=InstallerPhase.UNINSTALL)
    link = next(a for a in plan if a.name == "path-link")
    assert link.script == "bin/install-path-link.py"
    assert link.args == ("uninstall", "--platform", expected_flag)
    assert link.critical is False
