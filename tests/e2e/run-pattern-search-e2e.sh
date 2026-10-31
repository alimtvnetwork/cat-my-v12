#!/usr/bin/env bash
# CLI entry for the pattern-search E2E suite (cases A-F in
# tests/e2e/pattern-search-ui-improvement-cases.md).
#
# Usage:  bun run e2e:pattern-search
#         bash tests/e2e/run-pattern-search-e2e.sh
#
# Server modes: if the main backend (8787) and frontend (8080) are
# already healthy, the suite uses them and leaves them running (LIVE
# mode). Otherwise it starts its own run.sh --no-shell instance on
# alternate ports (8091/8788) and stops it at the end (OWNED mode).
# Set E2E_FORCE_OWNED=1 to force OWNED mode even when the main
# servers are up (their ports are left alone; the owned instance
# uses 8091/8788). C4 (SIGTERM cleanup) runs only in OWNED mode; in
# LIVE mode it is UNVERIFIED by design, because killing the user's
# live servers to test shutdown would be wrong.
#
# Exit code: 1 when any case FAILed, 0 otherwise. UNVERIFIED never
# fails the run, but it stays visible in the summary and is not a
# pass. Reports land in tests/reports/pattern-search-e2e.log.
set -u
cd "$(dirname "$0")/../.."
export PATH="$HOME/.local/bin:$PATH"
WORKSPACE_ROOT="$(cd ../.. 2>/dev/null && pwd || echo "$HOME/workspace")"
export UV_CACHE_DIR="$WORKSPACE_ROOT/.cache/uv"
export TMPDIR="$WORKSPACE_ROOT/.tmp-run"
mkdir -p "$WORKSPACE_ROOT/.cache/uv" "$WORKSPACE_ROOT/.tmp-run" tests/reports

LOG="tests/reports/pattern-search-e2e.log"
: > "$LOG"
say() { echo "$@" | tee -a "$LOG"; }
case_line() { say "CASE $1 $2 - $3"; }

MODE="LIVE"
FE_PORT=8080
BE_PORT=8787
RUN_PID=""
RUN_LOG=""

cleanup() {
  if [ -n "$RUN_PID" ] && kill -0 "$RUN_PID" 2>/dev/null; then
    kill "$RUN_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$RUN_PID" 2>/dev/null || true
  fi
  rm -rf .output
}
trap cleanup EXIT

health() { curl -s -m 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$1$2"; }

# --- 0. servers -------------------------------------------------------
if [ -z "${E2E_FORCE_OWNED:-}" ] && [ "$(health "$BE_PORT" /healthz)" = "200" ] && [ "$(health "$FE_PORT" /)" = "200" ]; then
  say "Servers: LIVE mode (using 8080/8787, leaving them running)"
else
  MODE="OWNED"
  FE_PORT=8091
  BE_PORT=8788
  if ! command -v uv >/dev/null 2>&1; then
    say "ERROR: uv is missing and the main servers are down. Install uv, then rerun."
    exit 2
  fi
  RUN_LOG="$(mktemp "$WORKSPACE_ROOT/.tmp-run/run-e2e.XXXXXX.log")"
  bash run.sh --no-shell --fe-port "$FE_PORT" --be-port "$BE_PORT" >"$RUN_LOG" 2>&1 &
  RUN_PID=$!
  say "Servers: OWNED mode (started run.sh --no-shell on 8091/8788, log $RUN_LOG)"
  READY=0
  for _ in $(seq 1 24); do
    if [ "$(health "$BE_PORT" /healthz)" = "200" ] && [ "$(health "$FE_PORT" /)" = "200" ]; then READY=1; break; fi
    sleep 5
  done
  if [ "$READY" != "1" ]; then
    say "ERROR: owned servers did not become healthy; see $RUN_LOG"
    exit 2
  fi
fi
export E2E_BASE_URL="http://127.0.0.1:$FE_PORT"
export E2E_BE_URL="http://127.0.0.1:$BE_PORT"

# --- A1. build --------------------------------------------------------
VER="$(python3 -c 'import json; print(json.load(open("version.json"))["version"])')"
BUILD_START=$(date +%s)
if bun run build >tests/reports/pattern-search-build.log 2>&1; then
  BUILD_SECS=$(( $(date +%s) - BUILD_START ))
  if grep -rq "$VER" .output/ 2>/dev/null; then
    case_line A1 PASS "build ok in ${BUILD_SECS}s, bundle contains $VER"
  else
    case_line A1 FAIL "build ok in ${BUILD_SECS}s but bundle lacks $VER"
  fi
else
  case_line A1 FAIL "bun run build failed (see tests/reports/pattern-search-build.log)"
fi
rm -rf .output

# --- A2. unit quartet -------------------------------------------------
if bun x vitest run tests/unit/conveyor-simulation.test.ts tests/unit/carrier-tape-simulation.test.ts tests/unit/pattern-matcher.test.ts tests/unit/workspace-layout-slice.test.ts >tests/reports/pattern-search-vitest.log 2>&1; then
  if grep -q "47 passed" tests/reports/pattern-search-vitest.log; then
    case_line A2 PASS "vitest quartet 47/47"
  else
    case_line A2 FAIL "vitest exit 0 but count is not 47 (see tests/reports/pattern-search-vitest.log)"
  fi
else
  case_line A2 FAIL "vitest quartet failed (see tests/reports/pattern-search-vitest.log)"
fi

# --- C5. installer ----------------------------------------------------
if command -v bats >/dev/null 2>&1; then
  if bats packaging/installers/tests/install-e2e-clean-machine.bats >tests/reports/pattern-search-bats.log 2>&1; then
    case_line C5 PASS "bats clean-machine install/doctor/launch/uninstall green"
  else
    case_line C5 FAIL "bats clean-machine failed (see tests/reports/pattern-search-bats.log)"
  fi
else
  case_line C5 UNVERIFIED "bats is not installed on this VM"
fi

# --- B. backend probes ------------------------------------------------
python3 tests/e2e/pattern-search-backend-probes.py 2>&1 | tee -a "$LOG" || true

# --- D/E. UI probe ----------------------------------------------------
CHROME_BIN="$(node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null || true)"
if [ -n "$CHROME_BIN" ] && [ -x "$CHROME_BIN" ]; then
  node tests/e2e/pattern-search-ui-probe.mjs 2>&1 | tee -a "$LOG" || true
else
  for id in D1 D2 D3 D4 D5 D6 D7 D8 D9 D10 D11 E1; do
    case_line "$id" UNVERIFIED "Playwright Chromium not installed (run: playwright install chromium)"
  done
fi

# --- C1-C4. run smoke -------------------------------------------------
if [ "$MODE" = "OWNED" ]; then
  if grep -q "Skipping Chromium shell (--no-shell)" "$RUN_LOG"; then
    case_line C1 PASS "owned run used --no-shell, no browser launched"
  else
    case_line C1 FAIL "owned run log lacks the --no-shell skip line"
  fi
  if [ -d BE/.venv ] && grep -qi "skip.*bootstrap\|bootstrap.*skip" "$RUN_LOG"; then
    case_line C2 PASS "warm start skipped the DB bootstrap (venv present)"
  else
    case_line C2 UNVERIFIED "warm-skip line not found in owned run log (venv present: $([ -d BE/.venv ] && echo yes || echo no))"
  fi
else
  case_line C1 UNVERIFIED "live servers pre-date this run; --no-shell path proven by OWNED mode"
  case_line C2 UNVERIFIED "live servers pre-date this run; warm skip proven by OWNED mode"
fi
if [ "$(health "$BE_PORT" /healthz)" = "200" ] && [ "$(health "$FE_PORT" /)" = "200" ]; then
  case_line C3 PASS "backend /healthz 200 and frontend / 200 on $FE_PORT/$BE_PORT"
else
  case_line C3 FAIL "health endpoints not both 200 on $FE_PORT/$BE_PORT"
fi
if [ "$MODE" = "OWNED" ]; then
  kill "$RUN_PID" 2>/dev/null || true
  sleep 3
  if [ "$(health "$BE_PORT" /healthz)" = "000" ] && [ "$(health "$FE_PORT" /)" = "000" ]; then
    case_line C4 PASS "SIGTERM freed both owned ports"
  else
    case_line C4 FAIL "owned ports still answering after SIGTERM"
  fi
  RUN_PID=""
else
  case_line C4 UNVERIFIED "live servers left running by design"
fi

# --- summary ----------------------------------------------------------
PASSED=$(grep -c " PASS " "$LOG" || true)
FAILED=$(grep -c " FAIL " "$LOG" || true)
UNVERIFIED=$(grep -c " UNVERIFIED " "$LOG" || true)
say "SUMMARY: $PASSED passed, $FAILED failed, $UNVERIFIED unverified (full log: $LOG)"
[ "$FAILED" = "0" ]
