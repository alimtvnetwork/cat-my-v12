"""Plan 90 Step 103 - retention installer template renderers.

Owning module: ``BE/app/retention_installer.py``.
Spec: ``spec/21-app/79-installer-retention-timing.md``.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

import pytest

from BE.app.retention_installer import (
    render_systemd_service,
    render_systemd_timer,
    render_windows_task_xml,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# ---------------------------------------------------------------------------
# systemd .service
# ---------------------------------------------------------------------------

def test_systemd_service_contains_command_line_and_env():
    out = render_systemd_service(
        python_exe="/opt/vision/.venv/bin/python",
        retention_script="/opt/vision/bin/retention-run.py",
        app_data_root="/var/lib/vision-app",
        interval_hours=6,
        retention_days=45,
    )
    assert "ExecStart=/opt/vision/.venv/bin/python /opt/vision/bin/retention-run.py --loop --interval-hours 6 --retention-days 45" in out
    assert "Environment=APP_DATA_ROOT=/var/lib/vision-app" in out
    assert "KillSignal=SIGTERM" in out
    assert "${" not in out  # no unresolved placeholders


def test_systemd_service_rejects_bool_interval():
    with pytest.raises(AppError) as ei:
        render_systemd_service(
            python_exe="/x", retention_script="/y", app_data_root="/z",
            interval_hours=True,  # type: ignore[arg-type]
        )
    assert ei.value.code is ErrorCode.E_CLI_USAGE


@pytest.mark.parametrize("bad", [0, -1, 169, 200])
def test_systemd_service_rejects_interval_out_of_range(bad):
    with pytest.raises(AppError):
        render_systemd_service(
            python_exe="/x", retention_script="/y", app_data_root="/z",
            interval_hours=bad,
        )


@pytest.mark.parametrize("bad", [0, -5, 3651])
def test_systemd_service_rejects_retention_days_out_of_range(bad):
    with pytest.raises(AppError):
        render_systemd_service(
            python_exe="/x", retention_script="/y", app_data_root="/z",
            retention_days=bad,
        )


@pytest.mark.parametrize("bad", ["a<b", 'a"b', "a>b", "a\x00b"])
def test_systemd_service_rejects_injection_chars(bad):
    with pytest.raises(AppError):
        render_systemd_service(
            python_exe=bad, retention_script="/y", app_data_root="/z",
        )


# ---------------------------------------------------------------------------
# systemd .timer
# ---------------------------------------------------------------------------

def test_systemd_timer_pins_cadence_and_jitter():
    out = render_systemd_timer(interval_hours=6, randomized_delay_min=10)
    assert "OnUnitActiveSec=6h" in out
    assert "RandomizedDelaySec=10min" in out
    assert "OnBootSec=2min" in out
    assert "Persistent=true" in out


def test_systemd_timer_default_delay():
    out = render_systemd_timer(interval_hours=24)
    assert "RandomizedDelaySec=10min" in out


@pytest.mark.parametrize("bad", [-1, 61, True])
def test_systemd_timer_rejects_bad_delay(bad):
    with pytest.raises(AppError):
        render_systemd_timer(interval_hours=24, randomized_delay_min=bad)


# ---------------------------------------------------------------------------
# Windows Task XML
# ---------------------------------------------------------------------------

def test_windows_task_xml_is_parseable_and_contains_command_line():
    out = render_windows_task_xml(
        pwsh_exe=r"C:\Program Files\PowerShell\7\pwsh.exe",
        wrapper_script=r"C:\Program Files\vision-app\scripts\ps\Invoke-RetentionRun.ps1",
        interval_hours=12,
        retention_days=30,
    )
    root = ET.fromstring(out)
    ns = {"t": "http://schemas.microsoft.com/windows/2004/02/mit/task"}

    cmd = root.find(".//t:Actions/t:Exec/t:Command", ns)
    args = root.find(".//t:Actions/t:Exec/t:Arguments", ns)
    assert cmd is not None and args is not None
    assert cmd.text == r"C:\Program Files\PowerShell\7\pwsh.exe"
    assert args.text is not None
    assert "-NoProfile" in args.text
    assert "-ExecutionPolicy Bypass" in args.text
    assert "-File" in args.text
    assert "Invoke-RetentionRun.ps1" in args.text
    assert "--loop" in args.text
    assert "--interval-hours 12" in args.text
    assert "--retention-days 30" in args.text

    # Both triggers present so the loop restarts on logon and boot.
    assert root.find(".//t:Triggers/t:LogonTrigger", ns) is not None
    assert root.find(".//t:Triggers/t:BootTrigger", ns) is not None


def test_windows_task_xml_rejects_xml_injection():
    for bad in ('a"b', "a<b", "a>b", "a\x00b"):
        with pytest.raises(AppError):
            render_windows_task_xml(
                pwsh_exe=bad,
                wrapper_script=r"C:\w.ps1",
                interval_hours=24,
                retention_days=30,
            )


@pytest.mark.parametrize("hours,days", [(0, 30), (169, 30), (24, 0), (24, 3651)])
def test_windows_task_xml_rejects_out_of_range(hours, days):
    with pytest.raises(AppError):
        render_windows_task_xml(
            pwsh_exe=r"C:\pwsh.exe", wrapper_script=r"C:\w.ps1",
            interval_hours=hours, retention_days=days,
        )


def test_windows_task_xml_no_unresolved_placeholders():
    out = render_windows_task_xml(
        pwsh_exe=r"C:\pwsh.exe", wrapper_script=r"C:\w.ps1",
        interval_hours=1, retention_days=1,
    )
    assert "${" not in out

