"""Plan 90 Step 123 - Release workflow presence + inventory-alignment tests.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md`` §"Release
workflow scaffold".

Root cause guarded (one sentence): the release workflow reads
``BE.app.installer_binaries.BINARIES`` and iterates every spec at build
time, so a silent divergence between the on-disk spec set and the
inventory would ship an empty release; these tests fail fast if either
side drifts.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from BE.app.installer_binaries import BINARIES

REPO = Path(__file__).resolve().parents[3]
WORKFLOW = REPO / ".github" / "workflows" / "release.yml"


def test_release_workflow_exists() -> None:
    assert WORKFLOW.is_file(), f"missing release workflow: {WORKFLOW}"


def test_release_workflow_declares_matrix_and_jobs() -> None:
    # Cheap grep over declared structure; avoids adding pyyaml to CI test
    # deps just for a spot check. The YAML itself is validated by GitHub
    # Actions on push.
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "workflow_dispatch:" in text
    assert "windows-latest" in text
    assert "ubuntu-latest" in text
    assert "SHA256SUMS.txt" in text
    assert "concurrency:" in text
    assert "release-${{ github.ref }}" in text
    # Publish job is gated on both inputs to avoid an accidental release.
    assert "publish_draft == 'true'" in text
    assert "release_tag != ''" in text


@pytest.mark.parametrize("entry", list(BINARIES), ids=[b.Name for b in BINARIES])
def test_every_binary_spec_file_exists(entry) -> None:
    spec_path = REPO / entry.SpecPath
    assert spec_path.is_file(), (
        f"BINARIES lists {entry.Name} at {entry.SpecPath} but the .spec is "
        "missing on disk; release workflow would fail at pyinstaller step."
    )


def test_release_workflow_reads_inventory_module() -> None:
    # Contract: the workflow MUST import BE.app.installer_binaries so a
    # new BinaryEntry lands in the build loop without a workflow edit.
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "from BE.app.installer_binaries import BINARIES" in text
