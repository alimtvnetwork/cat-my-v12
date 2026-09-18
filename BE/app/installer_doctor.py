"""Plan 90 Step 106 - Installer-side pre-flight doctor.

Owning spec: ``02-spec/21-app/79-installer-retention-timing.md`` §"Doctor".

Root cause guarded (one sentence): Step 105 landed the manifest
reader/writer but nothing on the install path actually consults it, so
a repeat ``install.ps1 --install`` will happily re-run against a
half-installed system (platform mismatch, orphaned actions no longer in
the plan, prior critical failures) without a single warning, defeating
the whole point of writing ``install.json`` in the first place.

Design invariants
-----------------
1. **Pure function.** ``run_doctor`` takes an install root and a planned
   action list and returns a ``DoctorReport``. No subprocesses, no I/O
   beyond reading ``install.json`` via ``read_manifest``. Fully unit
   testable without shelling out.
2. **Severity is machine-graded.** ``error`` blocks the install unless
   the caller passes ``--force``; ``warning`` prints but continues;
   ``info`` is diagnostic only. Wrappers translate to exit codes.
3. **No stringly-typed findings.** Each finding has a stable ``Code``
   (PascalCase) that operators + release notes + tests can pin.
4. **Never invents state.** Manifest missing == fresh install (INFO),
   NEVER an error - otherwise the very first install would refuse to run.

Anchors
-------
- ``BE/app/install_manifest.py`` (Step 105).
- ``BE/app/installer_plan.py`` (Step 104).
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

from BE.app.install_manifest import (
    InstallManifest,
    latest_action,
    read_manifest,
)
from BE.app.installer_binaries import BINARIES, binary_presence
from BE.app.installer_plan import InstallerAction, InstallerPlatform
from BE.app.installer_wrappers import (
    wrapper_presence,
    wrappers_for_platform,
)


class DoctorSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass(frozen=True)
class DoctorFinding:
    Code: str
    Severity: DoctorSeverity
    Message: str
    Context: dict[str, Any] = field(default_factory=dict)


@dataclass
class DoctorReport:
    Platform: str
    ManifestPresent: bool
    Findings: list[DoctorFinding] = field(default_factory=list)
    Wrappers: list[dict[str, Any]] = field(default_factory=list)
    Binaries: list[dict[str, Any]] = field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return any(f.Severity is DoctorSeverity.ERROR for f in self.Findings)

    @property
    def has_warnings(self) -> bool:
        return any(f.Severity is DoctorSeverity.WARNING for f in self.Findings)

    def to_dict(self) -> dict[str, Any]:
        return {
            "Platform": self.Platform,
            "ManifestPresent": self.ManifestPresent,
            "Wrappers": [dict(w) for w in self.Wrappers],
            "Binaries": [dict(b) for b in self.Binaries],
            "Findings": [
                {
                    "Code": f.Code,
                    "Severity": f.Severity.value,
                    "Message": f.Message,
                    "Context": dict(f.Context),
                }
                for f in self.Findings
            ],
        }


def _current_platform_value(platform: InstallerPlatform | str) -> str:
    if isinstance(platform, InstallerPlatform):
        return platform.value
    return str(platform)


def _plan_names(actions: Iterable[InstallerAction]) -> list[str]:
    return [a.name for a in actions]


def _check_repo_inventory(report: DoctorReport, repo_root: Path, plat: str) -> None:
    report.Wrappers = wrapper_presence(repo_root)
    for w in wrappers_for_platform(plat):
        if not (repo_root / w.Path).is_file():
            report.Findings.append(DoctorFinding(
                Code="WrapperMissing",
                Severity=DoctorSeverity.ERROR,
                Message=f"Required wrapper {w.Name!r} missing at {w.Path!r}; wrapper-log discipline cannot be enforced.",
                Context={"Name": w.Name, "Path": w.Path, "Platform": w.Platform},
            ))

    report.Binaries = binary_presence(repo_root)
    for b in BINARIES:
        if not (repo_root / b.SpecPath).is_file():
            report.Findings.append(DoctorFinding(
                Code="BinarySpecMissing",
                Severity=DoctorSeverity.ERROR,
                Message=f"PyInstaller spec for {b.Name!r} missing at {b.SpecPath!r}; release build cannot produce {b.ExeName!r}.",
                Context={"Name": b.Name, "SpecPath": b.SpecPath},
            ))
        if not (repo_root / b.EntryScript).is_file():
            report.Findings.append(DoctorFinding(
                Code="BinaryEntryMissing",
                Severity=DoctorSeverity.ERROR,
                Message=f"Entry script for {b.Name!r} missing at {b.EntryScript!r}; spec would fail Analysis().",
                Context={"Name": b.Name, "EntryScript": b.EntryScript},
            ))


def _check_manifest_history(
    report: DoctorReport,
    manifest: InstallManifest,
    plan_list: list[InstallerAction],
    plan_names: list[str],
) -> None:
    from BE.app.install_manifest import installed_action_names
    installed_names = installed_action_names(manifest)
    for name in installed_names:
        if name not in plan_names:
            report.Findings.append(DoctorFinding(
                Code="OrphanInstalledAction",
                Severity=DoctorSeverity.WARNING,
                Message=f"Action {name!r} is recorded as installed but is not in the current installer plan.",
                Context={"Action": name},
            ))

    for action in plan_list:
        entry = latest_action(manifest, action.name)
        if entry is None:
            continue
        if entry.get("Phase") == "install" and entry.get("IsSuccess") is False and entry.get("IsCritical") is True:
            report.Findings.append(DoctorFinding(
                Code="PreviousCriticalFailure",
                Severity=DoctorSeverity.ERROR,
                Message=f"Previous install of {action.name!r} exited with code {entry.get('ExitCode')} and was marked critical.",
                Context={"Action": action.name, "ExitCode": entry.get("ExitCode"), "CompletedAt": entry.get("CompletedAt")},
            ))


def _check_binary_integrity(report: DoctorReport, manifest: InstallManifest) -> None:
    for row in manifest.Binaries:
        recorded_path = row.get("Path")
        recorded_sha = row.get("Sha256")
        recorded_size = row.get("SizeBytes")
        if not isinstance(recorded_path, str) or not isinstance(recorded_sha, str):
            continue
        exe = Path(recorded_path)
        if exe.is_file() is False:
            report.Findings.append(DoctorFinding(
                Code="BinaryFileMissing",
                Severity=DoctorSeverity.ERROR,
                Message=f"Binary {row.get('Name')!r} recorded at {recorded_path!r} is missing on disk.",
                Context={"Name": row.get("Name"), "Path": recorded_path},
            ))
            continue
        try:
            from BE.app.installer_signing import sha256_of_file
            actual_sha, actual_size = sha256_of_file(exe)
        except Exception as error:  # noqa: BLE001
            logger.warning("Failed to compute sha256 for %s: %s", exe, error)
            continue
        if actual_sha != recorded_sha or (isinstance(recorded_size, int) and actual_size != recorded_size):
            report.Findings.append(DoctorFinding(
                Code="BinaryChecksumMismatch",
                Severity=DoctorSeverity.ERROR,
                Message=f"Binary {row.get('Name')!r} on disk does not match install.json.",
                Context={"Name": row.get("Name"), "Path": recorded_path, "RecordedSha256": recorded_sha, "ActualSha256": actual_sha},
            ))


def run_doctor(
    install_root: Path,
    *,
    platform: InstallerPlatform | str,
    planned_actions: Iterable[InstallerAction],
    repo_root: Path | None = None,
) -> DoctorReport:
    """Inspect ``install.json`` and cross-reference the planned actions."""
    plat = _current_platform_value(platform)
    plan_list = list(planned_actions)
    plan_names = _plan_names(plan_list)

    manifest: InstallManifest | None = read_manifest(install_root)
    report = DoctorReport(Platform=plat, ManifestPresent=manifest is not None)

    if repo_root is not None:
        _check_repo_inventory(report, repo_root, plat)

    if manifest is None:
        report.Findings.append(DoctorFinding(
            Code="ManifestAbsent",
            Severity=DoctorSeverity.INFO,
            Message="No previous install.json found; treating as fresh install.",
            Context={"InstallRoot": str(install_root)},
        ))
        return report

    if manifest.Platform != plat:
        report.Findings.append(DoctorFinding(
            Code="PlatformMismatch",
            Severity=DoctorSeverity.ERROR,
            Message=f"install.json was written for platform {manifest.Platform!r} but this orchestrator is running on {plat!r}.",
            Context={"ManifestPlatform": manifest.Platform, "CurrentPlatform": plat},
        ))

    _check_manifest_history(report, manifest, plan_list, plan_names)
    _check_binary_integrity(report, manifest)

    return report


def render_human(report: DoctorReport) -> str:
    """One-line-per-finding operator-facing summary."""
    lines = [
        f"[doctor] platform={report.Platform} manifest={report.ManifestPresent}"
    ]
    for w in report.Wrappers:
        mark = "ok" if w.get("Present") else "MISSING"
        lines.append(f"  [wrapper:{mark}] {w.get('Name')} -> {w.get('Path')}")
    for b in report.Binaries:
        spec_mark = "ok" if b.get("SpecPresent") else "MISSING"
        entry_mark = "ok" if b.get("EntryPresent") else "MISSING"
        lines.append(
            f"  [binary spec:{spec_mark} entry:{entry_mark}] "
            f"{b.get('Name')} -> {b.get('ExeName')}"
        )
    if not report.Findings:
        lines.append("  (no findings)")
    for f in report.Findings:
        lines.append(f"  [{f.Severity.value}] {f.Code}: {f.Message}")
    return "\n".join(lines)


__all__ = [
    "DoctorSeverity",
    "DoctorFinding",
    "DoctorReport",
    "run_doctor",
    "render_human",
]
