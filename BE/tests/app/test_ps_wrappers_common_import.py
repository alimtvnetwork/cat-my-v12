"""Plan 90 Step 116 - Verify every shippable .ps1 wrapper imports Common.psm1.

Root cause guarded: refactoring a wrapper without re-importing the shared
helper module would silently regress to the pre-Step-116 duplicated blocks
and PSScriptAnalyzer alone could not catch that regression (an unused
import is a warning, not the absence of an import).
"""

from __future__ import annotations

from pathlib import Path

from BE.app.installer_wrappers import WRAPPERS

REPO_ROOT = Path(__file__).resolve().parents[3]

IMPORT_LINE = "Import-Module (Join-Path $PSScriptRoot 'Common.psm1') -Force"


def test_common_psm1_is_in_inventory() -> None:
    names = {w.Name for w in WRAPPERS}
    assert "Common" in names, "Common.psm1 must be listed in WRAPPERS"


def test_common_psm1_exists_on_disk() -> None:
    assert (REPO_ROOT / "scripts/ps/Common.psm1").is_file()


def test_every_ps1_wrapper_imports_common() -> None:
    ps1_wrappers = [w for w in WRAPPERS if w.Path.endswith(".ps1")]
    assert ps1_wrappers, "expected at least one .ps1 wrapper in inventory"
    for w in ps1_wrappers:
        text = (REPO_ROOT / w.Path).read_text(encoding="utf-8")
        assert IMPORT_LINE in text, (
            f"{w.Path} must import Common.psm1 via '{IMPORT_LINE}' "
            "(Plan 90 Step 116 shared-helpers contract)."
        )


def test_common_psm1_exports_expected_helpers() -> None:
    text = (REPO_ROOT / "scripts/ps/Common.psm1").read_text(encoding="utf-8")
    for fn in (
        "Get-VisionAppRepoRoot",
        "Get-VisionAppIsWindows",
        "Get-VisionAppVenvPython",
        "Resolve-VisionAppPwshExe",
    ):
        assert f"function {fn}" in text, f"Common.psm1 missing function {fn}"
        assert fn in text.split("Export-ModuleMember", 1)[1], (
            f"Common.psm1 does not export {fn}"
        )
