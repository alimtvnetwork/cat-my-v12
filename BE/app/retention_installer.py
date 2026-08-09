"""Plan 90 Step 103 - Retention timer template renderers.

Owning spec: ``spec/21-app/79-installer-retention-timing.md``.

Pure string renderers for the systemd user unit + timer and the Windows
Scheduled Task XML. No filesystem access, no subprocess calls: those
belong to the installer wrappers (``scripts/ps/Register-RetentionTask.ps1``
and ``scripts/systemd/install-retention-timer.sh``). Keeping the render
step pure lets tests pin exact substrings and lets CI diff templates
release-to-release.

Root cause guarded: pre-Step-103, Step 102's ``retention-run --loop``
existed but nothing launched it on operator machines. Real deployments
kept the pre-Step-101 unbounded-growth footgun.
"""

from __future__ import annotations

from pathlib import Path
from typing import Final

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_TEMPLATES_DIR: Final[Path] = Path(__file__).resolve().parents[2] / "packaging"

_SYSTEMD_SERVICE_TMPL: Final[Path] = (
    _TEMPLATES_DIR / "systemd" / "vision-app-retention.service.tmpl"
)
_SYSTEMD_TIMER_TMPL: Final[Path] = (
    _TEMPLATES_DIR / "systemd" / "vision-app-retention.timer.tmpl"
)
_WIN_TASK_TMPL: Final[Path] = (
    _TEMPLATES_DIR / "windows" / "vision-app-retention-task.xml.tmpl"
)

_INTERVAL_MIN: Final[int] = 1
_INTERVAL_MAX: Final[int] = 168
_RETENTION_DAYS_MIN: Final[int] = 1
_RETENTION_DAYS_MAX: Final[int] = 3650
_DELAY_MIN: Final[int] = 0
_DELAY_MAX: Final[int] = 60

# XML/shell injection guard: reject characters that would let a template
# variable break out of its attribute or command context. NUL is banned
# universally because it truncates strings in the underlying C APIs.
_FORBIDDEN_PATH_CHARS: Final[tuple[str, ...]] = ("\x00", "<", ">", '"')


def _require_int_in_range(
    name: str, value: object, low: int, high: int
) -> int:
    # ``bool`` is an ``int`` subclass in Python; reject it explicitly so
    # ``True`` cannot smuggle in as ``1`` and pass validation silently.
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


def _require_path_str(name: str, value: object) -> str:
    if not isinstance(value, str) or not value:
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message=f"{name} must be a non-empty string",
        )
    for ch in _FORBIDDEN_PATH_CHARS:
        if ch in value:
            raise AppError(
                code=ErrorCode.E_CLI_USAGE,
                message=f"{name} contains forbidden character {ch!r}",
            )
    return value


def _load(template_path: Path) -> str:
    try:
        return template_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message=f"template not readable: {template_path}",
        ) from exc


def _substitute(template: str, mapping: dict[str, str]) -> str:
    out = template
    for key, val in mapping.items():
        out = out.replace("${" + key + "}", val)
    if "${" in out:
        # Any surviving ${...} means we forgot a substitution; emit a
        # loud failure rather than shipping a broken unit file.
        raise AppError(
            code=ErrorCode.E_CLI_USAGE,
            message="unresolved template placeholder(s) remain",
        )
    return out


def render_systemd_service(
    *, python_exe: str, retention_script: str,
    app_data_root: str, interval_hours: int = 24,
    retention_days: int = 30,
) -> str:
    """Render the systemd `.service` unit as a UTF-8 string."""
    py = _require_path_str("python_exe", python_exe)
    script = _require_path_str("retention_script", retention_script)
    root = _require_path_str("app_data_root", app_data_root)
    ih = _require_int_in_range(
        "interval_hours", interval_hours, _INTERVAL_MIN, _INTERVAL_MAX
    )
    rd = _require_int_in_range(
        "retention_days", retention_days,
        _RETENTION_DAYS_MIN, _RETENTION_DAYS_MAX,
    )
    return _substitute(
        _load(_SYSTEMD_SERVICE_TMPL),
        {
            "PYTHON_EXE": py,
            "RETENTION_SCRIPT": script,
            "APP_DATA_ROOT": root,
            "INTERVAL_HOURS": str(ih),
            "RETENTION_DAYS": str(rd),
        },
    )


def render_systemd_timer(
    *, interval_hours: int, app_data_root: str = "/var/lib/vision-app",
    randomized_delay_min: int = 10,
) -> str:
    """Render the systemd `.timer` unit as a UTF-8 string."""
    ih = _require_int_in_range(
        "interval_hours", interval_hours, _INTERVAL_MIN, _INTERVAL_MAX
    )
    dm = _require_int_in_range(
        "randomized_delay_min", randomized_delay_min, _DELAY_MIN, _DELAY_MAX
    )
    root = _require_path_str("app_data_root", app_data_root)
    return _substitute(
        _load(_SYSTEMD_TIMER_TMPL),
        {
            "INTERVAL_HOURS": str(ih),
            "RANDOMIZED_DELAY_MIN": str(dm),
            "APP_DATA_ROOT": root,
        },
    )


def render_windows_task_xml(
    *, pwsh_exe: str, wrapper_script: str,
    interval_hours: int, retention_days: int,
    author: str = "vision-app installer",
) -> str:
    """Render the Windows Scheduled Task XML as a UTF-8 string.

    The task invokes the PowerShell wrapper
    ``scripts/ps/Invoke-RetentionRun.ps1`` (Plan 90 Step 113) so scheduled
    runs inherit the wrapper's venv-resolution and stderr-logging
    discipline instead of shelling straight into ``python``.

    The on-disk file must be UTF-16 for ``schtasks /Create /XML``; the
    installer wrapper is responsible for the final encoding conversion.
    Here we return UTF-8 so tests can diff strings directly.
    """
    py = _require_path_str("pwsh_exe", pwsh_exe)
    script = _require_path_str("wrapper_script", wrapper_script)
    author_s = _require_path_str("author", author)
    ih = _require_int_in_range(
        "interval_hours", interval_hours, _INTERVAL_MIN, _INTERVAL_MAX
    )
    rd = _require_int_in_range(
        "retention_days", retention_days,
        _RETENTION_DAYS_MIN, _RETENTION_DAYS_MAX,
    )
    return _substitute(
        _load(_WIN_TASK_TMPL),
        {
            "PWSH_EXE": py,
            "WRAPPER_SCRIPT": script,
            "INTERVAL_HOURS": str(ih),
            "RETENTION_DAYS": str(rd),
            "AUTHOR": author_s,
        },
    )

