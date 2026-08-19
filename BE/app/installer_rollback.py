"""Plan 90 Step 130 - Rollback-on-critical-failure module.

Owning spec: ``spec/21-app/79-installer-retention-timing.md``
§"Upgrade lifecycle" (subsection "Rollback on critical failure").

Root cause guarded (one sentence): Step 129 shipped the upgrade planner
and manifest backup CLI end-to-end but nothing consumed the
``BackupPath`` when a subsequent CRITICAL install action failed, so a
half-applied upgrade left ``install.json`` recording partial success and
the operator with no supported path back to the prior good state, only
manual JSON surgery.

This module is a PURE planner + I/O boundary:

* :func:`plan_rollback` inspects the current on-disk manifest against
  the pre-upgrade backup snapshot and returns a
  :class:`RollbackDecision` naming which recorded actions were added
  by the failed upgrade attempt (i.e. present in ``current`` but not in
  ``backup``) and MUST therefore be reversed before restore. It performs
  NO I/O and never mutates disk.
* :func:`restore_manifest` atomically replaces ``install.json`` with the
  contents of the named backup file via same-dir tmp + ``os.replace``.
  On any failure it raises :class:`AppError` with
  ``E_INSTALL_ROLLBACK_FAILED`` so wrappers surface one typed exit code
  instead of a stack trace.

Deliberate non-scope for this step (matches the Step 126/128 pattern:
ship the pure module + CLI, wire wrappers next step):

* No wrapper wiring. ``install.sh``/``install.ps1`` still exit on the
  first critical failure without invoking rollback; Step 131 threads
  ``bin/install-rollback.py`` into the per-action loop's failure path.
* No reversal of the failed action's side-effects on disk (shims,
  scheduled tasks, DB rows). That is Step 132 and is a strict superset:
  it needs the reversed-action list this module already produces.

Anchors:
- ``BE/app/installer_upgrade.py`` (Step 128): produces the backup path.
- ``BE/app/install_manifest.py`` (Step 105): manifest reader/writer +
  atomic-write primitive we mirror here.
- ``spec/coding-guidelines/python.md``: typed boundaries, no bare except,
  positive if, small pure functions.
"""

from __future__ import annotations

import contextlib
import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from BE.app.install_manifest import (
    MANIFEST_FILENAME,
    InstallManifest,
    read_manifest,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


@dataclass(frozen=True)
class RollbackDecision:
    """Result of :func:`plan_rollback`.

    * ``FailedAction``: the critical action whose failure triggered the
      rollback (informational; carried through so the CLI can log it).
    * ``ActionsToReverse``: names of actions recorded in ``current`` that
      were not present in ``backup``. Ordered newest-first so the
      wrapper's reverse loop unwinds in strict LIFO of application.
    * ``PriorVersion`` / ``CurrentVersion``: the ``AppVersion`` fields on
      the two manifests. Equal on a same-version reinstall attempt.
    * ``BackupPath``: absolute path of the backup snapshot to restore.
    """

    FailedAction: str
    ActionsToReverse: tuple[str, ...]
    PriorVersion: str
    CurrentVersion: str
    BackupPath: str


def _action_signatures(manifest: InstallManifest) -> list[tuple[str, str]]:
    """Return ``(Name, StartedAt)`` tuples in manifest order.

    ``StartedAt`` disambiguates repeat entries for the same ``Name`` (a
    re-run of ``retention-timer`` for instance) so set-difference against
    the backup is precise, not just name-based.
    """
    out: list[tuple[str, str]] = []
    for entry in manifest.Actions:
        name = str(entry.get("Name", ""))
        started = str(entry.get("StartedAt", ""))
        if name:
            out.append((name, started))
    return out


def plan_rollback(
    *,
    current: InstallManifest,
    backup: InstallManifest,
    failed_action: str,
    backup_path: Path,
) -> RollbackDecision:
    """Decide which actions the failed upgrade added on top of ``backup``.

    Contract:

    * The set of ``(Name, StartedAt)`` tuples in ``current`` MUST be a
      superset of the set in ``backup``. Otherwise the current manifest
      has diverged from the backup in ways this planner cannot reason
      about (someone edited history), and we raise
      ``E_INSTALL_ROLLBACK_FAILED`` rather than silently reverse the
      wrong entries.
    * ``failed_action`` MUST be non-empty. An empty name would produce a
      useless log line and hides the wrapper bug that supplied it.
    """
    if not failed_action or not failed_action.strip():
        raise AppError(
            code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
            message="failed_action must be a non-empty action name",
        )
    cur_sigs = _action_signatures(current)
    bak_sigs = set(_action_signatures(backup))
    for sig in bak_sigs:
        if sig not in cur_sigs:
            raise AppError(
                code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
                message=(
                    f"backup action {sig!r} missing from current manifest; "
                    "refusing to rollback against a diverged history"
                ),
            )
    added = [sig for sig in cur_sigs if sig not in bak_sigs]
    reverse_names = tuple(name for name, _ in reversed(added))
    return RollbackDecision(
        FailedAction=failed_action,
        ActionsToReverse=reverse_names,
        PriorVersion=str(backup.AppVersion),
        CurrentVersion=str(current.AppVersion),
        BackupPath=str(backup_path),
    )


def _atomic_replace(target: Path, payload_bytes: bytes) -> None:
    fd, tmp_str = tempfile.mkstemp(
        prefix=".install.json.", suffix=".rollback.tmp", dir=str(target.parent)
    )
    tmp_path = Path(tmp_str)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(payload_bytes)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, target)
    except BaseException:
        with contextlib.suppress(OSError):
            tmp_path.unlink()
        raise


def restore_manifest(install_root: Path, backup_path: Path) -> Path:
    """Atomically replace ``install.json`` with the contents of ``backup_path``.

    Returns the restored manifest path on success. Raises
    ``E_INSTALL_ROLLBACK_FAILED`` when the backup is missing, unreadable,
    not valid JSON, or the atomic replace fails. We deliberately do NOT
    fall back to the current file - a rollback that cannot complete must
    surface loudly, not silently continue.
    """
    if not backup_path.exists():
        raise AppError(
            code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
            message=f"backup manifest not found at {backup_path}",
        )
    try:
        raw = backup_path.read_bytes()
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
            message=f"cannot read backup manifest {backup_path}: {exc}",
            cause=exc,
        ) from exc
    try:
        parsed: Any = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
            message=f"backup manifest {backup_path} is not valid JSON: {exc}",
            cause=exc,
        ) from exc
    if not isinstance(parsed, dict):
        raise AppError(
            code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
            message=f"backup manifest {backup_path} root must be an object",
        )
    target = install_root / MANIFEST_FILENAME
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        _atomic_replace(target, raw)
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
            message=f"cannot restore manifest to {target}: {exc}",
            cause=exc,
        ) from exc
    return target


def load_backup(backup_path: Path) -> InstallManifest:
    """Read + validate the backup manifest as an :class:`InstallManifest`.

    Wraps :func:`read_manifest` so callers get a single typed error code
    (``E_INSTALL_ROLLBACK_FAILED``) instead of the raw
    ``E_INSTALL_MANIFEST_*`` family - the rollback boundary owns the
    error surface, the manifest module owns the schema.
    """
    if not backup_path.exists():
        raise AppError(
            code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
            message=f"backup manifest not found at {backup_path}",
        )
    tmp_dir = backup_path.parent / f".rollback-view-{os.getpid()}"
    try:
        tmp_dir.mkdir(parents=True, exist_ok=True)
        staged = tmp_dir / MANIFEST_FILENAME
        try:
            staged.write_bytes(backup_path.read_bytes())
        except OSError as exc:
            raise AppError(
                code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
                message=f"cannot stage backup for read: {exc}",
                cause=exc,
            ) from exc
        try:
            m = read_manifest(tmp_dir)
        except AppError as exc:
            raise AppError(
                code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
                message=f"backup manifest {backup_path} invalid: {exc.message}",
                cause=exc,
            ) from exc
        if m is None:
            raise AppError(
                code=ErrorCode.E_INSTALL_ROLLBACK_FAILED,
                message=f"backup manifest {backup_path} vanished during read",
            )
        return m
    finally:
        try:
            staged = tmp_dir / MANIFEST_FILENAME
            if staged.exists():
                staged.unlink()
            tmp_dir.rmdir()
        except OSError:
            pass


__all__ = [
    "RollbackDecision",
    "plan_rollback",
    "restore_manifest",
    "load_backup",
]
