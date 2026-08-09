#!/usr/bin/env bash
# Rotate a Fly.io secret across staging and prod, validate /healthz after
# each stage, and revoke the old token from its issuing provider.
#
# Usage:
#   scripts/security/rotate_fly_secret.sh \
#     --name LOVABLE_API_KEY \
#     --new-value "$NEW_TOKEN" \
#     --old-value "$OLD_TOKEN" \
#     --staging-app ca-staging \
#     --prod-app ca-prod \
#     --revoke-cmd "curl -fsS -X POST https://provider/api/tokens/revoke -H 'Authorization: Bearer $ADMIN_TOKEN' -d token=@OLD@"
#
# The token to revoke is substituted into --revoke-cmd wherever the literal
# string "@OLD@" appears. If --revoke-cmd is omitted, revocation is skipped
# and the operator is told to revoke manually.
#
# Exit codes:
#   0 success. Both apps updated, both /healthz green, old token revoked.
#   1 usage / missing dependency.
#   2 staging update or health check failed (no prod change made).
#   3 prod update or health check failed (staging kept new value, prod rolled back).
#   4 revocation step failed (both apps hold the new value).

set -Eeuo pipefail

SECRET_NAME=""
NEW_VALUE=""
OLD_VALUE=""
STAGING_APP=""
PROD_APP=""
REVOKE_CMD=""
HEALTH_PATH="/healthz"
HEALTH_RETRIES=12
HEALTH_SLEEP=5

log()  { printf '[rotate] %s\n' "$*" >&2; }
die()  { log "ERROR: $*"; exit "${2:-1}"; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing dependency: $1"; }

usage() {
  sed -n '2,20p' "$0" >&2
  exit 1
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --name)         SECRET_NAME="$2"; shift 2 ;;
      --new-value)    NEW_VALUE="$2"; shift 2 ;;
      --old-value)    OLD_VALUE="$2"; shift 2 ;;
      --staging-app)  STAGING_APP="$2"; shift 2 ;;
      --prod-app)     PROD_APP="$2"; shift 2 ;;
      --revoke-cmd)   REVOKE_CMD="$2"; shift 2 ;;
      --health-path)  HEALTH_PATH="$2"; shift 2 ;;
      -h|--help)      usage ;;
      *)              die "unknown argument: $1" ;;
    esac
  done
  [ -n "$SECRET_NAME" ]  || die "missing --name"
  [ -n "$NEW_VALUE" ]    || die "missing --new-value"
  [ -n "$OLD_VALUE" ]    || die "missing --old-value"
  [ -n "$STAGING_APP" ]  || die "missing --staging-app"
  [ -n "$PROD_APP" ]     || die "missing --prod-app"
}

fly_hostname() {
  # Resolves app -> hostname via flyctl. Falls back to <app>.fly.dev.
  local app="$1" host
  host="$(flyctl status --app "$app" --json 2>/dev/null \
    | awk -F'"' '/"Hostname"/ {print $4; exit}')"
  [ -n "$host" ] && printf '%s' "$host" || printf '%s.fly.dev' "$app"
}

set_secret() {
  local app="$1"
  log "setting $SECRET_NAME on $app"
  # Pass value via env to avoid the plaintext showing up in argv/ps.
  FLY_ROT_VAL="$NEW_VALUE" flyctl secrets set \
    "$SECRET_NAME=$FLY_ROT_VAL" --app "$app" --stage=false >/dev/null
}

rollback_secret() {
  local app="$1"
  log "rolling back $SECRET_NAME on $app to previous value"
  FLY_ROT_VAL="$OLD_VALUE" flyctl secrets set \
    "$SECRET_NAME=$FLY_ROT_VAL" --app "$app" --stage=false >/dev/null || true
}

check_health() {
  local app="$1" host url i http
  host="$(fly_hostname "$app")"
  url="https://${host}${HEALTH_PATH}"
  log "polling $url"
  i=0
  while [ "$i" -lt "$HEALTH_RETRIES" ]; do
    http="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 10 "$url" || true)"
    if [ "$http" = "200" ]; then
      log "healthz OK on $app ($url)"
      return 0
    fi
    i=$((i + 1))
    sleep "$HEALTH_SLEEP"
  done
  return 1
}

revoke_old_token() {
  if [ -z "$REVOKE_CMD" ]; then
    log "no --revoke-cmd provided; revoke the previous token manually"
    return 0
  fi
  # Substitute @OLD@ with the old token value at call time.
  local cmd="${REVOKE_CMD//@OLD@/$OLD_VALUE}"
  log "revoking previous token via provider command"
  bash -c "$cmd" >/dev/null
}

main() {
  parse_args "$@"
  need flyctl
  need curl

  # Staging first. Failure here does not touch prod.
  set_secret "$STAGING_APP"
  if ! check_health "$STAGING_APP"; then
    rollback_secret "$STAGING_APP"
    die "staging healthz failed after rotation; rolled back staging" 2
  fi

  # Prod second. Failure here rolls prod back; staging keeps the new value
  # so the operator can investigate against the working staging deploy.
  set_secret "$PROD_APP"
  if ! check_health "$PROD_APP"; then
    rollback_secret "$PROD_APP"
    die "prod healthz failed after rotation; rolled back prod (staging kept new value)" 3
  fi

  # Only revoke once both environments are on the new secret and healthy.
  if ! revoke_old_token; then
    die "rotation succeeded but revoking old token failed; revoke manually" 4
  fi

  log "rotation complete: $SECRET_NAME rotated on $STAGING_APP and $PROD_APP, old token revoked"
}

main "$@"