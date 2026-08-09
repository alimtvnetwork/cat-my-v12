"""Plan 90 Step 31 - IPC drop-directory bootstrap.

Anchors:
- `spec/21-app/76-cli-log-and-ipc.md` §"IPC protocol" (four drop-dirs under
  `<APP_IPC_ROOT>`: `worker-out/`, `processing-in/`, `processing-out/`,
  `main-in/`).
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §8 (env override chain).

Contract:

    bootstrap_ipc_dirs(ipc_root) -> IpcBootstrapReport

Creates the four canonical drop directories. Optionally links the two
"consumer view" dirs (`processing-in`, `main-in`) to their producer
counterparts (`worker-out`, `processing-out`) so consumers watch the same
inode the producer writes to, per spec §"IPC protocol" note "usually
symlink to worker-out". On Windows, `os.symlink` requires either developer
mode or SeCreateSymbolicLinkPrivilege; when it fails with `OSError`, we
fall back to a directory junction (`mklink /J`) which does not need
elevation. If both fail, the link degrades to an independent directory and
the failure is recorded in `IpcBootstrapReport.link_failures` so `doctor`
can surface it. No silent swallow: the dir still exists (consumers won't
crash), but the report row lets `doctor` tell "IPC not initialised" from
"IPC initialised, link degraded".

`ipc_root` itself must already be resolvable via `resolve_root("ipc",
ensure=True)`; this module does not re-implement writability checks.
"""

from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# Canonical drop-dir names per spec §"IPC protocol" lines 79-84.
DROP_DIRS: tuple[str, ...] = (
    "worker-out",
    "processing-in",
    "processing-out",
    "main-in",
)

# Consumer-view dir -> producer-view dir. When linked, consumer reads the
# same directory the producer writes to (spec note "usually symlink to X").
LINK_MAP: dict[str, str] = {
    "processing-in": "worker-out",
    "main-in": "processing-out",
}


@dataclass(frozen=True)
class IpcBootstrapReport:
    """Result of `bootstrap_ipc_dirs`.

    - `root`: the resolved `APP_IPC_ROOT`.
    - `created`: drop-dir names that did not exist before this call.
    - `existing`: drop-dir names already present.
    - `linked`: mapping of consumer-view -> producer-view for links actually
      installed this call (symlink or junction).
    - `link_kind`: mapping of consumer-view -> "symlink" | "junction" |
      "standalone" (standalone = link creation failed, dir stands alone).
    - `link_failures`: per-link error strings for `doctor` to surface.
    """

    root: Path
    created: tuple[str, ...]
    existing: tuple[str, ...]
    linked: dict[str, str] = field(default_factory=dict)
    link_kind: dict[str, str] = field(default_factory=dict)
    link_failures: dict[str, str] = field(default_factory=dict)


def _is_windows(platform: str | None) -> bool:
    return (platform or sys.platform).lower().startswith("win")


def _try_symlink(link: Path, target: Path) -> None:
    # `target_is_directory=True` matters on Windows; harmless elsewhere.
    os.symlink(target, link, target_is_directory=True)


def _try_junction(link: Path, target: Path) -> None:
    # `mklink /J` creates an NTFS junction, which does not require
    # SeCreateSymbolicLinkPrivilege. Requires shell=True because `mklink`
    # is a cmd builtin, not an exe.
    result = subprocess.run(  # noqa: S602 - cmd builtin, args are Path objects
        f'mklink /J "{link}" "{target}"',
        shell=True,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise OSError(result.stderr.strip() or "mklink /J failed")


def _install_link(
    link: Path,
    target: Path,
    *,
    platform: str | None,
) -> tuple[str, str | None]:
    """Attempt to link `link` -> `target`.

    Returns `(kind, failure_message)`. `kind` is one of "symlink",
    "junction", "standalone". `failure_message` is None on success.
    """
    # If link already exists and points at target, we're idempotent.
    if link.exists() or link.is_symlink():
        try:
            resolved = link.resolve(strict=False)
            if resolved == target.resolve(strict=False):
                if link.is_symlink():
                    return "symlink", None
                # Junction resolves like a real dir on Windows; treat as
                # junction when platform is Windows, otherwise standalone.
                return ("junction" if _is_windows(platform) else "standalone"), None
        except OSError:
            pass
        # Something is there that is not our link. Do not clobber user data.
        return "standalone", f"path already exists: {link}"

    try:
        _try_symlink(link, target)
        return "symlink", None
    except OSError as sym_err:
        if not _is_windows(platform):
            # No junction option outside Windows; degrade to standalone.
            try:
                link.mkdir(parents=True, exist_ok=True)
            except OSError as mk_err:
                raise AppError(
                    ErrorCode.E_IPC_WRITE_FAILED,
                    f"Cannot create IPC drop dir {link}: {mk_err}",
                    details={"Path": str(link)},
                ) from mk_err
            return "standalone", f"symlink failed: {sym_err}"
        try:
            _try_junction(link, target)
            return "junction", None
        except OSError as junc_err:
            try:
                link.mkdir(parents=True, exist_ok=True)
            except OSError as mk_err:
                raise AppError(
                    ErrorCode.E_IPC_WRITE_FAILED,
                    f"Cannot create IPC drop dir {link}: {mk_err}",
                    details={"Path": str(link)},
                ) from mk_err
            return (
                "standalone",
                f"symlink failed: {sym_err}; junction failed: {junc_err}",
            )


def bootstrap_ipc_dirs(
    ipc_root: Path | str,
    *,
    link_consumers: bool = True,
    platform: str | None = None,
) -> IpcBootstrapReport:
    """Materialise the four canonical IPC drop directories under `ipc_root`.

    When `link_consumers=True` (default), `processing-in` -> `worker-out`
    and `main-in` -> `processing-out` are installed as symlinks (junction
    fallback on Windows). If linking fails, the consumer dir stands alone
    and the failure is reported for `doctor` to surface.
    """
    root = Path(ipc_root)
    try:
        root.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise AppError(
            ErrorCode.E_IPC_WRITE_FAILED,
            f"Cannot create IPC root {root}: {exc}",
            details={"Path": str(root)},
        ) from exc

    created: list[str] = []
    existing: list[str] = []
    linked: dict[str, str] = {}
    link_kind: dict[str, str] = {}
    link_failures: dict[str, str] = {}

    # Producers first, so links can point at real dirs.
    producer_names = [n for n in DROP_DIRS if n not in LINK_MAP]
    consumer_names = [n for n in DROP_DIRS if n in LINK_MAP]

    for name in producer_names:
        path = root / name
        if path.exists():
            existing.append(name)
        else:
            try:
                path.mkdir(parents=True, exist_ok=True)
            except OSError as exc:
                raise AppError(
                    ErrorCode.E_IPC_WRITE_FAILED,
                    f"Cannot create IPC drop dir {path}: {exc}",
                    details={"Path": str(path)},
                ) from exc
            created.append(name)

    for name in consumer_names:
        path = root / name
        target = root / LINK_MAP[name]
        if not link_consumers:
            if path.exists():
                existing.append(name)
            else:
                try:
                    path.mkdir(parents=True, exist_ok=True)
                except OSError as exc:
                    raise AppError(
                        ErrorCode.E_IPC_WRITE_FAILED,
                        f"Cannot create IPC drop dir {path}: {exc}",
                        details={"Path": str(path)},
                    ) from exc
                created.append(name)
            link_kind[name] = "standalone"
            continue

        already = path.exists() or path.is_symlink()
        kind, failure = _install_link(path, target, platform=platform)
        link_kind[name] = kind
        if kind in ("symlink", "junction"):
            linked[name] = LINK_MAP[name]
        if failure is not None:
            link_failures[name] = failure
        if already:
            existing.append(name)
        else:
            created.append(name)

    return IpcBootstrapReport(
        root=root,
        created=tuple(created),
        existing=tuple(existing),
        linked=linked,
        link_kind=link_kind,
        link_failures=link_failures,
    )


__all__ = [
    "DROP_DIRS",
    "LINK_MAP",
    "IpcBootstrapReport",
    "bootstrap_ipc_dirs",
]
