# Plan 90 Step 117 - PyInstaller onefile spec for bin/retention-run.py.
#
# Owning spec: spec/21-app/77-cli-powershell-and-release.md
# §"Release artefacts". Companion to db-bootstrap.spec; every design
# invariant documented there applies here (onefile, no-UPX, console,
# stable name, pure spec).
#
# Root cause guarded (one sentence): the retention worker had no frozen
# binary, so the Windows scheduled task chain (wrapper -> Python -> CLI)
# broke at the venv step on any host without a curated Python install.
#
# Build (Windows runner):
#     pyinstaller packaging/pyinstaller/retention-run.spec --clean --noconfirm
# Output:
#     dist/retention-run.exe

# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


ENTRY_SCRIPT = str(Path("bin") / "retention-run.py")

a = Analysis(
    [ENTRY_SCRIPT],
    pathex=[str(Path(".").resolve())],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
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
    name="retention-run",
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
