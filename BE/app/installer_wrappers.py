"""Plan 90 Step 115 - Canonical wrapper inventory.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md``
§"PowerShell wrappers".

Root cause guarded (one sentence): ``run_doctor`` inspects planned action
names and prior manifest rows but never checks that the wrapper scripts
those actions point at are physically on disk, so a Windows install with
a missing ``.ps1`` proceeds past preflight and fails deep inside the
action loop with an opaque exit code.

Design invariants
-----------------
1. **Single source of truth.** Every PowerShell wrapper the installer,
   Scheduled Task, or operator can invoke MUST be listed here. Anything
   not listed is not shippable.
2. **Immutable tuple.** ``WRAPPERS`` is a frozen tuple so tests +
   installers cannot mutate it at import time.
3. **Pure data.** No I/O. Callers (doctor, install manifest, tests) do
   presence checks against a caller-supplied repo root.

Anchors
-------
- ``scripts/ps/Invoke-DbBootstrap.ps1`` (Plan 90 Step 40)
- ``scripts/ps/Invoke-RetentionRun.ps1`` (Plan 90 Step 113)
- ``scripts/ps/Register-RetentionTask.ps1`` (Plan 90 Steps 103, 114)
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §12 (exit-code map)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Final


@dataclass(frozen=True)
class WrapperEntry:
    """One shippable wrapper script.

    Attributes
    ----------
    Name:
        Stable identifier used in doctor findings and manifest rows.
    Path:
        Repo-relative POSIX path (forward slashes).
    Platform:
        ``"windows"`` for ``.ps1`` wrappers, ``"posix"`` for shell.
    Purpose:
        One-line human summary for the doctor report.
    """

    Name: str
    Path: str
    Platform: str
    Purpose: str


WRAPPERS: Final[tuple[WrapperEntry, ...]] = (
    WrapperEntry(
        Name="Common",
        Path="scripts/ps/Common.psm1",
        Platform="windows",
        Purpose="Shared PowerShell helpers (repo root, venv python, pwsh discovery).",
    ),
    WrapperEntry(
        Name="Invoke-DbBootstrap",
        Path="scripts/ps/Invoke-DbBootstrap.ps1",
        Platform="windows",
        Purpose="Bootstrap Root-DB + Task-DB schemas via bin/db-bootstrap.py.",
    ),
    WrapperEntry(
        Name="Invoke-RetentionRun",
        Path="scripts/ps/Invoke-RetentionRun.ps1",
        Platform="windows",
        Purpose="Run bin/retention-run.py with wrapper-log discipline.",
    ),
    WrapperEntry(
        Name="Register-RetentionTask",
        Path="scripts/ps/Register-RetentionTask.ps1",
        Platform="windows",
        Purpose="Register/unregister the retention Scheduled Task via Invoke-RetentionRun.",
    ),
)


def wrappers_for_platform(platform: str) -> tuple[WrapperEntry, ...]:
    """Return the wrapper subset relevant to ``platform``.

    Doctor only enforces wrappers whose platform matches the current
    orchestrator, so a POSIX install never fails on a missing ``.ps1``.
    """
    return tuple(w for w in WRAPPERS if w.Platform == platform)


def wrapper_presence(
    repo_root: Path, wrappers: tuple[WrapperEntry, ...] = WRAPPERS
) -> list[dict[str, object]]:
    """Return a serializable inventory: ``[{Name, Path, Platform, Present}]``.

    Pure: only calls ``Path.is_file``; never opens the file.
    """
    out: list[dict[str, object]] = []
    for w in wrappers:
        abs_path = repo_root / w.Path
        out.append({
            "Name": w.Name,
            "Path": w.Path,
            "Platform": w.Platform,
            "Purpose": w.Purpose,
            "Present": abs_path.is_file(),
        })
    return out


__all__ = [
    "WRAPPERS",
    "WrapperEntry",
    "wrapper_presence",
    "wrappers_for_platform",
]
