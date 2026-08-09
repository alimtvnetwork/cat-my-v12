#!/usr/bin/env bash
# Deploy the validation worker to Fly.io. Requires `flyctl` installed and
# authenticated (`fly auth login`).
#
# Usage:
#   ./worker/deploy.sh [--env staging|prod] <fly-app-name>
#
# --env selects the Fly config: fly.staging.toml or fly.toml (default prod).
# The app name overrides the `app =` line in the chosen config.
#
# What it does:
#   1. Ensures the Fly app exists (creates it if not).
#   2. Prompts for VALIDATION_WORKER_TOKEN if unset and stores it as a Fly
#      secret so the running instance can read it as $VALIDATION_WORKER_TOKEN.
#   3. Deploys the current worker/ directory using the selected config.
#   4. Runs a post-deploy smoke check: /healthz must return ok=true and the
#      WORKER_VERSION reported must match the config. Exits non-zero on drift.
#   5. Prints the resulting HTTPS URL for pasting into Lovable Cloud's
#      VALIDATION_WORKER_URL secret.
#
# See docs/validation-worker-runbook.md for the full rotation runbook.
set -euo pipefail

ENV="prod"
if [ "${1:-}" = "--env" ]; then
  ENV="${2:-}"
  shift 2 || true
fi
APP="${1:-}"
if [ -z "$APP" ]; then
  echo "usage: $0 [--env staging|prod] <fly-app-name>" >&2
  exit 2
fi
case "$ENV" in
  prod) CONFIG="fly.toml" ;;
  staging) CONFIG="fly.staging.toml" ;;
  *) echo "unknown --env '$ENV' (expected staging|prod)" >&2; exit 2 ;;
esac

cd "$(dirname "$0")"

if ! command -v flyctl >/dev/null 2>&1; then
  echo "flyctl is not installed. See https://fly.io/docs/hands-on/install-flyctl/" >&2
  exit 1
fi

if ! flyctl status --app "$APP" >/dev/null 2>&1; then
  echo "[$ENV] Fly app '$APP' not found. Creating..."
  flyctl apps create "$APP"
fi

if [ -z "${VALIDATION_WORKER_TOKEN:-}" ]; then
  read -r -s -p "Enter VALIDATION_WORKER_TOKEN (leave blank to disable auth): " VALIDATION_WORKER_TOKEN
  echo
fi

if [ -n "$VALIDATION_WORKER_TOKEN" ]; then
  echo "[$ENV] Setting VALIDATION_WORKER_TOKEN on Fly app $APP..."
  flyctl secrets set --app "$APP" "VALIDATION_WORKER_TOKEN=$VALIDATION_WORKER_TOKEN" >/dev/null
fi

EXPECTED_VERSION="$(grep -E '^\s*WORKER_VERSION' "$CONFIG" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')"
echo "[$ENV] Deploying $APP using $CONFIG (expected WORKER_VERSION=$EXPECTED_VERSION)..."
flyctl deploy --app "$APP" --config "$CONFIG"

URL="https://${APP}.fly.dev"
echo
echo "[$ENV] Post-deploy smoke check against $URL/healthz..."
HEALTH="$(curl -fsS --max-time 10 "$URL/healthz")"
echo "  $HEALTH"
if ! echo "$HEALTH" | grep -q '"ok":\s*true'; then
  echo "FAIL: /healthz did not report ok=true" >&2
  exit 3
fi
if [ -n "$EXPECTED_VERSION" ] && ! echo "$HEALTH" | grep -q "\"version\":\s*\"$EXPECTED_VERSION\""; then
  echo "FAIL: /healthz version does not match $EXPECTED_VERSION (config drift or stale machine)" >&2
  exit 4
fi
echo "[$ENV] Smoke check passed."
echo
if [ "$ENV" = "prod" ]; then
  echo "Set VALIDATION_WORKER_URL in Lovable Cloud secrets to:"
  echo "  $URL"
else
  echo "Staging URL (do NOT set as prod VALIDATION_WORKER_URL):"
  echo "  $URL"
fi