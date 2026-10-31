#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DATA_ROOT="$APP_ROOT/data"
OS_TYPE=$(uname -s)

if [ "$OS_TYPE" = "Darwin" ]; then
  LOG_ROOT="$HOME/Library/Logs/cat-ivision"
else
  LOG_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/cat-ivision"
fi

BACKEND_URL="http://127.0.0.1:8787/healthz"
SHUTDOWN_URL="http://127.0.0.1:8787/shutdown"
FRONTEND_URL="http://127.0.0.1:3000/?ds=backend&backend=http://127.0.0.1:8787"

# PIDs of services this script started (empty = already running, not ours).
BACKEND_PID=""
FRONTEND_PID=""

stop_service() {
  local pid=$1

  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true

    local attempts=10

    while kill -0 "$pid" 2>/dev/null && [ "$attempts" -gt 0 ]; do
      sleep 0.2
      attempts=$((attempts - 1))
    done

    kill -9 "$pid" 2>/dev/null || true
  fi
}

stop_own_services() {
  if [ "$LEAVE_SERVICES_RUNNING" = "1" ]; then
    return 0
  fi

  stop_service "$BACKEND_PID"
  stop_service "$FRONTEND_PID"
}

# Spec 55: EXIT trap (was INT TERM only). A missing browser or a failed
# readiness wait under `set -e` used to exit leaving backend + frontend
# orphaned. LEAVE_SERVICES_RUNNING covers the two paths where the
# services must outlive this script: browser delegation to an
# already-running window, and the macOS `open` path (no process to wait
# on — teardown happens via the in-app Exit button).
LEAVE_SERVICES_RUNNING=0

trap stop_own_services EXIT INT TERM

mkdir -p "$DATA_ROOT" "$LOG_ROOT"
export BE_HOST=127.0.0.1
export BE_PORT=8787
export BE_CORS_ORIGINS='["http://localhost:3000","http://127.0.0.1:3000"]'
export HOST=127.0.0.1
export PORT=3000

VERSION_PRINTED=0

print_startup_version() {
  local candidate version_file="" version_value

  for candidate in "$APP_ROOT/version.json" "$APP_ROOT/../../version.json"; do
    if [ -s "$candidate" ]; then
      version_file="$candidate"

      break
    fi
  done

  if [ -z "$version_file" ]; then
    return 1
  fi

  version_value=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$version_file" | head -n 1)

  if [ -z "$version_value" ]; then
    return 1
  fi

  printf 'CAT iVISION version v%s\n' "$version_value"
  VERSION_PRINTED=1

  return 0
}

print_meta_version() {
  local meta_json version_value

  meta_json=$(curl --fail --silent 'http://127.0.0.1:8787/meta' 2>/dev/null || true)

  if [ -z "$meta_json" ]; then
    return 1
  fi

  version_value=$(printf '%s' "$meta_json" | sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' | head -n 1)

  if [ -z "$version_value" ]; then
    return 1
  fi

  printf 'CAT iVISION version v%s (backend)\n' "$version_value"
  VERSION_PRINTED=1

  return 0
}

port_owner_text() {
  local port=$1

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | grep ":$port " | head -n 1 || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -i ":$port" -sTCP:LISTEN 2>/dev/null | tail -n 1 || true
  fi
}

# Spec 55 fail-fast: called only when the health probe already failed.
# If anything answers TCP on the port, it is NOT our service (ours
# would answer the health probe) — fail now naming the port instead of
# a 60s "did not become ready".
fail_if_port_held() {
  local port=$1 owner

  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    owner=$(port_owner_text "$port")

    if [ -n "$owner" ]; then
      printf 'CAT iVISION port %s already in use by %s\n' "$port" "$owner" >&2
    else
      printf 'CAT iVISION port %s already in use by another process\n' "$port" >&2
    fi

    return 1
  fi

  return 0
}

wait_for_url() {
  local url=$1
  local owner_pid=${2:-}
  local attempts=240

  until curl --fail --silent --show-error "$url" >/dev/null 2>&1; do
    if [ -n "$owner_pid" ] && ! kill -0 "$owner_pid" 2>/dev/null; then
      printf 'CAT iVISION service exited during startup (url: %s; see logs in %s)\n' "$url" "$LOG_ROOT" >&2

      return 1
    fi

    attempts=$((attempts - 1))

    if [ "$attempts" -le 0 ]; then
      printf 'CAT iVISION did not become ready: %s\n' "$url" >&2

      return 1
    fi

    sleep 0.25
  done
}

find_app_browser() {
  local command_name

  if [ "$OS_TYPE" = "Darwin" ]; then
    local mac_candidates=(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
      "$HOME/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
      "/Applications/Arc.app/Contents/MacOS/Arc"
    )

    for mac_bin in "${mac_candidates[@]}"; do
      if [ -x "$mac_bin" ]; then
        printf '%s\n' "$mac_bin"

        return 0
      fi
    done

    return 1
  fi

  for command_name in microsoft-edge-stable microsoft-edge google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$command_name" >/dev/null 2>&1; then
      command -v "$command_name"

      return 0
    fi
  done

  return 1
}

print_startup_version || true

# Spec 55: exactly one migration pass. The backend lifespan runs the
# SAME bootstrap tiers on every start (BE/main.py lifespan), which also
# covers backends started without this launcher — so the launcher no
# longer runs db-bootstrap first. Tradeoff: a migration failure at
# launch now surfaces as a backend lifespan warning instead of a hard
# launcher failure. db-bootstrap itself is unchanged and still used by
# CLI preflight flows.
if ! curl --fail --silent "$BACKEND_URL" >/dev/null 2>&1; then
  fail_if_port_held 8787 || exit 1
  nohup "$APP_ROOT/backend-server" >"$LOG_ROOT/backend.log" 2>&1 &
  BACKEND_PID=$!
fi

# Spec 55: the frontend does not depend on the backend, so it starts
# concurrently — no readiness wait sits between the two starts. The
# two waits below overlap in effect (the second returns at once when
# its service is already up), with a shorter 0.25s poll interval.
if ! curl --fail --silent 'http://127.0.0.1:3000/' >/dev/null 2>&1; then
  fail_if_port_held 3000 || exit 1
  (
    cd "$APP_ROOT/frontend"
    nohup "$APP_ROOT/runtime/bun" server/index.mjs >"$LOG_ROOT/frontend.log" 2>&1 &
    echo $! >"$LOG_ROOT/frontend.pid"
  )
  FRONTEND_PID=$(cat "$LOG_ROOT/frontend.pid")
fi

wait_for_url "$BACKEND_URL" "$BACKEND_PID"
wait_for_url 'http://127.0.0.1:3000/' "$FRONTEND_PID"

if [ "$VERSION_PRINTED" != "1" ]; then
  print_meta_version || true
fi

if BROWSER_BIN=$(find_app_browser); then
  EXTRA_BROWSER_ARGS=()

  if [ "$OS_TYPE" != "Darwin" ]; then
    EXTRA_BROWSER_ARGS+=(--class=cat-ivision)
  fi

  nohup "$BROWSER_BIN" \
    --app="$FRONTEND_URL" \
    --start-fullscreen \
    --user-data-dir="$DATA_ROOT/browser-profile" \
    --no-first-run \
    --no-default-browser-check \
    ${EXTRA_BROWSER_ARGS[@]+"${EXTRA_BROWSER_ARGS[@]}"} \
    >/dev/null 2>&1 &
  BROWSER_PID=$!

  # Spec 54 section 8: supervise the whole stack. When the browser window
  # closes, the backend and frontend must not be orphaned (orphans held
  # ports 8787/3000 and broke the next launch).
  BROWSER_START=$SECONDS
  wait "$BROWSER_PID" || true
  BROWSER_LIFETIME=$((SECONDS - BROWSER_START))

  if [ "$BROWSER_LIFETIME" -lt 5 ]; then
    # The launched process exited almost immediately: it most likely
    # handed off to an already-running browser instance with the same
    # profile. Tearing down now would kill servers the user is still
    # using, so leave them running. The EXIT trap honors this flag.
    LEAVE_SERVICES_RUNNING=1
    printf 'NOTE: browser process exited quickly; assuming delegation to an already-running browser window.\n' >&2
    printf 'NOTE: the app window you see is the existing one — backend/frontend stay running. Close it with the in-app Exit button.\n' >&2
  else
    curl --fail --silent -X POST "$SHUTDOWN_URL" >/dev/null 2>&1 || true
    stop_own_services
  fi
elif [ "$OS_TYPE" = "Darwin" ]; then
  # No browser binary found at the known paths: try LaunchServices by
  # app name with --app + the dedicated profile. Never fall back to a
  # plain `open "$FRONTEND_URL"` tab (spec 55): a plain tab has no
  # profile, no fullscreen, and no supervision.
  MAC_LAUNCHED=0

  for mac_app in "Google Chrome" "Microsoft Edge" "Brave Browser" "Chromium" "Arc"; do
    if open -n -a "$mac_app" --args \
      --app="$FRONTEND_URL" \
      --start-fullscreen \
      --user-data-dir="$DATA_ROOT/browser-profile" \
      --no-first-run \
      --no-default-browser-check >/dev/null 2>&1; then
      MAC_LAUNCHED=1

      break
    fi
  done

  if [ "$MAC_LAUNCHED" != "1" ]; then
    printf 'CAT iVISION requires Microsoft Edge, Google Chrome, or Chromium to open its application window.\n' >&2

    exit 1
  fi

  # `open` gives no process to wait on: teardown happens via the in-app
  # Exit button (POST /shutdown) on this path, so the EXIT trap must
  # not stop the services as this script exits.
  LEAVE_SERVICES_RUNNING=1
else
  printf 'CAT iVISION requires Microsoft Edge, Google Chrome, or Chromium to open its application window.\n' >&2

  exit 1
fi
