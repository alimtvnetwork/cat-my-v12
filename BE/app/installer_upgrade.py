"""Plan 90 Step 128 - Upgrade-in-place decision planner + manifest backup.

Owning spec: ``spec/21-app/79-installer-retention-timing.md``
§"Upgrade lifecycle" (new subsection added in this step).

Root cause guarded (one sentence): Steps 105-127 shipped install and
uninstall but no path decided whether a second ``--install`` run
against a populated ``install.json`` is a legal upgrade, a
same-version reinstall, or an illegal downgrade, so any repeat run
either silently overwrote a newer install with an older one or
crashed on the ``init_manifest`` idempotency guard with no
operator-actionable signal.

This module is a PURE planner: given the on-disk manifest (or None
for a fresh box) and the release version being installed, it returns
one ``UpgradeDecision`` naming the action to take. The shell wrappers
call it BEFORE the plan renderer so an illegal downgrade fails fast
with ``E_INSTALL_DOWNGRADE_BLOCKED`` (exit 40) without touching any
byte on disk. ``backup_manifest`` is the only I/O function here and
is used only when the wrapper accepts the decision to upgrade or
reinstall.

Anchors:
- ``BE/app/install_manifest.py`` (Step 105): manifest reader/writer.
- ``BE/app/installer_plan.py`` (Steps 104/127): dispatched actions.
- ``spec/coding-guidelines/python.md``: typed boundaries, no bare except,
  <=15-line functions, positive if.
"""

from __future__ import annotations

import re
import shutil
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Final

from BE.app.install_manifest import (
    MANIFEST_FILENAME,
    InstallManifest,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


class UpgradeAction(StrEnum):
    """Decision emitted by :func:`plan_upgrade`."""

    FRESH_INSTALL = "fresh-install"
    UPGRADE = "upgrade"
    REINSTALL_SAME = "reinstall-same"
    DOWNGRADE_ALLOWED = "downgrade-allowed"


@dataclass(frozen=True)
class UpgradePolicy:
    """Caller policy toggles.

    * ``is_force_reinstall``: caller passed ``--force-reinstall``. Turns a
      same-version match from ``REINSTALL_SAME`` (no-op-ish) into an
      explicit re-lay-down of every action. Never turns a downgrade into
      an install.
    * ``is_downgrade_allowed``: caller passed ``--allow-downgrade``.
      Required to install a version strictly less than the recorded
      manifest. Without it, downgrades raise ``E_INSTALL_DOWNGRADE_BLOCKED``.
    """

    is_force_reinstall: bool = False
    is_downgrade_allowed: bool = False


@dataclass(frozen=True)
class UpgradeDecision:
    """Result of :func:`plan_upgrade`."""

    Action: UpgradeAction
    PriorVersion: str | None
    NewVersion: str
    Reason: str


_VERSION_RE: Final[re.Pattern[str]] = re.compile(
    r"^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].*)?$"
)


def parse_version(raw: str) -> tuple[int, int, int]:
    """Return ``(major, minor, patch)`` for a dotted version string.

    Accepts ``4.67.0``, ``v4.67``, ``4``, ``4.67.0-rc.1``. Missing
    components default to 0. Any other shape raises
    ``E_INSTALL_UPGRADE_INVALID`` so callers surface a typed error
    instead of a silent misparse.
    """
    if not isinstance(raw, str) or not raw.strip():
        raise AppError(
            code=ErrorCode.E_INSTALL_UPGRADE_INVALID,
            message="version string must be non-empty",
        )
    m = _VERSION_RE.match(raw.strip())
    if not m:
        raise AppError(
            code=ErrorCode.E_INSTALL_UPGRADE_INVALID,
            message=f"unparseable version {raw!r}; expected MAJOR[.MINOR[.PATCH]]",
        )
    return (
        int(m.group(1)),
        int(m.group(2) or 0),
        int(m.group(3) or 0),
    )


def _compare(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    if a == b:
        return 0
    if a > b:
        return 1
    return -1


def plan_upgrade(
    *,
    existing: InstallManifest | None,
    new_version: str,
    policy: UpgradePolicy = UpgradePolicy(),
) -> UpgradeDecision:
    """Decide the lifecycle action for installing ``new_version``.

    Contract (spec 79 §"Upgrade lifecycle"):

    * ``existing is None``      -> FRESH_INSTALL
    * new > prior               -> UPGRADE
    * new == prior              -> REINSTALL_SAME
      (unchanged even when ``is_force_reinstall`` is set: caller still
      sees the same enum but ``Reason`` distinguishes forced re-lay-down.
      Wrappers act on the flag; the decision is just the truth.)
    * new < prior, downgrade allowed  -> DOWNGRADE_ALLOWED
    * new < prior, downgrade blocked  -> raises E_INSTALL_DOWNGRADE_BLOCKED
    """
    new_parts = parse_version(new_version)
    if existing is None:
        return UpgradeDecision(
            Action=UpgradeAction.FRESH_INSTALL,
            PriorVersion=None,
            NewVersion=new_version,
            Reason="no prior manifest at install root",
        )
    prior_version = existing.AppVersion
    prior_parts = parse_version(prior_version)
    cmp = _compare(new_parts, prior_parts)
    if cmp > 0:
        return UpgradeDecision(
            Action=UpgradeAction.UPGRADE,
            PriorVersion=prior_version,
            NewVersion=new_version,
            Reason=f"upgrading from {prior_version} to {new_version}",
        )
    if cmp == 0:
        reason = (
            "same version; --force-reinstall requested"
            if policy.is_force_reinstall
            else "same version; re-run is a no-op unless --force-reinstall"
        )
        return UpgradeDecision(
            Action=UpgradeAction.REINSTALL_SAME,
            PriorVersion=prior_version,
            NewVersion=new_version,
            Reason=reason,
        )
    # cmp < 0: downgrade attempt
    if policy.is_downgrade_allowed is False:
        raise AppError(
            code=ErrorCode.E_INSTALL_DOWNGRADE_BLOCKED,
            message=(
                f"refusing to install {new_version} over recorded {prior_version}; "
                "pass --allow-downgrade to override"
            ),
        )
    return UpgradeDecision(
        Action=UpgradeAction.DOWNGRADE_ALLOWED,
        PriorVersion=prior_version,
        NewVersion=new_version,
        Reason=f"downgrade from {prior_version} to {new_version} explicitly allowed",
    )


def _backup_name(now: datetime) -> str:
    stamp = now.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
    return f"{MANIFEST_FILENAME}.bak.{stamp}"


def backup_manifest(
    install_root: Path,
    *,
    now: datetime | None = None,
) -> Path | None:
    """Copy ``install.json`` next to itself as ``install.json.bak.<UTC>``.

    Returns the backup path on success, or ``None`` if no manifest exists
    (fresh install has nothing to back up). Raises
    ``E_INSTALL_MANIFEST_UNWRITABLE`` when the copy fails so the wrapper
    can refuse to continue: an upgrade that cannot record a rollback
    snapshot is not an upgrade we are willing to run.
    """
    src = install_root / MANIFEST_FILENAME
    if not src.exists():
        return None
    ts = now if now is not None else datetime.now(tz=UTC)
    if ts.tzinfo is None:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_INVALID,
            message="backup timestamp must be timezone-aware (UTC)",
        )
    dst = install_root / _backup_name(ts)
    try:
        shutil.copy2(src, dst)
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_INSTALL_MANIFEST_UNWRITABLE,
            message=f"cannot write manifest backup {dst}: {exc}",
            cause=exc,
        ) from exc
    return dst


__all__ = [
    "UpgradeAction",
    "UpgradePolicy",
    "UpgradeDecision",
    "parse_version",
    "plan_upgrade",
    "backup_manifest",
]
