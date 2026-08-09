"""Boundary scan: ``processing-cli`` MUST NOT transitively import camera code.

Root cause guarded: if `BE.sdk_facade.camera` or any vendor adapter leaks into
the `processing-cli` module graph, PyInstaller bundles bloat and the CLI
crashes on hosts without vendor DLLs. This test pins spec/21-app/75 §Boundary
by loading `BE.cli.processing.main` in a fresh subprocess and asserting no
forbidden module lands in `sys.modules`.

Fresh interpreter is required: pytest itself already imports camera code via
other suites, so an in-process check would false-pass.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[4]
import textwrap


FORBIDDEN = (
    "BE.sdk_facade.camera",
    "BE.cli.worker.camera_lease",
    "BE.cli.worker.subcommands",
    "BE.cli.worker.main",
)


def _load_processing_modules() -> set[str]:
    """Import ``BE.cli.processing.main`` in a subprocess; return sys.modules keys."""
    script = textwrap.dedent(
        """
        import json, sys
        import BE.cli.processing.main  # noqa: F401
        # Also touch every command module the dispatcher can resolve.
        from BE.cli.processing import commands as _cmds  # noqa: F401
        import pkgutil
        for m in pkgutil.iter_modules(_cmds.__path__, _cmds.__name__ + "."):
            __import__(m.name)
        print(json.dumps(sorted(sys.modules.keys())))
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        text=True,
        check=True,
        cwd=str(_REPO_ROOT),
    )
    return set(json.loads(result.stdout.strip().splitlines()[-1]))


def test_processing_cli_does_not_import_camera_modules() -> None:
    loaded = _load_processing_modules()
    leaked = sorted(m for m in FORBIDDEN if m in loaded)
    assert not leaked, (
        f"processing-cli transitively imported forbidden modules: {leaked}. "
        "Move the offending import into worker-cli or gate it behind a "
        "lazy import inside the camera-owning subcommand."
    )


def test_processing_cli_does_not_import_vendor_sdk() -> None:
    loaded = _load_processing_modules()
    vendor = sorted(m for m in loaded if m.startswith("gxipy") or m.startswith("daheng"))
    assert not vendor, (
        f"processing-cli pulled vendor SDK modules into its graph: {vendor}. "
        "Vendor adapters are worker-cli-only."
    )
