"""Plan 90 Step 104 - Top-level installer action planner.

Owning spec: ``spec/21-app/79-installer-retention-timing.md`` §"Orchestrator"
(new subsection added in this step).

Root cause guarded (one sentence): Step 103 shipped the retention registrar
scripts but no top-level installer invoked them, so a fresh install still
left the timer unregistered and a top-level ``--uninstall`` orphaned the
Scheduled Task / systemd unit.

This module is a PURE planner: it returns the ordered list of steps the
platform-specific installer scripts (``packaging/installers/install.ps1``
and ``install.sh``) must execute. Keeping the plan pure means:

* The invariants ("retention registrar is last on install, first on
  uninstall") are pytest-verifiable without spawning subprocesses.
* Both shell wrappers execute the SAME plan, so Windows and POSIX can
  never drift.
* Adding a new install step in a later plan-90 step (e.g. Step 108
  service registration) requires touching one module, not two shell
  scripts.

Anchors:
- ``spec/21-app/77-cli-powershell-and-release.md`` §"PowerShell installer"
- ``spec/21-app/79-installer-retention-timing.md``
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §12 (wrapper exit codes)
- ``spec/coding-guidelines/python.md`` (typed boundaries, PascalCase codes)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Final

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


class InstallerPhase(str, Enum):
    """Which orchestrator direction this plan describes."""

    INSTALL = "install"
    UNINSTALL = "uninstall"


class InstallerPlatform(str, Enum):
    """Target platform for the plan. `posix` covers Linux + macOS."""

    WINDOWS = "windows"
    POSIX = "posix"


@dataclass(frozen=True)
class InstallerAction:
    """One ordered step the shell wrapper must execute.

    Attributes
    ----------
    name:
        Stable identifier ("retention-timer", "db-bootstrap", ...). Used
        by ``install.json`` manifest writers in Step 105 and by tests.
    script:
        Path relative to repo root of the script to invoke.
    args:
        Arguments forwarded verbatim.
    critical:
        If True, a non-zero exit stops the orchestrator. If False, the
        orchestrator logs the failure and continues (used for uninstall
        steps that must be idempotent).
    """

    name: str
    script: str
    args: tuple[str, ...]
    critical: bool


_RETENTION_ACTION_NAME: Final[str] = "retention-timer"
_DB_BOOTSTRAP_ACTION_NAME: Final[str] = "db-bootstrap"
_PATH_LINK_ACTION_NAME: Final[str] = "path-link"

_WINDOWS_RETENTION_SCRIPT: Final[str] = "scripts/ps/Register-RetentionTask.ps1"
_POSIX_RETENTION_SCRIPT: Final[str] = "scripts/systemd/install-retention-timer.sh"

_WINDOWS_DB_BOOTSTRAP: Final[str] = "scripts/ps/Invoke-DbBootstrap.ps1"
_POSIX_DB_BOOTSTRAP: Final[str] = "bin/db-bootstrap.py"

# Path-link CLI is platform-neutral; both wrappers invoke it via the venv python.
_PATH_LINK_SCRIPT: Final[str] = "bin/install-path-link.py"

_INTERVAL_MIN: Final[int] = 1
_INTERVAL_MAX: Final[int] = 168
_RETENTION_DAYS_MIN: Final[int] = 1
_RETENTION_DAYS_MAX: Final[int] = 3650


def _require_int_in_range(
    name: str, value: object, low: int, high: int
) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message=f"{name} must be an int, got {type(value).__name__}",
        )
    if value < low or value > high:
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message=f"{name} must be in [{low}, {high}], got {value}",
        )
    return value


def _retention_action(
    *, platform: InstallerPlatform, phase: InstallerPhase,
    interval_hours: int, retention_days: int,
) -> InstallerAction:
    if platform is InstallerPlatform.WINDOWS:
        script = _WINDOWS_RETENTION_SCRIPT
        flag = "-Install" if phase is InstallerPhase.INSTALL else "-Uninstall"
        args: tuple[str, ...] = (flag,)
        if phase is InstallerPhase.INSTALL:
            args = args + (
                "-IntervalHours", str(interval_hours),
                "-RetentionDays", str(retention_days),
            )
    else:
        script = _POSIX_RETENTION_SCRIPT
        args = ("--install",) if phase is InstallerPhase.INSTALL else ("--uninstall",)

    # Uninstall must never abort the orchestrator: if the timer is
    # already gone, the wrapper's own idempotent path handles it, but
    # we still want the rest of the uninstall (db-bootstrap teardown
    # in Step 106+) to run.
    critical = phase is InstallerPhase.INSTALL
    return InstallerAction(
        name=_RETENTION_ACTION_NAME,
        script=script,
        args=args,
        critical=critical,
    )


def _db_bootstrap_action(
    *, platform: InstallerPlatform,
) -> InstallerAction:
    script = (
        _WINDOWS_DB_BOOTSTRAP
        if platform is InstallerPlatform.WINDOWS
        else _POSIX_DB_BOOTSTRAP
    )
    return InstallerAction(
        name=_DB_BOOTSTRAP_ACTION_NAME,
        script=script,
        args=(),
        critical=True,
    )


def _path_link_action(
    *, platform: InstallerPlatform, phase: InstallerPhase,
    binaries_dir: str | None,
) -> InstallerAction:
    """Emit the Step-126 PATH-link CLI action.

    Install phase requires ``binaries_dir`` so ``install-path-link.py
    install --binaries-dir <dir>`` can locate the source ``.exe`` /
    ELF payloads (Step 125 already made this mandatory on install).
    Uninstall never needs it: the CLI only reads ``LinkPath`` from the
    per-user link dir.
    """
    platform_flag = (
        "windows" if platform is InstallerPlatform.WINDOWS else "posix"
    )
    if phase is InstallerPhase.INSTALL:
        if not binaries_dir or not isinstance(binaries_dir, str):
            raise AppError(
                code=ErrorCode.E_CLI_USAGE,
                message=(
                    "binaries_dir is required for INSTALL phase so the "
                    "path-link action can resolve source exes"
                ),
            )
        args: tuple[str, ...] = (
            "install",
            "--binaries-dir", binaries_dir,
            "--platform", platform_flag,
        )
        critical = True
    else:
        args = ("uninstall", "--platform", platform_flag)
        # Uninstall stays idempotent: a missing link dir is not fatal to
        # the surrounding db-bootstrap teardown.
        critical = False
    return InstallerAction(
        name=_PATH_LINK_ACTION_NAME,
        script=_PATH_LINK_SCRIPT,
        args=args,
        critical=critical,
    )


def plan_install_actions(
    *,
    platform: InstallerPlatform,
    phase: InstallerPhase,
    interval_hours: int = 24,
    retention_days: int = 30,
    binaries_dir: str | None = None,
) -> list[InstallerAction]:
    """Return the ordered list of installer actions.

    Ordering contract (see spec 79 §"Orchestrator" + spec 77 §"PATH linking"):

    * INSTALL: db-bootstrap FIRST (retention writer needs schema),
      path-link MIDDLE (shims must exist before any scheduled task can
      resolve the binary by short name), retention-timer LAST
      (registrar must not run until every prior step succeeded so the
      loop never launches against a half-installed system).
    * UNINSTALL: retention-timer FIRST (stop the loop before removing
      the shims / schema it writes to), path-link MIDDLE (remove shims
      before the schema they reference vanishes), db-bootstrap LAST.
      retention-timer and path-link are non-critical on uninstall so
      an already-gone shim or task can never block schema teardown.
    """
    _require_int_in_range(
        "interval_hours", interval_hours, _INTERVAL_MIN, _INTERVAL_MAX
    )
    _require_int_in_range(
        "retention_days", retention_days,
        _RETENTION_DAYS_MIN, _RETENTION_DAYS_MAX,
    )
    if not isinstance(platform, InstallerPlatform):
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message=f"platform must be InstallerPlatform, got {type(platform).__name__}",
        )
    if not isinstance(phase, InstallerPhase):
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message=f"phase must be InstallerPhase, got {type(phase).__name__}",
        )

    bootstrap = _db_bootstrap_action(platform=platform)
    path_link = _path_link_action(
        platform=platform, phase=phase, binaries_dir=binaries_dir,
    )
    retention = _retention_action(
        platform=platform, phase=phase,
        interval_hours=interval_hours, retention_days=retention_days,
    )

    if phase is InstallerPhase.INSTALL:
        return [bootstrap, path_link, retention]
    # Uninstall: stop the loop first, remove shims, then tear down schema.
    return [retention, path_link, bootstrap]

