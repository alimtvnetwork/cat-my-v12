#!/usr/bin/env bash
# run.sh - Launcher script for Backend Implementation v1
# Ports, browser launch, and health timeout come from run.config.json when present; CLI flags override.

# Defaults
BE_PORT=8787
FE_PORT=8080
BE_HOST="127.0.0.1"
NO_SHELL=0
BE_PORT_SET=0
FE_PORT_SET=0

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --be-port) BE_PORT="$2"; BE_PORT_SET=1; shift ;;
        --fe-port) FE_PORT="$2"; FE_PORT_SET=1; shift ;;
        --host) BE_HOST="$2"; shift ;;
        --no-shell) NO_SHELL=1 ;;
        --help|-h)
            echo "Usage: ./run.sh [options]"
            echo "Options:"
            echo "  --be-port PORT    Port for backend (default: 8787)"
            echo "  --fe-port PORT    Port for frontend (default: 8080)"
            echo "  --host IP         Host to bind backend (default: 127.0.0.1). WARNING: Do not use 0.0.0.0 in non-dev environments."
            echo "  --no-shell        Skip launching Chromium shell"
            echo "  --help, -h        Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# run.config.json is the single port / browser / timeout table. CLI flags
# win over config values; a missing or unreadable config keeps defaults.
OPEN_BROWSER="true"
HEALTH_TIMEOUT=30
config_value() {
    local key="$1"
    local py=""
    if command -v python3 >/dev/null 2>&1; then py="python3";
    elif command -v python >/dev/null 2>&1; then py="python"; fi
    if [ -n "$py" ] && [ -f "run.config.json" ]; then
        "$py" -c "import json,sys; d=json.load(open('run.config.json')); v=d.get('$key'); print('' if v is None else (str(v).lower() if isinstance(v,bool) else v))" 2>/dev/null
    fi
}
if [ -f "run.config.json" ]; then
    _cfg_fe_port="$(config_value fePort)"
    _cfg_be_port="$(config_value bePort)"
    _cfg_open_browser="$(config_value openBrowser)"
    _cfg_timeout="$(config_value healthTimeoutSeconds)"
    if [ "$BE_PORT_SET" -eq 0 ] && [ -n "$_cfg_be_port" ]; then BE_PORT="$_cfg_be_port"; fi
    if [ "$FE_PORT_SET" -eq 0 ] && [ -n "$_cfg_fe_port" ]; then FE_PORT="$_cfg_fe_port"; fi
    if [ -n "$_cfg_open_browser" ]; then OPEN_BROWSER="$_cfg_open_browser"; fi
    if [ -n "$_cfg_timeout" ]; then HEALTH_TIMEOUT="$_cfg_timeout"; fi
    echo "Using run.config.json (fePort=$FE_PORT, bePort=$BE_PORT, openBrowser=$OPEN_BROWSER)."
fi
# Enable job control for cleanup
set -m

PIDS=()

# Cleanup function to kill child processes
cleanup() {
    local status=$?
    echo ""
    echo "Shutting down..."
    # Kill the whole process group (uv run -> uvicorn, bun run -> vite/node
    # children live in the job's group under 'set -m'); plain PID kills
    # leave those children orphaned on the ports.
    local signaled=0
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null
            signaled=1
        fi
    done
    if [ "$signaled" -eq 1 ]; then
        sleep 2
        for pid in "${PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
            fi
        done
    fi
    wait 2>/dev/null
    echo "Cleanup complete."
    exit "$status"
}

# Trap INT and TERM signals for cleanup
trap cleanup EXIT INT TERM

# Dependency preflight: fail fast with the real install command instead of
# failing late at backend/frontend start.
for tool in uv bun curl; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "Missing required tool: $tool. Install it with 'gitmap aum install' (local-install.sh does not exist in this repo yet), then re-run run.sh." >&2
        exit 1
    fi
done
if [ ! -d "BE/.venv" ]; then
    echo "Note: BE/.venv not found; 'uv run' will create it on first run."
fi
echo "Cleaning up cached builds..."
rm -rf BE/be.egg-info

# DB-bootstrap skip (run-efficiency 6.1.1), mirroring run.ps1: previously
# run.ps1 bootstrapped on every run while run.sh never bootstrapped, so the
# two scripts disagreed about DB state. Both now run the read-only
# bin/db-bootstrap.py --check first (SchemaVersion vs on-disk migrations,
# no seeds, no writes): exit 0 skips the full bootstrap, any other exit
# falls back to it. Stdout (a JSON envelope) is discarded; [doctor]
# progress on stderr stays visible. No new failure gate: a bootstrap
# failure behaves exactly as before this change.
echo "Checking local databases..."
if uv run --project BE python bin/db-bootstrap.py --check > /dev/null; then
    echo "Local databases are up to date, skipping bootstrap."
else
    echo "Bootstrapping local databases..."
    uv run --project BE python bin/db-bootstrap.py
fi

# Start backend
echo "Starting backend on port $BE_PORT..."
# Using explicit bind as required by security guidelines for dev
uv run --project BE uvicorn BE.main:app --host "$BE_HOST" --port "$BE_PORT" &
BE_PID=$!
PIDS+=("$BE_PID")

# Start frontend
echo "Starting frontend on port $FE_PORT..."
bun run dev -- --host 127.0.0.1 --port "$FE_PORT" --strictPort &
FE_PID=$!
PIDS+=("$FE_PID")

# One combined wait (run-efficiency 6.1.2): both servers start before
# either is awaited, so the wall time is the slowest service, not the
# sum. Each service still gets the full $HEALTH_TIMEOUT from here.
echo "Waiting for backend and frontend..."
./scripts/dev/wait-for-http.sh "http://localhost:$BE_PORT/healthz" "http://localhost:$FE_PORT/" "$HEALTH_TIMEOUT" || exit 1

# Launch shell or skip
SKIP_SHELL=0
SKIP_REASON=""
if [ "$NO_SHELL" -eq 1 ]; then SKIP_SHELL=1; SKIP_REASON="--no-shell"; fi
if [ "$SKIP_SHELL" -eq 0 ] && [ "$OPEN_BROWSER" = "false" ]; then SKIP_SHELL=1; SKIP_REASON="run.config.json openBrowser=false"; fi
if [ "$SKIP_SHELL" -eq 0 ] && pgrep -af "chromium|chrome|msedge" 2>/dev/null | grep -E -- "--app=http://localhost:$FE_PORT" | grep -v -- "--type=" >/dev/null 2>&1; then SKIP_SHELL=1; SKIP_REASON="browser already running"; fi
if [ "$SKIP_SHELL" -eq 0 ]; then
    echo "Packaging Chromium shell..."
    if [ -d "chromium-shell" ]; then
        if ! command -v nix >/dev/null 2>&1; then
            echo "Error: nix is required to package the Chromium shell (public/app-shell.zip); refusing to continue with a possibly stale artifact. Install nix, then re-run run.sh." >&2
            exit 1
        elif ! (cd chromium-shell && nix run nixpkgs#zip -- -r ../public/app-shell.zip .); then
            echo "Error: nix zip packaging failed; public/app-shell.zip was not rebuilt. Refusing to continue with a possibly stale artifact." >&2
            exit 1
        fi
    fi

    echo "Launching Chromium shell..."
    # The requirement: Chromium shell pointing at http://localhost:$FE_PORT with query ?backend=http://localhost:$BE_PORT
    URL="http://localhost:$FE_PORT?backend=http://localhost:$BE_PORT"
    PROFILE_DIR="$(pwd)/.browser-profile"

    if command -v chromium &> /dev/null; then
        chromium --app="$URL" --start-fullscreen --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check &
        PIDS+=("$!")
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser --app="$URL" --start-fullscreen --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check &
        PIDS+=("$!")
    elif command -v google-chrome &> /dev/null; then
        google-chrome --app="$URL" --start-fullscreen --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check &
        PIDS+=("$!")
    elif command -v msedge &> /dev/null; then
        msedge --app="$URL" --start-fullscreen --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check &
        PIDS+=("$!")
    else
        echo "Chromium/Chrome not found in PATH. Please open: $URL"
    fi
else
    echo "Skipping Chromium shell ($SKIP_REASON)."
fi

echo "Press Ctrl+C to stop..."
wait
