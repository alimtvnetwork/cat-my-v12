"""Plan 90 Step 126 - PATH-link lifecycle for shipped PyInstaller binaries.

Owning spec: ``spec/21-app/77-cli-powershell-and-release.md`` §"PATH linking".

Root cause guarded (one sentence): Steps 117-125 built and verified the
onefile ``.exe`` payloads but left them stranded in an out-of-PATH
release directory, so an operator finishing ``install.ps1`` still had to
type an absolute path to run ``db-bootstrap`` / ``retention-run`` and
any second install silently shadowed the previous shim without a
recorded uninstall trail.

Design invariants
-----------------
1. **Pure module, thin I/O.** ``plan_link_actions`` is pure and unit
   testable; ``apply_link_install`` / ``apply_link_uninstall`` are the
   only filesystem entry points and raise ``AppError`` on every failure.
2. **User-scoped link dir.** Defaults derived from the OS. Callers may
   override for tests and for admin-scope installs.
3. **Idempotent.** Re-installing over an existing shim replaces it
   atomically; uninstall of a missing shim is a no-op (never raises).
4. **No PATH mutation.** Writing user PATH entries is a separate
   concern (Step 127); this module only manages the shim files.
5. **Windows uses ``.cmd`` shims.** ``os.symlink`` on Windows requires
   Developer Mode / admin, so we emit a ``.cmd`` that ``@call``s the
   real exe. POSIX uses a ``symlink`` (cheap and standard).

Anchors
-------
- ``BE/app/installer_binaries.py`` (Step 117) - single source of truth.
- ``BE/app/install_manifest.py`` (Step 105) - callers append a
  ``ManifestActionRecord`` with ``Name="path-link"``.
- ``spec/coding-guidelines/python.md`` - typed boundaries, PascalCase codes.
"""

from __future__ import annotations

import os
import sys
import tempfile
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Final

from BE.app.installer_binaries import BINARIES, BinaryEntry
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


class LinkPlatform(str, Enum):
    WINDOWS = "windows"
    POSIX = "posix"


@dataclass(frozen=True)
class LinkAction:
    """One shim/symlink to create or remove.

    Attributes
    ----------
    Name:
        Binary identifier (matches ``BinaryEntry.Name``).
    Source:
        Absolute path to the shipped exe.
    LinkPath:
        Absolute path of the shim / symlink to create under the link dir.
    """

    Name: str
    Source: Path
    LinkPath: Path


def default_link_dir(platform: LinkPlatform) -> Path:
    """Return the per-user link directory for the given platform.

    Windows: ``%LOCALAPPDATA%\\vision-app\\bin`` (falls back to
    ``~/AppData/Local/vision-app/bin`` if the env var is unset, matching
    Windows' own resolution rule).
    POSIX: ``~/.local/share/vision-app/bin`` (XDG-friendly, no root).
    """
    if platform is LinkPlatform.WINDOWS:
        base_env = os.environ.get("LOCALAPPDATA")
        base = Path(base_env) if base_env else Path.home() / "AppData" / "Local"
        return base / "vision-app" / "bin"
    return Path.home() / ".local" / "share" / "vision-app" / "bin"


def _shim_filename(platform: LinkPlatform, exe_name: str) -> str:
    return f"{exe_name}.cmd" if platform is LinkPlatform.WINDOWS else exe_name


def plan_link_actions(
    *,
    platform: LinkPlatform,
    binaries_dir: Path,
    link_dir: Path,
    binaries: tuple[BinaryEntry, ...] = BINARIES,
) -> list[LinkAction]:
    """Return the ordered list of shim actions for the binary inventory.

    Pure: computes paths only, never touches the filesystem. The caller
    is responsible for invoking ``apply_link_install`` /
    ``apply_link_uninstall``.
    """
    if not isinstance(platform, LinkPlatform):
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message=f"platform must be LinkPlatform, got {type(platform).__name__}",
        )
    if not isinstance(binaries_dir, Path):
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message="binaries_dir must be a Path",
        )
    if not isinstance(link_dir, Path):
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message="link_dir must be a Path",
        )

    out: list[LinkAction] = []
    for b in binaries:
        source_name = f"{b.ExeName}.exe" if platform is LinkPlatform.WINDOWS else b.ExeName
        source = binaries_dir / source_name
        link_path = link_dir / _shim_filename(platform, b.ExeName)
        out.append(LinkAction(Name=b.Name, Source=source, LinkPath=link_path))
    return out


def _atomic_write_text(target: Path, body: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_str = tempfile.mkstemp(
        prefix=f".{target.name}.", suffix=".tmp", dir=str(target.parent)
    )
    tmp_path = Path(tmp_str)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(body)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, target)
    except BaseException:
        try:
            tmp_path.unlink()
        except OSError:
            pass
        raise


def _install_windows_shim(action: LinkAction) -> None:
    if not action.Source.is_file():
        raise AppError(
            code=ErrorCode.E_INSTALL_PATH_LINK_FAILED,
            message=f"source exe missing: {action.Source}",
        )
    # ``@call`` (not @start) so exit codes propagate. ``%*`` forwards args.
    body = f'@echo off\r\n@call "{action.Source}" %*\r\n'
    try:
        _atomic_write_text(action.LinkPath, body)
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_PATH_LINK_FAILED,
            message=f"cannot write shim {action.LinkPath}: {exc}",
            cause=exc,
        ) from exc


def _install_posix_symlink(action: LinkAction) -> None:
    if not action.Source.is_file():
        raise AppError(
            code=ErrorCode.E_INSTALL_PATH_LINK_FAILED,
            message=f"source exe missing: {action.Source}",
        )
    try:
        action.LinkPath.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_PATH_LINK_FAILED,
            message=f"cannot create link dir {action.LinkPath.parent}: {exc}",
            cause=exc,
        ) from exc

    # Idempotent replace via same-dir tmp symlink + os.replace.
    tmp_link = action.LinkPath.with_name(f".{action.LinkPath.name}.tmp")
    try:
        if tmp_link.is_symlink() or tmp_link.exists():
            tmp_link.unlink()
        os.symlink(action.Source, tmp_link)
        os.replace(tmp_link, action.LinkPath)
    except OSError as exc:
        try:
            if tmp_link.is_symlink() or tmp_link.exists():
                tmp_link.unlink()
        except OSError:
            pass
        raise AppError(
            code=ErrorCode.E_INSTALL_PATH_LINK_FAILED,
            message=f"cannot symlink {action.LinkPath} -> {action.Source}: {exc}",
            cause=exc,
        ) from exc


def apply_link_install(
    actions: list[LinkAction], platform: LinkPlatform
) -> list[LinkAction]:
    """Materialize every planned shim. Idempotent (replaces on re-run).

    Returns the list of actions applied so the caller can persist them
    into ``install.json`` via ``BE.app.install_manifest``.
    """
    for action in actions:
        if platform is LinkPlatform.WINDOWS:
            _install_windows_shim(action)
        else:
            _install_posix_symlink(action)
    return actions


def apply_link_uninstall(
    actions: list[LinkAction], platform: LinkPlatform
) -> list[LinkAction]:
    """Remove every planned shim. Missing shims are NOT an error.

    A non-file, non-symlink entry at ``LinkPath`` (a stray directory
    someone placed there) IS an error - it is not ours to remove.
    """
    del platform  # symmetrical on both platforms
    for action in actions:
        p = action.LinkPath
        try:
            if p.is_symlink() or p.is_file():
                p.unlink()
            elif p.exists():
                raise AppError(
                    code=ErrorCode.E_INSTALL_PATH_LINK_FAILED,
                    message=(
                        f"refusing to remove non-file/non-symlink at {p} "
                        f"(directory or special file)"
                    ),
                )
            # else: already gone; idempotent.
        except OSError as exc:
            raise AppError(
                code=ErrorCode.E_INSTALL_PATH_LINK_FAILED,
                message=f"cannot remove shim {p}: {exc}",
                cause=exc,
            ) from exc
    return actions


def current_platform() -> LinkPlatform:
    """Detect the caller's platform. Used by the CLI when ``--platform`` omitted."""
    return LinkPlatform.WINDOWS if sys.platform == "win32" else LinkPlatform.POSIX
