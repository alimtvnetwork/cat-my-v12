"""Plan 90 Step 117 - Canonical PyInstaller binary inventory.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md``
§"Release artefacts".

Root cause guarded (one sentence): the CLI fleet ships as loose ``.py``
files, so a Windows operator without a curated Python + venv hits an
opaque wrapper ``9530=venv-missing`` exit with no fallback binary, and
nothing on the release path fails fast when a required spec file is
missing.

Design invariants
-----------------
1. **Single source of truth.** Every PyInstaller onefile spec the
   release workflow must build lives here. Anything not listed is not
   shippable.
2. **Immutable tuple.** ``BINARIES`` is a frozen tuple so tests,
   installers, and CI cannot mutate it at import time.
3. **Pure data.** No I/O. Callers (doctor, release workflow, tests)
   perform presence checks against a caller-supplied repo root.
4. **Deterministic exe names.** ``ExeName`` is the stable filename
   produced by the spec; wrappers can rely on it without version
   suffixes.

Anchors
-------
- ``packaging/pyinstaller/db-bootstrap.spec`` (Plan 90 Step 117)
- ``packaging/pyinstaller/retention-run.spec`` (Plan 90 Step 117)
- ``BE/app/installer_wrappers.py`` (Plan 90 Steps 115/116) - mirror pattern.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Final


@dataclass(frozen=True)
class BinaryEntry:
    """One PyInstaller onefile target.

    Attributes
    ----------
    Name:
        Stable identifier used in doctor findings and manifest rows.
    SpecPath:
        Repo-relative POSIX path to the ``.spec`` file.
    EntryScript:
        Repo-relative POSIX path to the ``bin/*.py`` script the spec freezes.
    ExeName:
        Filename produced by the spec (no path, no ``.exe`` suffix so
        the same entry describes both Windows and POSIX outputs).
    Purpose:
        One-line human summary for the doctor report and release notes.
    """

    Name: str
    SpecPath: str
    EntryScript: str
    ExeName: str
    Purpose: str


BINARIES: Final[tuple[BinaryEntry, ...]] = (
    BinaryEntry(
        Name="db-bootstrap",
        SpecPath="packaging/pyinstaller/db-bootstrap.spec",
        EntryScript="bin/db-bootstrap.py",
        ExeName="db-bootstrap",
        Purpose="Frozen three-tier DB bootstrap CLI (Root/Task/Rules).",
    ),
    BinaryEntry(
        Name="retention-run",
        SpecPath="packaging/pyinstaller/retention-run.spec",
        EntryScript="bin/retention-run.py",
        ExeName="retention-run",
        Purpose="Frozen Task-DB retention worker (single-shot + loop mode).",
    ),
)


def binary_presence(
    repo_root: Path, binaries: tuple[BinaryEntry, ...] = BINARIES
) -> list[dict[str, object]]:
    """Return a serializable inventory of spec + entry-script presence.

    Pure: only calls ``Path.is_file``; never opens the file. Both the
    ``.spec`` and its ``EntryScript`` must exist for the release build
    to succeed, so the release workflow (and doctor) enforce both.
    """
    out: list[dict[str, object]] = []
    for b in binaries:
        spec_path = repo_root / b.SpecPath
        entry_path = repo_root / b.EntryScript
        out.append({
            "Name": b.Name,
            "SpecPath": b.SpecPath,
            "EntryScript": b.EntryScript,
            "ExeName": b.ExeName,
            "Purpose": b.Purpose,
            "SpecPresent": spec_path.is_file(),
            "EntryPresent": entry_path.is_file(),
        })
    return out


__all__ = [
    "BINARIES",
    "BinaryEntry",
    "binary_presence",
]
