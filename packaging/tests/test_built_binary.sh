#!/usr/bin/env bash
# Plan 90 Step 88 - Built-binary smoke test for the release matrix.
#
# Owning spec: spec/21-app/77-cli-powershell-and-release.md
# §"Release artefacts" (worker-cli/processing-cli onefile binaries).
#
# Root cause guarded (one sentence): a PyInstaller build can succeed and
# still ship a binary that crashes on first invocation (missing bundled
# data, hidden import stripped by an eager `excludes`, entry-module
# import cycle), so the release matrix MUST exercise every artefact end
# to end before the SHA256SUMS.txt / verify-install job runs.
#
# Contract (matches packaging/README.md §Verification):
#   1. `<bin> version` exits 0 AND stdout parses as JSON AND
#      `.Status.IsSuccess == true` AND `.Results[0].Name == <expected>`.
#   2. `<bin> doctor` exits 0 AND stdout parses as JSON AND
#      `.Status.Code == 200`.
#
# Both invocations must complete inside 30s. Anything else is a build
# regression and blocks the release matrix.
#
# Invoked by .github/workflows/release.yml (Step 93) after the
# build-matrix job, before checksum. Also runnable locally:
#   bash packaging/tests/test_built_binary.sh
#
# Env vars (override for cross-compilation / matrix layout):
#   DIST_DIR       Directory holding the built binaries. Default: dist
#   BIN_SUFFIX     Executable suffix. Default: "" (POSIX) or ".exe" if
#                  running under Git-Bash / MSYS / Cygwin ($OSTYPE match).
#   BIN_TIMEOUT    Per-invocation timeout in seconds. Default: 30.

set -Eeuo pipefail

DIST_DIR="${DIST_DIR:-dist}"
BIN_TIMEOUT="${BIN_TIMEOUT:-30}"

case "${OSTYPE:-}" in
  msys*|cygwin*|win32*) DEFAULT_SUFFIX=".exe" ;;
  *)                    DEFAULT_SUFFIX=""     ;;
esac
BIN_SUFFIX="${BIN_SUFFIX-$DEFAULT_SUFFIX}"

log()  { printf '[built-binary] %s\n' "$*" >&2; }
fail() { log "FAIL: $*"; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || fail "required tool not on PATH: $1"
}

require jq
require timeout

run_bin() {
  # Runs `<bin> <subcmd>` with a hard timeout; prints stdout, returns exit.
  local bin_path="$1" subcmd="$2"
  # shellcheck disable=SC2086 # subcmd is a single token by contract.
  timeout --signal=KILL "${BIN_TIMEOUT}" "${bin_path}" "${subcmd}"
}

assert_version() {
  local bin_path="$1" expected_name="$2"
  local stdout rc
  set +e
  stdout="$(run_bin "${bin_path}" version)"
  rc=$?
  set -e
  [ "${rc}" -eq 0 ] || fail "${bin_path} version exited ${rc}"
  echo "${stdout}" | jq -e '.Status.IsSuccess == true' >/dev/null \
    || fail "${bin_path} version: Status.IsSuccess != true; stdout=${stdout}"
  local got
  got="$(echo "${stdout}" | jq -r '.Results[0].Name // ""')"
  [ "${got}" = "${expected_name}" ] \
    || fail "${bin_path} version: Results[0].Name = '${got}', expected '${expected_name}'"
  log "OK  ${bin_path} version -> ${expected_name}"
}

assert_doctor() {
  local bin_path="$1"
  local stdout rc
  set +e
  stdout="$(run_bin "${bin_path}" doctor)"
  rc=$?
  set -e
  [ "${rc}" -eq 0 ] || fail "${bin_path} doctor exited ${rc}"
  echo "${stdout}" | jq -e '.Status.Code == 200' >/dev/null \
    || fail "${bin_path} doctor: Status.Code != 200; stdout=${stdout}"
  log "OK  ${bin_path} doctor -> Status.Code=200"
}

exercise() {
  local name="$1"
  local bin_path="${DIST_DIR}/${name}${BIN_SUFFIX}"
  [ -x "${bin_path}" ] || fail "not executable: ${bin_path}"
  assert_version "${bin_path}" "${name}"
  assert_doctor  "${bin_path}"
}

log "DIST_DIR=${DIST_DIR} BIN_SUFFIX='${BIN_SUFFIX}' BIN_TIMEOUT=${BIN_TIMEOUT}"
exercise worker-cli
exercise processing-cli
log "all built-binary smoke tests passed"
