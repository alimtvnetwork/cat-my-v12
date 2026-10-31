#!/usr/bin/env bats
# Clean-machine E2E install test (spec 03 §7.2 item 4).
#
# Fresh-directory harness: stages the installer-relevant tree
# (packaging/, bin/, BE/, scripts/, version.json) into a temp directory
# with no .venv and no install.json, builds a fixture release binaries
# directory (db-bootstrap + retention-run + SHA256SUMS.txt), then runs
# install -> doctor -> launch -> uninstall and asserts the exit-code
# contract and the install.json audit trail.
#
# The install step deliberately leaves APP_VERSION unset so the
# version.json resolution path is exercised, and leaves the venv absent
# so the bootstrap path is exercised.
#
# Requires: bash, python3, sha256sum. Skips when python3 or sha256sum
# is missing. The staged venv bootstrap pip-installs pydantic; on an
# offline host the installer falls back to system python3 only when it
# imports BE.envelope, otherwise the install step fails loudly (which
# is the correct signal, not a test bug).
#
# NOTE: bin scripts bootstrap sys.path to the repo root and install.sh
# exports PYTHONPATH, so BE imports resolve regardless of cwd. The test
# still runs from the staged copy, matching operator use from a repo root.

setup() {
  command -v python3 >/dev/null 2>&1 || skip "python3 required for the E2E harness"
  command -v sha256sum >/dev/null 2>&1 || skip "sha256sum required for the fixture SHA256SUMS"
  TESTS_DIR="$( cd "$( dirname "${BATS_TEST_FILENAME}" )" && pwd )"
  REPO_ROOT="$( cd "${TESTS_DIR}/../../.." && pwd )"
  TMP="$(mktemp -d)"
  STAGE="${TMP}/repo"
  mkdir -p "${STAGE}"
  cp -r "${REPO_ROOT}/packaging" "${REPO_ROOT}/bin" "${REPO_ROOT}/BE" "${REPO_ROOT}/scripts" "${STAGE}/"
  cp "${REPO_ROOT}/version.json" "${STAGE}/"
  # Fixture release binaries (BINARIES inventory: db-bootstrap, retention-run).
  BINARIES_DIR="${TMP}/binaries"
  mkdir -p "${BINARIES_DIR}"
  printf '#!/bin/sh\necho "fixture db-bootstrap"\n' > "${BINARIES_DIR}/db-bootstrap"
  printf '#!/bin/sh\necho "fixture retention-run"\n' > "${BINARIES_DIR}/retention-run"
  chmod +x "${BINARIES_DIR}/db-bootstrap" "${BINARIES_DIR}/retention-run"
  (cd "${BINARIES_DIR}" && sha256sum db-bootstrap retention-run > SHA256SUMS.txt)
  # Fake systemctl so the retention-timer action never touches host systemd.
  mkdir -p "${TMP}/fakebin"
  printf '#!/bin/sh\necho "systemctl $*" >> "%s/systemctl.log"\nexit 0\n' "${TMP}" > "${TMP}/fakebin/systemctl"
  chmod +x "${TMP}/fakebin/systemctl"
  # Hermetic home/install roots so nothing lands in the real user profile.
  export HOME="${TMP}/home" XDG_CONFIG_HOME="${TMP}/xdg"
  export APP_DB_ROOT="${TMP}/db" APP_INSTALL_ROOT="${TMP}/install-root" APP_BINARIES_DIR="${BINARIES_DIR}"
  unset APP_VERSION PYTHON_EXE
  export PATH="${TMP}/fakebin:${PATH}"
  mkdir -p "${HOME}" "${XDG_CONFIG_HOME}" "${APP_INSTALL_ROOT}"
  INSTALL_SH="${STAGE}/packaging/installers/install.sh"
  STAGE_VENV_PY="${STAGE}/.venv/bin/python"
  MANIFEST="${APP_INSTALL_ROOT}/install.json"
  LINK_DIR="${HOME}/.local/share/vision-app/bin"
}

teardown() {
  [ -n "${TMP:-}" ] && rm -rf "${TMP}"
}

@test "e2e: clean-machine install -> doctor -> launch -> uninstall" {
  # --- preconditions: genuinely clean (no venv, no manifest)
  [ ! -e "${STAGE}/.venv" ]
  [ ! -e "${MANIFEST}" ]

  # --- install (exercises venv bootstrap + version.json resolution)
  cd "${STAGE}"
  run bash "${INSTALL_SH}" --install
  [ "${status}" -eq 0 ]
  [ -x "${STAGE_VENV_PY}" ]

  # --- manifest: version resolved from version.json, never "unknown"
  EXPECTED_VERSION="$(python3 -c 'import json; print(json.load(open("version.json"))["version"])')"
  MANIFEST_VERSION="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))["AppVersion"])' "${MANIFEST}")"
  [ "${MANIFEST_VERSION}" = "${EXPECTED_VERSION}" ]
  [ "${MANIFEST_VERSION}" != "unknown" ]

  # --- manifest: install-phase audit trail, db-bootstrap first, retention-timer last, all green
  INSTALL_ORDER="$(python3 -c 'import json, sys; m = json.load(open(sys.argv[1])); print(" ".join(a["Name"] for a in m["Actions"] if a["Phase"] == "install"))' "${MANIFEST}")"
  [ "${INSTALL_ORDER}" = "db-bootstrap path-link retention-timer" ]
  INSTALL_FAILURES="$(python3 -c 'import json, sys; m = json.load(open(sys.argv[1])); print(sum(1 for a in m["Actions"] if a["Phase"] == "install" and a["ExitCode"] != 0))' "${MANIFEST}")"
  [ "${INSTALL_FAILURES}" -eq 0 ]

  # --- doctor (explicit step): clean report on the installed system
  run "${STAGE_VENV_PY}" "${STAGE}/bin/install-doctor.py" --install-root "${APP_INSTALL_ROOT}" --platform posix --phase install --interval-hours 24 --retention-days 30 --binaries-dir "${BINARIES_DIR}" --repo-root "${STAGE}"
  [ "${status}" -eq 0 ]

  # --- launch: path-link symlinks resolve and execute the fixture binaries
  [ -L "${LINK_DIR}/db-bootstrap" ]
  [ -L "${LINK_DIR}/retention-run" ]
  run "${LINK_DIR}/db-bootstrap"
  [ "${status}" -eq 0 ]
  [[ "${output}" == *"fixture db-bootstrap"* ]]

  # --- uninstall: exit 0, links removed, uninstall rows recorded in reverse order
  run bash "${INSTALL_SH}" --uninstall
  [ "${status}" -eq 0 ]
  [ ! -e "${LINK_DIR}/db-bootstrap" ]
  [ ! -e "${LINK_DIR}/retention-run" ]
  UNINSTALL_ORDER="$(python3 -c 'import json, sys; m = json.load(open(sys.argv[1])); print(" ".join(a["Name"] for a in m["Actions"] if a["Phase"] == "uninstall"))' "${MANIFEST}")"
  [ "${UNINSTALL_ORDER}" = "retention-timer path-link db-bootstrap" ]
}
