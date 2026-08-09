# Plan 90 Step 85 - PyInstaller onefile spec for worker-cli.
#
# Owning spec: spec/21-app/77-cli-powershell-and-release.md
# §"Release artefacts" (worker-cli/processing-cli onefile binaries).
#
# Root cause guarded (one sentence): shipping loose .py files forced every
# Windows operator to pre-install a matching Python + venv before any wrapper
# could run, so a partial interpreter surfaced as an opaque wrapper 9510
# venv-missing exit with no fallback binary.
#
# Design invariants (mirror packaging/pyinstaller/db-bootstrap.spec):
# 1. Onefile bootloader so the release ships ONE worker-cli.exe.
# 2. No UPX (deterministic bytes for SHA256SUMS.txt).
# 3. Console app so stdout carries the Universal Envelope JSON and stderr
#    carries human progress (spec 76).
# 4. `sdk/` non-code data is bundled so the frozen exe can locate the vendor
#    manual + asset descriptors at runtime without a checkout on the host.
# 5. Test packages excluded to keep the binary lean and to avoid leaking
#    pytest fixtures into the shipped surface.
# 6. Stable name `worker-cli` so wrappers (Step 80 Invoke-WorkerCli.ps1)
#    can rely on it without version-suffix collisions.
#
# Build (Windows/Linux runner):
#     pyinstaller packaging/pyinstaller/worker.spec --clean --noconfirm
# Output:
#     dist/worker-cli(.exe)

# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


ENTRY_MODULE = str(Path("BE") / "cli" / "worker" / "main.py")

a = Analysis(
    [ENTRY_MODULE],
    pathex=[str(Path(".").resolve())],
    binaries=[],
    datas=[
        # Vendor SDK manual + asset descriptors (spec 73). Non-code, read
        # at runtime by the doctor subcommand and by the SDK adapter fallback
        # when locating the Daheng Galaxy reference material.
        ("sdk", "sdk"),
        # Worker helptext fixtures live alongside the module and are read
        # via importlib.resources at runtime.
        ("BE/cli/worker/helptext", "BE/cli/worker/helptext"),
        # DB migrations are needed by any worker subcommand that touches
        # the split-DB roots on first run.
        ("BE/db/migrations", "BE/db/migrations"),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Test packages must never ship in the released binary.
        "pytest",
        "_pytest",
        "pytest_asyncio",
        "hypothesis",
        "BE.tests",
        "tests",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="worker-cli",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
