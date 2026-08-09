#!/usr/bin/env bash
# Plan 90 Step 103 - Install / uninstall the vision-app retention timer
# as a systemd USER unit under ~/.config/systemd/user/.
#
# Anchors:
#   spec/21-app/79-installer-retention-timing.md
#   spec/21-app/78-retention-schedule.md
#
# Idempotent: --install twice is a no-op; --uninstall twice is a no-op.
# Exit codes:
#   0  success
#   2  invalid usage / knob out of range (surfaced from Python renderer)
#   4  systemctl call failed
#   9  template missing

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SERVICE_NAME="vision-app-retention.service"
TIMER_NAME="vision-app-retention.timer"

INTERVAL_HOURS="${APP_RETENTION_INTERVAL_HOURS:-24}"
RETENTION_DAYS="${APP_RETENTION_DAYS:-30}"
APP_DATA_ROOT="${APP_DATA_ROOT:-$HOME/.local/share/vision-app}"
PYTHON_EXE="${PYTHON_EXE:-$REPO_ROOT/.venv/bin/python}"
RETENTION_SCRIPT="${RETENTION_SCRIPT:-$REPO_ROOT/bin/retention-run.py}"

usage() {
    cat <<EOF
Usage: $0 --install | --uninstall | --status
Env overrides: APP_RETENTION_INTERVAL_HOURS, APP_RETENTION_DAYS,
               APP_DATA_ROOT, PYTHON_EXE, RETENTION_SCRIPT
EOF
}

render() {
    local kind="$1"
    "$PYTHON_EXE" - <<PY
from BE.app.retention_installer import (
    render_systemd_service, render_systemd_timer,
)
kind = "$kind"
if kind == "service":
    print(render_systemd_service(
        python_exe="$PYTHON_EXE",
        retention_script="$RETENTION_SCRIPT",
        app_data_root="$APP_DATA_ROOT",
        interval_hours=$INTERVAL_HOURS,
        retention_days=$RETENTION_DAYS,
    ), end="")
elif kind == "timer":
    print(render_systemd_timer(
        interval_hours=$INTERVAL_HOURS,
        app_data_root="$APP_DATA_ROOT",
    ), end="")
else:
    raise SystemExit(2)
PY
}

do_install() {
    [ -f "$RETENTION_SCRIPT" ] || { echo "[9] retention script missing: $RETENTION_SCRIPT" >&2; exit 9; }
    [ -x "$PYTHON_EXE" ]       || { echo "[9] python missing: $PYTHON_EXE" >&2; exit 9; }

    mkdir -p "$UNIT_DIR"
    render service > "$UNIT_DIR/$SERVICE_NAME"
    render timer   > "$UNIT_DIR/$TIMER_NAME"
    chmod 0644 "$UNIT_DIR/$SERVICE_NAME" "$UNIT_DIR/$TIMER_NAME"

    if ! command -v systemctl >/dev/null 2>&1; then
        echo "[warn] systemctl not found; units installed but not enabled." >&2
        return 0
    fi
    systemctl --user daemon-reload || { echo "[4] daemon-reload failed" >&2; exit 4; }
    systemctl --user enable --now "$TIMER_NAME" || { echo "[4] enable --now failed" >&2; exit 4; }
    echo "[ok] $TIMER_NAME installed and started."
    echo "[hint] run 'loginctl enable-linger $USER' to start at boot before login."
}

do_uninstall() {
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --user disable --now "$TIMER_NAME" 2>/dev/null || true
    fi
    rm -f "$UNIT_DIR/$SERVICE_NAME" "$UNIT_DIR/$TIMER_NAME"
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --user daemon-reload || true
    fi
    echo "[ok] $TIMER_NAME uninstalled."
}

do_status() {
    command -v systemctl >/dev/null 2>&1 || { echo "systemctl missing" >&2; exit 4; }
    systemctl --user status "$TIMER_NAME" --no-pager || true
    systemctl --user list-timers "$TIMER_NAME" --no-pager || true
}

case "${1:-}" in
    --install)   do_install ;;
    --uninstall) do_uninstall ;;
    --status)    do_status ;;
    -h|--help|"") usage ;;
    *) usage; exit 2 ;;
esac
