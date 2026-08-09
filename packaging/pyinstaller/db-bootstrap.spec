# Plan 90 Step 117 - PyInstaller onefile spec for bin/db-bootstrap.py.
#
# Owning spec: spec/21-app/77-cli-powershell-and-release.md
# §"Release artefacts" (worker-cli/processing-cli onefile binaries).
#
# Root cause guarded (one sentence): shipping loose .py files forced
# every Windows operator to pre-install a matching Python + venv before
# any wrapper could run, so a partial interpreter surfaced as an opaque
# wrapper 9530=venv-missing exit with no fallback binary.
#
# Design invariants
# -----------------
# 1. Onefile bootloader (`onefile=True`) so the release ships ONE .exe
#    per CLI, matching `spec/16-generic-release/05-release-assets.md`.
# 2. No UPX (deterministic bytes so SHA256 in `SHA256SUMS.txt` is stable
#    across builds; UPX compression is non-deterministic between hosts).
# 3. Console app (`console=True`) so stdout carries the Universal
#    Envelope JSON and stderr carries human progress, matching the
#    CLI cheatsheet (spec 76 + `.lovable/memory/26-split-db-cli-cheatsheet.md`).
# 4. `strip=False` on Windows (PE stripping is unsupported); True is
#    still safe to omit here because the platform is decided at build
#    time on the runner.
# 5. Name is stable (`db-bootstrap`) so wrappers can rely on
#    `db-bootstrap.exe` without version-suffix collisions.
# 6. Pure spec: no I/O at build time beyond PyInstaller's own analysis.
#
# Build (Windows runner):
#     pyinstaller packaging/pyinstaller/db-bootstrap.spec --clean --noconfirm
# Output:
#     dist/db-bootstrap.exe

# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


ENTRY_SCRIPT = str(Path("bin") / "db-bootstrap.py")

a = Analysis(
    [ENTRY_SCRIPT],
    pathex=[str(Path(".").resolve())],
    binaries=[],
    datas=[
        # Migrations are read at runtime from BE/db/migrations; bundle them
        # so the frozen exe does not require a checkout on the host.
        ("BE/db/migrations", "BE/db/migrations"),
    ],
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
    name="db-bootstrap",
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
