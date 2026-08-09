#!/usr/bin/env bats
# Plan 90 Step 92 - Bats acceptance for packaging/installers/install.sh.
#
# Mirror of packaging/installers/tests/Install.Tests.ps1 (Step 91). Because
# install.sh is the Plan 90 Step 106 orchestrator (see
# assets/issues/24-install-sh-spec-16-03-deviation.md), the plan-text
# "release-side" flags map onto the actual POSIX surface as follows:
#   -DryRun    -> (no direct equivalent; bash orchestrator has no ShouldProcess
#                  semantics. Covered indirectly via --uninstall guardrail,
#                  which never renders the install plan.)
#   -Uninstall -> --uninstall
#   -Force     -> --force-reinstall / --allow-downgrade
#   -Version   -> APP_VERSION env
#   checksum   -> exit 6 when SHA256SUMS.txt does not match on-disk bytes
#                 (install.ps1 emits 9533; the POSIX wrapper reserves the
#                 0-9 range per install.sh header, so 6 is the paired code)
#
# Anchors:
#   packaging/installers/install.sh (Step 106/124/125/129)
#   packaging/installers/tests/Install.Tests.ps1 (Step 91)
#   spec/21-app/77-cli-powershell-and-release.md
#   assets/issues/24-install-sh-spec-16-03-deviation.md
#
# Requires: bats-core >= 1.5. No venv required for the static-contract and
# usage-guard blocks. The checksum-failure block is gated on a real
# .venv/bin/python so dev boxes without one skip cleanly.

setup() {
  TESTS_DIR="$( cd "$( dirname "${BATS_TEST_FILENAME}" )" && pwd )"
  INSTALL_SH="$( cd "${TESTS_DIR}/.." && pwd )/install.sh"
  REPO_ROOT="$( cd "${TESTS_DIR}/../../.." && pwd )"
  VENV_PY="${REPO_ROOT}/.venv/bin/python"
}

# ---------- static contract ------------------------------------------------

@test "static: install.sh exists on disk" {
  [ -f "${INSTALL_SH}" ]
}

@test "static: install.sh is executable" {
  [ -x "${INSTALL_SH}" ]
}

@test "static: passes bash -n syntax check" {
  run bash -n "${INSTALL_SH}"
  [ "${status}" -eq 0 ]
}

@test "static: declares --install / --uninstall / --force-warn / --verify-only" {
  grep -q -- '--install)' "${INSTALL_SH}"
  grep -q -- '--uninstall)' "${INSTALL_SH}"
  grep -q -- '--force-warn)' "${INSTALL_SH}"
  grep -q -- '--verify-only)' "${INSTALL_SH}"
}

@test "static: declares force-family switches (--force-reinstall, --allow-downgrade)" {
  grep -q -- '--force-reinstall)' "${INSTALL_SH}"
  grep -q -- '--allow-downgrade)' "${INSTALL_SH}"
}

@test "static: honours APP_VERSION / APP_BINARIES_DIR / APP_INSTALL_ROOT env knobs" {
  grep -q 'APP_VERSION' "${INSTALL_SH}"
  grep -q 'APP_BINARIES_DIR' "${INSTALL_SH}"
  grep -q 'APP_INSTALL_ROOT' "${INSTALL_SH}"
}

@test "static: reserves the documented exit-code table (2..9)" {
  for code in 2 3 4 5 6 7 8 9; do
    grep -qE "exit[[:space:]]+${code}\b" "${INSTALL_SH}"
  done
}

@test "static: invokes the four python entry scripts" {
  grep -q 'install-verify-sums\.py' "${INSTALL_SH}"
  grep -q 'install-doctor\.py' "${INSTALL_SH}"
  grep -q 'install-upgrade-plan\.py' "${INSTALL_SH}"
  grep -q 'install-record\.py' "${INSTALL_SH}"
}

# ---------- runtime guardrails (no venv required) -------------------------

@test "usage: no phase flag exits 2 with usage banner" {
  run bash "${INSTALL_SH}"
  [ "${status}" -eq 2 ]
  [[ "${output}" == *"Usage:"* ]]
}

@test "usage: unknown flag exits 2" {
  run bash "${INSTALL_SH}" --nope
  [ "${status}" -eq 2 ]
}

@test "usage: --help exits 0" {
  run bash "${INSTALL_SH}" --help
  [ "${status}" -eq 0 ]
  [[ "${output}" == *"Usage:"* ]]
}

@test "guard: --install without APP_BINARIES_DIR refuses to proceed (non-zero)" {
  # Mirrors the install.ps1 guard test: on hosts without a real .venv the
  # PYTHON_EXE check (exit 3) fires before the BINARIES_DIR check (exit 2).
  # Assert non-zero unconditionally; when a venv IS present the exit code
  # must be exactly 2 with the documented banner.
  unset APP_BINARIES_DIR
  run bash "${INSTALL_SH}" --install
  [ "${status}" -ne 0 ]
  if [ -x "${VENV_PY}" ]; then
    [ "${status}" -eq 2 ]
    [[ "${output}" == *"APP_BINARIES_DIR is required"* ]]
  fi
}

@test "guard: missing PYTHON_EXE exits 3" {
  PYTHON_EXE=/does/not/exist/python run bash "${INSTALL_SH}" --install
  [ "${status}" -eq 3 ]
}

# ---------- checksum failure branch (venv required) -----------------------

@test "checksum: --install --verify-only exits 6 when SHA256SUMS is tampered" {
  if [ ! -x "${VENV_PY}" ]; then
    skip "no ${VENV_PY}; checksum branch requires a real interpreter"
  fi
  tmp="$(mktemp -d)"
  # tampered inventory: advertised hash does not match on-disk bytes
  printf 'FAKE-BINARY' > "${tmp}/worker-cli"
  printf '%s  worker-cli\n' "$(printf '0%.0s' {1..64})" > "${tmp}/SHA256SUMS.txt"
  APP_BINARIES_DIR="${tmp}" APP_INSTALL_ROOT="${tmp}/root" \
    run bash "${INSTALL_SH}" --install --verify-only
  rm -rf "${tmp}"
  [ "${status}" -eq 6 ]
}
