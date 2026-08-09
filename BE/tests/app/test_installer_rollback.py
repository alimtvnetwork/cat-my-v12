"""Plan 90 Step 130 - rollback planner + restore + CLI tests."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from BE.app.install_manifest import (
    InstallManifest,
    MANIFEST_FILENAME,
    MANIFEST_SCHEMA_VERSION,
    read_manifest_strict,
    write_manifest,
)
from BE.app.installer_rollback import (
    RollbackDecision,
    load_backup,
    plan_rollback,
    restore_manifest,
)
from BE.app.installer_upgrade import backup_manifest
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


TS = "2026-07-21T00:00:00+00:00"


def _mk(version: str, actions: list[dict]) -> InstallManifest:
    return InstallManifest(
        SchemaVersion=MANIFEST_SCHEMA_VERSION,
        AppVersion=version,
        Platform="posix",
        InstalledAt=TS,
        LastUpdatedAt=TS,
        Actions=list(actions),
    )


def _action(name: str, started: str, *, phase: str = "install") -> dict:
    return {
        "Name": name,
        "Script": f"bin/{name}.py",
        "Args": [],
        "Phase": phase,
        "StartedAt": started,
        "CompletedAt": started,
        "DurationMs": 1,
        "ExitCode": 0,
        "IsCritical": True,
        "IsSuccess": True,
    }


# --- plan_rollback ----------------------------------------------------


def test_plan_rollback_names_actions_added_after_backup():
    backup = _mk("4.68.0", [_action("db-bootstrap", "t0")])
    current = _mk("4.69.0", [
        _action("db-bootstrap", "t0"),
        _action("path-link", "t1"),
        _action("retention-timer", "t2"),
    ])
    d = plan_rollback(
        current=current, backup=backup,
        failed_action="retention-timer", backup_path=Path("/x/install.json.bak"),
    )
    assert d.FailedAction == "retention-timer"
    # LIFO of application: newest reversed first.
    assert d.ActionsToReverse == ("retention-timer", "path-link")
    assert d.PriorVersion == "4.68.0"
    assert d.CurrentVersion == "4.69.0"
    assert d.BackupPath == "/x/install.json.bak"
    assert isinstance(d, RollbackDecision)


def test_plan_rollback_empty_when_no_actions_added():
    backup = _mk("4.68.0", [_action("db-bootstrap", "t0")])
    current = _mk("4.68.0", [_action("db-bootstrap", "t0")])
    d = plan_rollback(
        current=current, backup=backup,
        failed_action="db-bootstrap", backup_path=Path("/x/b"),
    )
    assert d.ActionsToReverse == ()


def test_plan_rollback_rejects_empty_failed_action():
    m = _mk("4.68.0", [])
    with pytest.raises(AppError) as ei:
        plan_rollback(
            current=m, backup=m, failed_action="   ", backup_path=Path("/x/b"),
        )
    assert ei.value.code is ErrorCode.E_INSTALL_ROLLBACK_FAILED


def test_plan_rollback_rejects_diverged_history():
    backup = _mk("4.68.0", [_action("db-bootstrap", "t0")])
    # current is MISSING the backup entry -> history was rewritten.
    current = _mk("4.69.0", [_action("path-link", "t1")])
    with pytest.raises(AppError) as ei:
        plan_rollback(
            current=current, backup=backup,
            failed_action="path-link", backup_path=Path("/x/b"),
        )
    assert ei.value.code is ErrorCode.E_INSTALL_ROLLBACK_FAILED
    assert "diverged" in ei.value.message


# --- restore_manifest -------------------------------------------------


def test_restore_manifest_replaces_current_with_backup(tmp_path: Path):
    write_manifest(tmp_path, _mk("4.68.0", []))
    backup = backup_manifest(tmp_path)
    assert backup is not None
    # Simulate the upgrade writing a newer manifest.
    write_manifest(tmp_path, _mk("4.69.0", [_action("path-link", "t1")]))
    restored = restore_manifest(tmp_path, backup)
    assert restored == tmp_path / MANIFEST_FILENAME
    m = read_manifest_strict(tmp_path)
    assert m.AppVersion == "4.68.0"
    assert m.Actions == []


def test_restore_manifest_missing_backup_raises(tmp_path: Path):
    with pytest.raises(AppError) as ei:
        restore_manifest(tmp_path, tmp_path / "nope.bak")
    assert ei.value.code is ErrorCode.E_INSTALL_ROLLBACK_FAILED


def test_restore_manifest_invalid_json_raises(tmp_path: Path):
    bad = tmp_path / "install.json.bak"
    bad.write_text("{not json", encoding="utf-8")
    with pytest.raises(AppError) as ei:
        restore_manifest(tmp_path, bad)
    assert ei.value.code is ErrorCode.E_INSTALL_ROLLBACK_FAILED


def test_restore_manifest_non_object_root_raises(tmp_path: Path):
    bad = tmp_path / "install.json.bak"
    bad.write_text("[]", encoding="utf-8")
    with pytest.raises(AppError) as ei:
        restore_manifest(tmp_path, bad)
    assert ei.value.code is ErrorCode.E_INSTALL_ROLLBACK_FAILED


# --- load_backup ------------------------------------------------------


def test_load_backup_returns_manifest(tmp_path: Path):
    write_manifest(tmp_path, _mk("4.68.0", [_action("db-bootstrap", "t0")]))
    backup = backup_manifest(tmp_path)
    assert backup is not None
    m = load_backup(backup)
    assert m.AppVersion == "4.68.0"
    assert len(m.Actions) == 1


def test_load_backup_missing_raises(tmp_path: Path):
    with pytest.raises(AppError) as ei:
        load_backup(tmp_path / "nope.bak")
    assert ei.value.code is ErrorCode.E_INSTALL_ROLLBACK_FAILED


def test_load_backup_invalid_wraps_manifest_error(tmp_path: Path):
    bad = tmp_path / "install.json.bak"
    bad.write_text(json.dumps({"SchemaVersion": 99}), encoding="utf-8")
    with pytest.raises(AppError) as ei:
        load_backup(bad)
    assert ei.value.code is ErrorCode.E_INSTALL_ROLLBACK_FAILED


# --- CLI --------------------------------------------------------------


REPO_ROOT = Path(__file__).resolve().parents[3]
CLI = [sys.executable, str(REPO_ROOT / "bin/install-rollback.py")]


def _run(args: list[str]) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT)
    return subprocess.run(
        CLI + args, capture_output=True, text=True, env=env, cwd=str(REPO_ROOT)
    )


def _fixture_with_backup(tmp_path: Path) -> Path:
    write_manifest(tmp_path, _mk("4.68.0", [_action("db-bootstrap", "t0")]))
    backup = backup_manifest(tmp_path)
    assert backup is not None
    write_manifest(tmp_path, _mk("4.69.0", [
        _action("db-bootstrap", "t0"),
        _action("path-link", "t1"),
    ]))
    return backup


def test_cli_rollback_exit_0_and_restores(tmp_path: Path):
    backup = _fixture_with_backup(tmp_path)
    r = _run([
        "--install-root", str(tmp_path),
        "--backup-path", str(backup),
        "--failed-action", "path-link",
    ])
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout)
    assert payload["FailedAction"] == "path-link"
    assert payload["ActionsToReverse"] == ["path-link"]
    assert payload["PriorVersion"] == "4.68.0"
    assert payload["CurrentVersion"] == "4.69.0"
    assert payload["RestoredPath"] is not None
    assert payload["DryRun"] is False
    # File on disk actually rolled back.
    m = read_manifest_strict(tmp_path)
    assert m.AppVersion == "4.68.0"


def test_cli_dry_run_does_not_touch_disk(tmp_path: Path):
    backup = _fixture_with_backup(tmp_path)
    r = _run([
        "--install-root", str(tmp_path),
        "--backup-path", str(backup),
        "--failed-action", "path-link",
        "--dry-run",
    ])
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout)
    assert payload["DryRun"] is True
    assert payload["RestoredPath"] is None
    m = read_manifest_strict(tmp_path)
    assert m.AppVersion == "4.69.0"  # unchanged


def test_cli_missing_backup_exit_50(tmp_path: Path):
    write_manifest(tmp_path, _mk("4.69.0", []))
    r = _run([
        "--install-root", str(tmp_path),
        "--backup-path", str(tmp_path / "nope.bak"),
        "--failed-action", "path-link",
    ])
    assert r.returncode == 50, r.stderr
    assert "E_INSTALL_ROLLBACK_FAILED" in r.stderr


def test_cli_missing_current_manifest_exit_50(tmp_path: Path):
    # No install.json in install-root at all.
    (tmp_path / "install.json.bak").write_text(
        json.dumps({
            "SchemaVersion": MANIFEST_SCHEMA_VERSION,
            "AppVersion": "4.68.0",
            "Platform": "posix",
            "InstalledAt": TS,
            "LastUpdatedAt": TS,
            "Actions": [],
            "Binaries": [],
        }),
        encoding="utf-8",
    )
    r = _run([
        "--install-root", str(tmp_path),
        "--backup-path", str(tmp_path / "install.json.bak"),
        "--failed-action", "path-link",
    ])
    assert r.returncode == 50, r.stderr


def test_cli_diverged_history_exit_50(tmp_path: Path):
    # Backup has db-bootstrap, but current manifest DROPS it.
    write_manifest(tmp_path, _mk("4.68.0", [_action("db-bootstrap", "t0")]))
    backup = backup_manifest(tmp_path)
    assert backup is not None
    write_manifest(tmp_path, _mk("4.69.0", [_action("path-link", "t1")]))
    r = _run([
        "--install-root", str(tmp_path),
        "--backup-path", str(backup),
        "--failed-action", "path-link",
    ])
    assert r.returncode == 50, r.stderr
    assert "diverged" in r.stderr
