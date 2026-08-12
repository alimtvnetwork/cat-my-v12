#!/usr/bin/env bash
# run.sh - Launcher script for Backend Implementation v1

# Defaults
BE_PORT=8787
FE_PORT=5173
BE_HOST="127.0.0.1"
NO_SHELL=0

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --be-port) BE_PORT="$2"; shift ;;
        --fe-port) FE_PORT="$2"; shift ;;
        --host) BE_HOST="$2"; shift ;;
        --no-shell) NO_SHELL=1 ;;
        --help|-h)
            echo "Usage: ./run.sh [options]"
            echo "Options:"
            echo "  --be-port PORT    Port for backend (default: 8787)"
            echo "  --fe-port PORT    Port for frontend (default: 5173)"
            echo "  --host IP         Host to bind backend (default: 127.0.0.1). WARNING: Do not use 0.0.0.0 in non-dev environments."
            echo "  --no-shell        Skip launching Chromium shell"
            echo "  --help, -h        Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Enable job control for cleanup
set -m

PIDS=()

# Cleanup function to kill child processes
cleanup() {
    echo ""
    echo "Shutting down..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
        fi
    done
    wait 2>/dev/null
    echo "Cleanup complete."
    exit 0
}

# Trap INT and TERM signals for cleanup
trap cleanup EXIT INT TERM

# Start backend
echo "Starting backend on port $BE_PORT..."
# Using explicit bind as required by security guidelines for dev
uv run --project BE uvicorn BE.main:app --host "$BE_HOST" --port "$BE_PORT" &
BE_PID=$!
PIDS+=("$BE_PID")

# Wait for backend to be healthy
echo "Waiting for backend..."
./scripts/dev/wait-for-http.sh "http://localhost:$BE_PORT/health" 30 || exit 1

# Start frontend
echo "Starting frontend on port $FE_PORT..."
bun run dev -- --port "$FE_PORT" &
FE_PID=$!
PIDS+=("$FE_PID")

# Wait for frontend to be accessible
echo "Waiting for frontend..."
./scripts/dev/wait-for-http.sh "http://localhost:$FE_PORT/" 30 || exit 1

# Launch shell or skip
if [ "$NO_SHELL" -eq 0 ]; then
    echo "Packaging Chromium shell..."
    if [ -d "chromium-shell" ]; then
        (cd chromium-shell && nix run nixpkgs#zip -- -r ../public/app-shell.zip . 2>/dev/null || echo "Warning: nix command failed or not found, skipping zip packaging.")
    fi

    echo "Launching Chromium shell..."
    # The requirement: Chromium shell pointing at http://localhost:$FE_PORT with query ?backend=http://localhost:$BE_PORT
    URL="http://localhost:$FE_PORT?backend=http://localhost:$BE_PORT"
    
    if command -v chromium &> /dev/null; then
        chromium --app="$URL" &
        PIDS+=("$!")
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser --app="$URL" &
        PIDS+=("$!")
    elif command -v google-chrome &> /dev/null; then
        google-chrome --app="$URL" &
        PIDS+=("$!")
    else
        echo "Chromium/Chrome not found in PATH. Please open: $URL"
    fi
else
    echo "Running in --no-shell mode."
fi

echo "Press Ctrl+C to stop..."
wait
