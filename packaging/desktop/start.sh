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
FRONTEND_URL="http://127.0.0.1:3000/?ds=backend&backend=http://127.0.0.1:8787"

mkdir -p "$DATA_ROOT" "$LOG_ROOT"
export BE_HOST=127.0.0.1
export BE_PORT=8787
export BE_CORS_ORIGINS='["http://localhost:3000","http://127.0.0.1:3000"]'
export HOST=127.0.0.1
export PORT=3000

wait_for_url() {
  local url=$1
  local attempts=120

  until curl --fail --silent --show-error "$url" >/dev/null 2>&1; do
    attempts=$((attempts - 1))

    if [ "$attempts" -le 0 ]; then
      printf 'CAT iVISION did not become ready: %s\n' "$url" >&2

      return 1
    fi

    sleep 0.5
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

"$APP_ROOT/db-bootstrap" --db-root "$DATA_ROOT"

if ! curl --fail --silent "$BACKEND_URL" >/dev/null 2>&1; then
  nohup "$APP_ROOT/backend-server" >"$LOG_ROOT/backend.log" 2>&1 &
fi

wait_for_url "$BACKEND_URL"

if ! curl --fail --silent 'http://127.0.0.1:3000/' >/dev/null 2>&1; then
  (
    cd "$APP_ROOT/frontend"
    nohup "$APP_ROOT/runtime/bun" server/index.mjs >"$LOG_ROOT/frontend.log" 2>&1 &
  )
fi

wait_for_url 'http://127.0.0.1:3000/'

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
elif [ "$OS_TYPE" = "Darwin" ]; then
  open "$FRONTEND_URL"
else
  printf 'CAT iVISION requires Microsoft Edge, Google Chrome, or Chromium to open its application window.\n' >&2

  exit 1
fi
