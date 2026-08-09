"""Plan 90 Step 117 - PyInstaller binary inventory + doctor enforcement tests.

Root cause guarded: pre-Step-117 the release path assumed a curated
Python + venv on every Windows host, so any missing interpreter surfaced
as an opaque wrapper 9530=venv-missing exit with no fallback binary.
These tests pin the ``BINARIES`` inventory + the two doctor findings
(``BinarySpecMissing``, ``BinaryEntryMissing``) so a spec or entry
script deletion cannot regress silently.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from BE.app.installer_binaries import (
    BINARIES,
    BinaryEntry,
    binary_presence,
)
from BE.app.installer_doctor import DoctorSeverity, run_doctor
from BE.app.installer_plan import (
    InstallerPhase,
    InstallerPlatform,
    plan_install_actions,
)

REPO_ROOT = Path(__file__).resolve().parents[3]


def _plan(platform: InstallerPlatform) -> list:
    return plan_install_actions(platform=platform, phase=InstallerPhase.INSTALL, binaries_dir="/tmp/fake")


# --- inventory shape --------------------------------------------------


def test_binaries_are_frozen_tuple() -> None:
    assert isinstance(BINARIES, tuple)
    names = {b.Name for b in BINARIES}
    assert {"db-bootstrap", "retention-run"} <= names


def test_binary_entries_are_frozen_dataclasses() -> None:
    b = BINARIES[0]
    with pytest.raises(Exception):
        b.Name = "mutated"  # type: ignore[misc]


def test_all_specs_and_entries_exist_in_real_checkout() -> None:
    rows = binary_presence(REPO_ROOT)
    for row in rows:
        assert row["SpecPresent"], f"missing spec: {row['SpecPath']}"
        assert row["EntryPresent"], f"missing entry: {row['EntryScript']}"


def test_binary_presence_flags_missing_in_empty_root(tmp_path: Path) -> None:
    rows = binary_presence(tmp_path)
    assert rows and all(
        r["SpecPresent"] is False and r["EntryPresent"] is False for r in rows
    )


# --- doctor integration -----------------------------------------------


def test_doctor_flags_binary_spec_and_entry_missing(tmp_path: Path) -> None:
    # tmp_path is empty: doctor sees WrapperMissing + BinarySpecMissing +
    # BinaryEntryMissing for every entry.
    report = run_doctor(
        tmp_path,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
        repo_root=tmp_path,
    )
    codes = [f.Code for f in report.Findings]
    assert codes.count("BinarySpecMissing") == len(BINARIES)
    assert codes.count("BinaryEntryMissing") == len(BINARIES)
    for f in report.Findings:
        if f.Code.startswith("Binary"):
            assert f.Severity is DoctorSeverity.ERROR


def test_doctor_clean_binaries_in_real_repo() -> None:
    report = run_doctor(
        REPO_ROOT / ".doctor-nonexistent-install-root",
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
        repo_root=REPO_ROOT,
    )
    codes = [f.Code for f in report.Findings]
    assert "BinarySpecMissing" not in codes
    assert "BinaryEntryMissing" not in codes
    # Inventory is populated on the report.
    assert len(report.Binaries) == len(BINARIES)


def test_doctor_binaries_included_in_to_dict() -> None:
    report = run_doctor(
        REPO_ROOT / ".doctor-nonexistent-install-root",
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
        repo_root=REPO_ROOT,
    )
    payload = report.to_dict()
    assert "Binaries" in payload
    assert all("SpecPresent" in row and "EntryPresent" in row for row in payload["Binaries"])


def test_doctor_omits_binaries_when_repo_root_absent(tmp_path: Path) -> None:
    report = run_doctor(
        tmp_path,
        platform=InstallerPlatform.WINDOWS,
        planned_actions=_plan(InstallerPlatform.WINDOWS),
    )
    assert report.Binaries == []
    assert not any(f.Code.startswith("Binary") for f in report.Findings)


# --- spec-file smoke --------------------------------------------------


def test_spec_files_reference_correct_entry_script() -> None:
    for b in BINARIES:
        text = (REPO_ROOT / b.SpecPath).read_text(encoding="utf-8")
        # entry script path should appear in the spec (Path("bin") / "<name>.py").
        script_name = Path(b.EntryScript).name
        assert script_name in text, f"{b.SpecPath} does not mention {script_name}"
        # onefile invariant: no UPX (deterministic bytes for SHA256).
        assert "upx=False" in text, f"{b.SpecPath} must set upx=False"
        # console app invariant (envelope on stdout).
        assert "console=True" in text, f"{b.SpecPath} must set console=True"
