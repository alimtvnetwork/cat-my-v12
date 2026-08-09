"""Plan 90 Step 129 - installer wrapper -> install-upgrade-plan wiring.

Root cause guarded (one sentence): Step 128 shipped `bin/install-upgrade-plan.py`
plus `BE/app/installer_upgrade.py`, but neither `packaging/installers/install.sh`
nor `packaging/installers/install.ps1` dispatched it between the doctor and the
plan renderer, so a repeat `--install` still had no typed decision and could
silently overwrite a newer install with an older one.

These are contract-level source tests: they lock the exact substrings that
tie the wrapper exit codes to the CLI's 40/41/42 contract. The CLI itself
is exercised end-to-end by `test_installer_upgrade.py` (Step 128).
"""

from __future__ import annotations

from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SH_PATH = REPO_ROOT / "packaging" / "installers" / "install.sh"
PS1_PATH = REPO_ROOT / "packaging" / "installers" / "install.ps1"


@pytest.fixture(scope="module")
def sh_text() -> str:
    return SH_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def ps1_text() -> str:
    return PS1_PATH.read_text(encoding="utf-8")


# --- install.sh --------------------------------------------------------


def test_sh_declares_new_flags(sh_text: str) -> None:
    assert "--force-reinstall" in sh_text
    assert "--allow-downgrade" in sh_text
    assert "force_reinstall=0" in sh_text
    assert "allow_downgrade=0" in sh_text


def test_sh_invokes_upgrade_cli_with_install_root_and_backup(sh_text: str) -> None:
    # The CLI call is composed via an array; assert the pieces are all present.
    assert "bin/install-upgrade-plan.py" in sh_text
    assert '--install-root "$INSTALL_ROOT"' in sh_text
    assert '--new-version "$APP_VERSION_STR"' in sh_text
    assert "--backup" in sh_text


def test_sh_maps_cli_exit_codes(sh_text: str) -> None:
    # 40 -> wrapper 7, 41 -> 8, 42 -> 9.
    assert "40)" in sh_text and "exit 7" in sh_text
    assert "41)" in sh_text and "exit 8" in sh_text
    assert "42)" in sh_text and "exit 9" in sh_text


def test_sh_upgrade_block_is_phase_guarded(sh_text: str) -> None:
    # Uninstall must never touch the upgrade planner: no version compare.
    assert 'if [ "$phase" = "install" ]; then' in sh_text
    # Guard must sit AFTER the doctor block and BEFORE the plan renderer.
    doctor_marker = 'cat /tmp/install-doctor.out'
    plan_marker = 'plan_json=$('
    upgrade_marker = "bin/install-upgrade-plan.py"
    assert (
        sh_text.index(doctor_marker)
        < sh_text.index(upgrade_marker)
        < sh_text.index(plan_marker)
    )


def test_sh_documents_new_exit_codes(sh_text: str) -> None:
    for line in ("#   7  upgrade planner", "#   8  upgrade planner", "#   9  upgrade planner"):
        assert line in sh_text


# --- install.ps1 -------------------------------------------------------


def test_ps1_declares_new_switches(ps1_text: str) -> None:
    assert "[switch]$ForceReinstall" in ps1_text
    assert "[switch]$AllowDowngrade" in ps1_text


def test_ps1_reserves_new_wrapper_exit_codes(ps1_text: str) -> None:
    assert "$EXIT_DOWNGRADE_BLOCKED   = 9534" in ps1_text
    assert "$EXIT_UPGRADE_INVALID     = 9535" in ps1_text
    assert "$EXIT_BACKUP_UNWRITABLE   = 9536" in ps1_text


def test_ps1_invokes_upgrade_cli_with_install_root_and_backup(ps1_text: str) -> None:
    assert "bin/install-upgrade-plan.py" in ps1_text
    assert "'--install-root', $InstallRoot" in ps1_text
    assert "'--new-version', $AppVersion" in ps1_text
    assert "'--backup'" in ps1_text


def test_ps1_maps_cli_exit_codes(ps1_text: str) -> None:
    assert "40 { " in ps1_text and "$EXIT_DOWNGRADE_BLOCKED" in ps1_text
    assert "41 { " in ps1_text and "$EXIT_UPGRADE_INVALID" in ps1_text
    assert "42 { " in ps1_text and "$EXIT_BACKUP_UNWRITABLE" in ps1_text


def test_ps1_upgrade_block_is_phase_guarded(ps1_text: str) -> None:
    assert "if ($phase -eq 'install') {" in ps1_text
    doctor_marker = "$doctorExit = $LASTEXITCODE"
    plan_marker = "$planJson = & $VenvPython -c $planScript"
    upgrade_marker = "(Join-Path $RepoRoot 'bin/install-upgrade-plan.py')"
    assert (
        ps1_text.index(doctor_marker)
        < ps1_text.index(upgrade_marker)
        < ps1_text.index(plan_marker)
    )


def test_ps1_forwards_flags_only_when_set(ps1_text: str) -> None:
    assert "if ($ForceReinstall) { $upgradeArgs += '--force-reinstall' }" in ps1_text
    assert "if ($AllowDowngrade) { $upgradeArgs += '--allow-downgrade' }" in ps1_text
