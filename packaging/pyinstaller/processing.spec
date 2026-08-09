# Plan 90 Step 86 - PyInstaller onefile spec for processing-cli.
#
# Owning spec: spec/21-app/77-cli-powershell-and-release.md
# §"Release artefacts". Mirrors packaging/pyinstaller/worker.spec (Step 85)
# byte-for-byte except for the entry module, output name, and helptext data
# tree - deliberate so the release matrix produces two symmetric artefacts
# under identical invariants (no UPX, deterministic SHA256, console app).
#
# Root cause guarded (one sentence): shipping loose .py files forced every
# operator to pre-install a matching Python + venv before any wrapper could
# run, so a partial interpreter surfaced as an opaque wrapper 9510
# venv-missing exit with no fallback binary.
#
# Design invariants (see worker.spec for the long-form rationale):
# 1. Onefile bootloader -> ONE processing-cli.exe.
# 2. No UPX -> deterministic SHA256 for SHA256SUMS.txt.
# 3. Console app -> stdout carries the Universal Envelope JSON.
# 4. `sdk/` bundled -> vendor manual + asset descriptors available at
#    runtime without a source checkout (spec 73).
# 5. `BE/cli/processing/helptext/` bundled -> importlib.resources reads
#    subcommand help fixtures (batch, doctor, dry_run, evaluate, status,
#    verify_bundle, version, watch) from inside the frozen archive.
# 6. Test packages excluded so pytest fixtures never ship.
# 7. Stable name `processing-cli` for wrapper resolution (Step 81
#    Invoke-ProcessingCli.ps1).
#
# Build (Windows/Linux runner):
#     pyinstaller packaging/pyinstaller/processing.spec --clean --noconfirm
# Output:
#     dist/processing-cli(.exe)

# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


ENTRY_MODULE = str(Path("BE") / "cli" / "processing" / "main.py")

a = Analysis(
    [ENTRY_MODULE],
    pathex=[str(Path(".").resolve())],
    binaries=[],
    datas=[
        ("sdk", "sdk"),
        ("BE/cli/processing/helptext", "BE/cli/processing/helptext"),
        ("BE/db/migrations", "BE/db/migrations"),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
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
    name="processing-cli",
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
