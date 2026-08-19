"""Plan 90 Step 106 - installer doctor + record CLIs.

Root cause guarded: Step 105 shipped the manifest reader/writer but
nothing on the install path consulted it (doctor) or fed it (record),
so a repeat ``install`` would either silently stomp a half-installed
system or leave the audit trail empty. Tests here pin the doctor's
finding taxonomy + severity mapping and the record CLI's validation
boundary so wrappers on Windows + POSIX cannot drift.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

from BE.app.install_manifest import (
    MANIFEST_FILENAME,
    ManifestActionRecord,
    init_manifest,
    read_manifest_strict,
    record_action,
)
from BE.app.installer_doctor import (
    DoctorSeverity,
    render_human,
    run_doctor,
)
from BE.app.installer_plan import (
    InstallerAction,
    InstallerPhase,
    InstallerPlatform,
    plan_install_actions,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCTOR_CLI = REPO_ROOT / "bin" / "install-doctor.py"
RECORD_CLI = REPO_ROOT / "bin" / "install-record.py"


def _now() -> str:
    return datetime.now(tz=UTC).isoformat(timespec="seconds")


def _plan() -> list[InstallerAction]:
    return plan_install_actions(
        platform=InstallerPlatform.POSIX,
        phase=InstallerPhase.INSTALL,
        binaries_dir="/tmp/fake-release",
    )



# --- run_doctor -------------------------------------------------------


def test_doctor_manifest_absent_is_info(tmp_path: Path) -> None:
    r = run_doctor(tmp_path, platform=InstallerPlatform.POSIX, planned_actions=_plan())
    assert r.ManifestPresent is False
    assert not r.has_errors and not r.has_warnings
    assert [f.Code for f in r.Findings] == ["ManifestAbsent"]
    assert r.Findings[0].Severity is DoctorSeverity.INFO


def test_doctor_platform_mismatch_is_error(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.46.0", platform="windows")
    r = run_doctor(tmp_path, platform=InstallerPlatform.POSIX, planned_actions=_plan())
    assert r.has_errors is True
    codes = [f.Code for f in r.Findings]
    assert "PlatformMismatch" in codes


def test_doctor_previous_critical_failure_is_error(tmp_path: Path) -> None:
    plan = _plan()
    critical_name = next(a.name for a in plan if a.critical)
    init_manifest(tmp_path, app_version="4.46.0", platform="posix")
    record_action(
        tmp_path,
        ManifestActionRecord(
            Name=critical_name,
            Script="bin/db-bootstrap.py",
            Args=(),
            Phase="install",
            StartedAt=_now(),
            CompletedAt=_now(),
            DurationMs=100,
            ExitCode=7,
            IsCritical=True,
            IsSuccess=False,
        ),
    )
    r = run_doctor(tmp_path, platform=InstallerPlatform.POSIX, planned_actions=plan)
    assert r.has_errors is True
    assert any(f.Code == "PreviousCriticalFailure" for f in r.Findings)


def test_doctor_orphan_installed_action_is_warning(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.46.0", platform="posix")
    record_action(
        tmp_path,
        ManifestActionRecord(
            Name="ghost-action",
            Script="bin/ghost.py",
            Args=(),
            Phase="install",
            StartedAt=_now(),
            CompletedAt=_now(),
            DurationMs=10,
            ExitCode=0,
            IsCritical=False,
            IsSuccess=True,
        ),
    )
    r = run_doctor(tmp_path, platform=InstallerPlatform.POSIX, planned_actions=_plan())
    assert r.has_errors is False
    assert r.has_warnings is True
    assert any(f.Code == "OrphanInstalledAction" for f in r.Findings)


def test_doctor_success_after_prior_uninstall_is_clean(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.46.0", platform="posix")
    plan = _plan()
    # Successful install then uninstall of every action -> no orphan.
    for a in plan:
        for phase, exit_code in (("install", 0), ("uninstall", 0)):
            record_action(
                tmp_path,
                ManifestActionRecord(
                    Name=a.name, Script=a.script, Args=tuple(a.args),
                    Phase=phase, StartedAt=_now(), CompletedAt=_now(),
                    DurationMs=1, ExitCode=exit_code,
                    IsCritical=a.critical, IsSuccess=(exit_code == 0),
                ),
            )
    r = run_doctor(tmp_path, platform=InstallerPlatform.POSIX, planned_actions=plan)
    assert r.has_errors is False and r.has_warnings is False


def test_render_human_lists_each_finding(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.46.0", platform="windows")
    r = run_doctor(tmp_path, platform=InstallerPlatform.POSIX, planned_actions=_plan())
    out = render_human(r)
    assert "PlatformMismatch" in out
    assert "[error]" in out


# --- install-doctor CLI ------------------------------------------------


def _run_cli(script: Path, *args: str) -> subprocess.CompletedProcess[str]:
    import os
    env = dict(os.environ)
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.run(
        [sys.executable, str(script), *args],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        env=env,
    )


def test_doctor_cli_exit_zero_on_fresh_install(tmp_path: Path) -> None:
    r = _run_cli(
        DOCTOR_CLI,
        "--install-root", str(tmp_path),
        "--platform", "posix",
        "--phase", "install",
    )
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout)
    assert payload["ManifestPresent"] is False
    assert payload["Findings"][0]["Code"] == "ManifestAbsent"


def test_doctor_cli_exit_21_on_platform_mismatch(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.46.0", platform="windows")
    r = _run_cli(
        DOCTOR_CLI,
        "--install-root", str(tmp_path),
        "--platform", "posix",
        "--phase", "install",
    )
    assert r.returncode == 21, (r.returncode, r.stderr)


def test_doctor_cli_exit_20_on_warnings_only(tmp_path: Path) -> None:
    init_manifest(tmp_path, app_version="4.46.0", platform="posix")
    record_action(
        tmp_path,
        ManifestActionRecord(
            Name="ghost", Script="bin/ghost.py", Args=(),
            Phase="install", StartedAt=_now(), CompletedAt=_now(),
            DurationMs=1, ExitCode=0, IsCritical=False, IsSuccess=True,
        ),
    )
    r = _run_cli(
        DOCTOR_CLI,
        "--install-root", str(tmp_path),
        "--platform", "posix",
        "--phase", "install",
    )
    assert r.returncode == 20, (r.returncode, r.stderr)


# --- install-record CLI -----------------------------------------------


def test_record_cli_creates_manifest_and_appends(tmp_path: Path) -> None:
    args = [
        "--install-root", str(tmp_path),
        "--app-version", "4.47.0",
        "--platform", "posix",
        "--name", "db-bootstrap",
        "--script", "bin/db-bootstrap.py",
        "--args-json", json.dumps(["--foo", "bar baz"]),
        "--phase", "install",
        "--started-at", _now(),
        "--completed-at", _now(),
        "--duration-ms", "123",
        "--exit-code", "0",
        "--is-critical", "true",
    ]
    r = _run_cli(RECORD_CLI, *args)
    assert r.returncode == 0, r.stderr
    manifest = read_manifest_strict(tmp_path)
    assert manifest.AppVersion == "4.47.0"
    assert len(manifest.Actions) == 1
    entry = manifest.Actions[0]
    assert entry["Name"] == "db-bootstrap"
    assert entry["Args"] == ["--foo", "bar baz"]
    assert entry["IsSuccess"] is True
    assert entry["IsCritical"] is True


def test_record_cli_rejects_bad_args_json(tmp_path: Path) -> None:
    r = _run_cli(
        RECORD_CLI,
        "--install-root", str(tmp_path),
        "--app-version", "4.47.0",
        "--platform", "posix",
        "--name", "x",
        "--script", "bin/x.py",
        "--args-json", "not-json",
        "--phase", "install",
        "--started-at", _now(),
        "--completed-at", _now(),
        "--duration-ms", "1",
        "--exit-code", "0",
        "--is-critical", "false",
    )
    assert r.returncode == 2
    assert (tmp_path / MANIFEST_FILENAME).exists() is False


def test_record_cli_marks_failure_on_nonzero_exit(tmp_path: Path) -> None:
    r = _run_cli(
        RECORD_CLI,
        "--install-root", str(tmp_path),
        "--app-version", "4.47.0",
        "--platform", "posix",
        "--name", "flaky",
        "--script", "bin/flaky.py",
        "--args-json", "[]",
        "--phase", "install",
        "--started-at", _now(),
        "--completed-at", _now(),
        "--duration-ms", "5",
        "--exit-code", "9",
        "--is-critical", "true",
    )
    assert r.returncode == 0
    entry = read_manifest_strict(tmp_path).Actions[0]
    assert entry["IsSuccess"] is False
    assert entry["ExitCode"] == 9
