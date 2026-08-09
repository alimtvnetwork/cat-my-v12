"""Plan 90 Step 128 - upgrade planner + backup + CLI tests."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

from BE.app.install_manifest import (
    InstallManifest,
    MANIFEST_FILENAME,
    MANIFEST_SCHEMA_VERSION,
    write_manifest,
)
from BE.app.installer_upgrade import (
    UpgradeAction,
    UpgradePolicy,
    backup_manifest,
    parse_version,
    plan_upgrade,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _manifest(version: str) -> InstallManifest:
    ts = "2026-07-21T00:00:00+00:00"
    return InstallManifest(
        SchemaVersion=MANIFEST_SCHEMA_VERSION,
        AppVersion=version,
        Platform="posix",
        InstalledAt=ts,
        LastUpdatedAt=ts,
        Actions=[],
    )


# --- parse_version ----------------------------------------------------


@pytest.mark.parametrize("raw,expected", [
    ("4.67.0", (4, 67, 0)),
    ("v4.67.0", (4, 67, 0)),
    ("4.67", (4, 67, 0)),
    ("4", (4, 0, 0)),
    ("4.67.0-rc.1", (4, 67, 0)),
    ("4.67.0+build.5", (4, 67, 0)),
])
def test_parse_version_accepts_valid_shapes(raw, expected):
    assert parse_version(raw) == expected


@pytest.mark.parametrize("raw", ["", "   ", "abc", "1.2.3.4", "1..2"])
def test_parse_version_rejects_invalid(raw):
    with pytest.raises(AppError) as ei:
        parse_version(raw)
    assert ei.value.code is ErrorCode.E_INSTALL_UPGRADE_INVALID


# --- plan_upgrade -----------------------------------------------------


def test_plan_upgrade_fresh_when_no_manifest():
    d = plan_upgrade(existing=None, new_version="4.67.0")
    assert d.Action is UpgradeAction.FRESH_INSTALL
    assert d.PriorVersion is None
    assert d.NewVersion == "4.67.0"


def test_plan_upgrade_upgrade_when_new_gt_prior():
    d = plan_upgrade(existing=_manifest("4.66.0"), new_version="4.67.0")
    assert d.Action is UpgradeAction.UPGRADE
    assert d.PriorVersion == "4.66.0"


def test_plan_upgrade_reinstall_same_when_equal():
    d = plan_upgrade(existing=_manifest("4.67.0"), new_version="4.67.0")
    assert d.Action is UpgradeAction.REINSTALL_SAME
    assert "no-op" in d.Reason


def test_plan_upgrade_reinstall_same_force_reason_changes():
    d = plan_upgrade(
        existing=_manifest("4.67.0"),
        new_version="4.67.0",
        policy=UpgradePolicy(is_force_reinstall=True),
    )
    assert d.Action is UpgradeAction.REINSTALL_SAME
    assert "--force-reinstall requested" in d.Reason


def test_plan_upgrade_downgrade_blocked_by_default():
    with pytest.raises(AppError) as ei:
        plan_upgrade(existing=_manifest("4.67.0"), new_version="4.66.0")
    assert ei.value.code is ErrorCode.E_INSTALL_DOWNGRADE_BLOCKED


def test_plan_upgrade_downgrade_allowed_when_flag_set():
    d = plan_upgrade(
        existing=_manifest("4.67.0"),
        new_version="4.66.0",
        policy=UpgradePolicy(is_downgrade_allowed=True),
    )
    assert d.Action is UpgradeAction.DOWNGRADE_ALLOWED
    assert d.PriorVersion == "4.67.0"


def test_plan_upgrade_invalid_new_version_raises():
    with pytest.raises(AppError) as ei:
        plan_upgrade(existing=None, new_version="not-a-version")
    assert ei.value.code is ErrorCode.E_INSTALL_UPGRADE_INVALID


# --- backup_manifest --------------------------------------------------


def test_backup_manifest_returns_none_when_missing(tmp_path: Path):
    assert backup_manifest(tmp_path) is None


def test_backup_manifest_writes_stamped_copy(tmp_path: Path):
    write_manifest(tmp_path, _manifest("4.67.0"))
    now = datetime(2026, 7, 21, 12, 34, 56, tzinfo=timezone.utc)
    dst = backup_manifest(tmp_path, now=now)
    assert dst is not None
    assert dst.name == f"{MANIFEST_FILENAME}.bak.20260721T123456Z"
    assert dst.exists()
    # Content preserved.
    assert json.loads(dst.read_text())["AppVersion"] == "4.67.0"


def test_backup_manifest_rejects_naive_timestamp(tmp_path: Path):
    write_manifest(tmp_path, _manifest("4.67.0"))
    with pytest.raises(AppError) as ei:
        backup_manifest(tmp_path, now=datetime(2026, 7, 21, 12, 0, 0))
    assert ei.value.code is ErrorCode.E_INSTALL_MANIFEST_INVALID


# --- CLI --------------------------------------------------------------


REPO_ROOT = Path(__file__).resolve().parents[3]
CLI = [sys.executable, str(REPO_ROOT / "bin/install-upgrade-plan.py")]


def _run(args: list[str]) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT)
    return subprocess.run(CLI + args, capture_output=True, text=True, env=env, cwd=str(REPO_ROOT))


def test_cli_fresh_install_exit_0(tmp_path: Path):
    r = _run(["--install-root", str(tmp_path), "--new-version", "4.67.0"])
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout)
    assert payload["Action"] == "fresh-install"
    assert payload["PriorVersion"] is None
    assert payload["BackupPath"] is None


def test_cli_upgrade_with_backup(tmp_path: Path):
    write_manifest(tmp_path, _manifest("4.66.0"))
    r = _run([
        "--install-root", str(tmp_path),
        "--new-version", "4.67.0",
        "--backup",
    ])
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout)
    assert payload["Action"] == "upgrade"
    assert payload["PriorVersion"] == "4.66.0"
    assert payload["BackupPath"] is not None
    assert Path(payload["BackupPath"]).exists()


def test_cli_downgrade_blocked_exit_40(tmp_path: Path):
    write_manifest(tmp_path, _manifest("4.67.0"))
    r = _run([
        "--install-root", str(tmp_path),
        "--new-version", "4.66.0",
    ])
    assert r.returncode == 40, r.stderr
    assert "E_INSTALL_DOWNGRADE_BLOCKED" in r.stderr


def test_cli_downgrade_allowed_exit_0(tmp_path: Path):
    write_manifest(tmp_path, _manifest("4.67.0"))
    r = _run([
        "--install-root", str(tmp_path),
        "--new-version", "4.66.0",
        "--allow-downgrade",
    ])
    assert r.returncode == 0, r.stderr
    assert json.loads(r.stdout)["Action"] == "downgrade-allowed"


def test_cli_invalid_version_exit_41(tmp_path: Path):
    r = _run([
        "--install-root", str(tmp_path),
        "--new-version", "not-a-version",
    ])
    assert r.returncode == 41, r.stderr
    assert "E_INSTALL_UPGRADE_INVALID" in r.stderr
