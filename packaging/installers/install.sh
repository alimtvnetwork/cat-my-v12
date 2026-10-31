#!/usr/bin/env bash
# Plan 90 Step 106 - Top-level installer orchestrator for vision-app (POSIX).
#
# Executes the ordered installer plan produced by BE/app/installer_plan.py
# so this script and packaging/installers/install.ps1 can never drift.
# INSTALL: db-bootstrap first, retention-timer last.
# UNINSTALL: retention-timer first (stop the loop before schema teardown).
#
# Step 106 additions:
#   * pre-flight doctor via bin/install-doctor.py (blocks on errors unless
#     --force-warn passed)
#   * per-action manifest recording via bin/install-record.py so install.json
#     receives an append-only audit trail matching install.ps1
#
# Anchors:
#   02-spec/21-app/77-cli-powershell-and-release.md
#   02-spec/21-app/79-installer-retention-timing.md §Orchestrator, §Doctor
#
# Exit codes:
#   0  success
#   2  invalid usage / knob out of range / APP_BINARIES_DIR missing on --install
#   3  installer plan renderer failed
#   4  critical action failed
#   5  doctor reported errors (use --force-warn to override warnings, never errors)
#   6  SHA256SUMS cross-check failed (Plan 90 Step 124; spec 77 §4)
#   7  upgrade planner: downgrade blocked (pass --allow-downgrade to override)
#   8  upgrade planner: invalid --new-version or unreadable manifest
#   9  upgrade planner: manifest backup write failed
#
# Flags:
#   --install | --uninstall   phase selector (mutually exclusive)
#   --force-warn              override doctor warnings (never errors)
#   --verify-only             run pre-install SHA256SUMS cross-check and exit
#                             (Plan 90 Step 125 verify-install CI gate)
#   --force-reinstall         accept a same-version re-install (Plan 90 Step 129)
#   --allow-downgrade         accept installing an older version over a newer one


set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# F2 fix (spec 03 fix wave): bin scripts are invoked by absolute path,
# so script-path execution puts bin/ (not the repo root) on sys.path
# and `from BE...` imports fail even when run from the repo root.
# Export the derived repo root on PYTHONPATH (preserving any existing
# value) so every python invocation below resolves the BE package.
export PYTHONPATH="$REPO_ROOT${PYTHONPATH:+:$PYTHONPATH}"
# PYTHON_EXE is explicit only when the caller exported it; otherwise
# the default venv path is bootstrapped on demand (spec 03 §7.2 item 1).
if [ -n "${PYTHON_EXE:-}" ]; then
    PYTHON_EXE_IS_EXPLICIT=1
else
    PYTHON_EXE_IS_EXPLICIT=0
    PYTHON_EXE="$REPO_ROOT/.venv/bin/python"
fi
INTERVAL_HOURS="${APP_RETENTION_INTERVAL_HOURS:-24}"
RETENTION_DAYS="${APP_RETENTION_DAYS:-30}"
INSTALL_ROOT="${APP_INSTALL_ROOT:-$REPO_ROOT}"
# APP_VERSION_STR is resolved after the python check below (spec 03
# §5.2): explicit APP_VERSION wins, else version.json, else "unknown".
APP_VERSION_STR=""
BINARIES_DIR="${APP_BINARIES_DIR:-}"

usage() {
    cat <<EOF
Usage: $0 --install | --uninstall [--force-warn] [--verify-only]
Env overrides: APP_RETENTION_INTERVAL_HOURS, APP_RETENTION_DAYS,
               APP_INSTALL_ROOT, APP_VERSION, APP_BINARIES_DIR, PYTHON_EXE
A missing default .venv is bootstrapped from system python3 (spec 03
§7.2 item 1); an explicit PYTHON_EXE is never bootstrapped.
Note: APP_BINARIES_DIR is REQUIRED for --install (Plan 90 Step 125
      removed the skip fallback so every install goes through the
      SHA256SUMS cross-check).
EOF
}

phase=""
force_warn=0
verify_only=0
force_reinstall=0
allow_downgrade=0
for arg in "$@"; do
    case "$arg" in
        --install)          phase="install" ;;
        --uninstall)        phase="uninstall" ;;
        --force-warn)       force_warn=1 ;;
        --verify-only)      verify_only=1 ;;
        --force-reinstall)  force_reinstall=1 ;;
        --allow-downgrade)  allow_downgrade=1 ;;
        -h|--help)          usage; exit 0 ;;
        *)                  usage; exit 2 ;;
    esac
done
[ -n "$phase" ] || { usage; exit 2; }

# Venv bootstrap (spec 03 §7.2 item 1): a missing default venv is
# created from system python3 and given pydantic + fastapi, the
# third-party imports on the installer path. Pydantic serves the BE
# envelope; fastapi enters via the envelope's request-id import
# (BE/envelope.py -> BE/middleware/request_id.py), hit when
# db-bootstrap / retention-run emit their success envelope, so a
# pydantic-only venv dies on the report, not on the work itself.
# instead of failing deep in the renderer/doctor. An explicitly
# provided PYTHON_EXE is never bootstrapped: a pinned interpreter
# that is missing stays a fail-fast exit 3. When pip cannot install
# (offline machine) and system python3 already imports BE.envelope,
# the install proceeds under it with a warning; otherwise exit 3
# names the two commands that fix the machine.
if [ ! -x "$PYTHON_EXE" ]; then
    if [ "$PYTHON_EXE_IS_EXPLICIT" -eq 0 ] && command -v python3 >/dev/null 2>&1; then
        echo "[installer] venv python missing; bootstrapping $REPO_ROOT/.venv from python3" >&2
        if python3 -m venv "$REPO_ROOT/.venv" >&2 && "$REPO_ROOT/.venv/bin/python" -m pip install "pydantic>=2.9" "fastapi>=0.115" >&2; then
            PYTHON_EXE="$REPO_ROOT/.venv/bin/python"
        elif (cd "$REPO_ROOT" && python3 -c "import BE.envelope, BE.middleware.request_id" 2>/dev/null); then
            echo "[installer] warning: venv bootstrap could not install pydantic/fastapi; using system python3 (BE.envelope + request-id imports cleanly)" >&2
            PYTHON_EXE="$(command -v python3)"
        else
            echo "[3] venv bootstrap failed; fix the machine with: python3 -m venv $REPO_ROOT/.venv && $REPO_ROOT/.venv/bin/python -m pip install \"pydantic>=2.9\" \"fastapi>=0.115\"" >&2
            exit 3
        fi
    else
        echo "[3] python missing: $PYTHON_EXE" >&2
        exit 3
    fi
fi
[ -x "$PYTHON_EXE" ] || { echo "[3] python missing: $PYTHON_EXE" >&2; exit 3; }

# App version resolution (spec 03 §5.2): an install must never record
# "unknown" when the release-owned version.json is readable. An explicit
# APP_VERSION always wins; an unreadable version.json keeps "unknown"
# with a warning (the upgrade planner rejects unparseable values loudly).
if [ -n "${APP_VERSION:-}" ]; then
    APP_VERSION_STR="$APP_VERSION"
else
    APP_VERSION_STR="$(REPO_ROOT="$REPO_ROOT" "$PYTHON_EXE" -c 'import json, os; print(json.load(open(os.path.join(os.environ["REPO_ROOT"], "version.json")))["version"])' 2>/dev/null || echo unknown)"
    if [ "$APP_VERSION_STR" = "unknown" ]; then
        echo "[installer] warning: could not read a version from $REPO_ROOT/version.json; recording 'unknown'" >&2
    else
        echo "[installer] APP_VERSION resolved from version.json: $APP_VERSION_STR" >&2
    fi
fi

mkdir -p "$INSTALL_ROOT"

# --- Pre-install SHA256SUMS cross-check (Plan 90 Step 124 + 125) -------
# Runs BEFORE the doctor so a tampered exe never reaches the plan
# renderer or install.json. Plan 90 Step 125 removed the "skipped when
# APP_BINARIES_DIR unset" fallback: every --install MUST provide a
# binaries directory whose SHA256SUMS.txt covers the full BINARIES
# inventory. --uninstall skips the check (no new bytes are laid down).
# --verify-only exits 0 immediately after a passing check so CI can
# assert both the happy path and the tampered-exe path (exit 6) without
# invoking the doctor / plan / manifest recorder.
if [ "$phase" = "install" ] && [ -z "$BINARIES_DIR" ]; then
    echo "[2] APP_BINARIES_DIR is required for --install (Plan 90 Step 125)" >&2
    echo "    Expected layout: a directory holding the release onefile artefacts (db-bootstrap, retention-run) plus SHA256SUMS.txt covering them." >&2
    echo "    Produce it with the release workflow artefacts download, then re-run with APP_BINARIES_DIR=<dir>." >&2
    exit 2
fi
if [ -n "$BINARIES_DIR" ]; then
    set +e
    "$PYTHON_EXE" "$REPO_ROOT/bin/install-verify-sums.py" \
        --sums-path "$BINARIES_DIR/SHA256SUMS.txt" \
        --binaries-dir "$BINARIES_DIR" \
        --platform posix >&2
    verify_exit=$?
    set -e
    if [ "$verify_exit" -ne 0 ]; then
        echo "[6] SHA256SUMS cross-check failed (verify-sums exit $verify_exit); refusing to install" >&2
        exit 6
    fi
    echo "[installer] SHA256SUMS cross-check ok ($BINARIES_DIR)"
fi
if [ "$verify_only" -eq 1 ]; then
    echo "[installer] --verify-only requested; exiting 0 after cross-check."
    exit 0
fi

# --- Pre-flight doctor -------------------------------------------------

set +e
"$PYTHON_EXE" "$REPO_ROOT/bin/install-doctor.py" \
    --install-root "$INSTALL_ROOT" \
    --platform posix \
    --phase "$phase" \
    --interval-hours "$INTERVAL_HOURS" \
    --retention-days "$RETENTION_DAYS" \
    ${BINARIES_DIR:+--binaries-dir "$BINARIES_DIR"} \
    --repo-root "$REPO_ROOT" >/tmp/install-doctor.out 2>&1
doctor_exit=$?
set -e
cat /tmp/install-doctor.out >&2
if [ "$doctor_exit" -eq 21 ]; then
    echo "[5] doctor reported errors; refusing to proceed" >&2
    exit 5
elif [ "$doctor_exit" -eq 20 ] && [ "$force_warn" -eq 0 ]; then
    echo "[5] doctor reported warnings; re-run with --force-warn to proceed" >&2
    exit 5
elif [ "$doctor_exit" -ne 0 ]; then
    # Doctor contract (bin/install-doctor.py): 0 ok, 20 warnings,
    # 21 errors, 2 usage, 3 plan failure. Any other exit (e.g. 1 on
    # crash) means preflight never ran, so proceeding would skip the
    # preflight gate entirely -- refuse rather than tolerate it.
    echo "[5] doctor failed unexpectedly (exit $doctor_exit); refusing to proceed" >&2
    exit 5
fi

# --- Upgrade-in-place decision + manifest backup (Plan 90 Step 129) ----
# Runs AFTER the doctor (so a broken preflight aborts before we touch
# install.json) and BEFORE the plan renderer + action loop (so a blocked
# downgrade never records anything to the manifest). Skipped on
# --uninstall (no version comparison to make). CLI exit-code contract
# comes straight from bin/install-upgrade-plan.py:
#     40 -> wrapper 7 (downgrade blocked; --allow-downgrade required)
#     41 -> wrapper 8 (invalid --new-version or corrupt manifest)
#     42 -> wrapper 9 (manifest backup unwritable)
if [ "$phase" = "install" ]; then
    upgrade_args=(--install-root "$INSTALL_ROOT" --new-version "$APP_VERSION_STR" --backup)
    [ "$force_reinstall" -eq 1 ] && upgrade_args+=(--force-reinstall)
    [ "$allow_downgrade" -eq 1 ] && upgrade_args+=(--allow-downgrade)
    set +e
    upgrade_json=$("$PYTHON_EXE" "$REPO_ROOT/bin/install-upgrade-plan.py" "${upgrade_args[@]}" 2>/tmp/install-upgrade.err)
    upgrade_exit=$?
    set -e
    cat /tmp/install-upgrade.err >&2 || true
    case "$upgrade_exit" in
        0)  echo "[installer] upgrade decision: $upgrade_json" ;;
        40) echo "[7] upgrade planner blocked downgrade (pass --allow-downgrade to override)" >&2; exit 7 ;;
        41) echo "[8] upgrade planner rejected version/manifest input" >&2; exit 8 ;;
        42) echo "[9] upgrade planner failed to back up install.json" >&2; exit 9 ;;
        *)  echo "[8] upgrade planner returned unexpected exit $upgrade_exit" >&2; exit 8 ;;
    esac
fi



# Plan 90 Step 127: pass BINARIES_DIR into the planner so the path-link
# action embedded between db-bootstrap and retention-timer gets the
# --binaries-dir it needs (install phase). Uninstall passes an empty
# string; the planner tolerates it since the uninstall path-link action
# never reads it.
plan_json=$("$PYTHON_EXE" - <<PY
import json
from BE.app.installer_plan import plan_install_actions, InstallerPlatform, InstallerPhase
plan = plan_install_actions(
    platform=InstallerPlatform.POSIX,
    phase=InstallerPhase.${phase^^},
    interval_hours=$INTERVAL_HOURS,
    retention_days=$RETENTION_DAYS,
    binaries_dir=${BINARIES_DIR:+"'$BINARIES_DIR'"} or None,
)
print(json.dumps([
    {"name": a.name, "script": a.script, "args": list(a.args), "critical": a.critical}
    for a in plan
]))
PY
) || { echo "[3] installer plan renderer failed" >&2; exit 3; }

echo "[installer] phase=$phase"

count=$("$PYTHON_EXE" -c "import json,sys; print(len(json.loads(sys.argv[1])))" "$plan_json")

i=0
while [ "$i" -lt "$count" ]; do
    name=$("$PYTHON_EXE" -c "import json,sys; print(json.loads(sys.argv[1])[$i]['name'])" "$plan_json")
    script=$("$PYTHON_EXE" -c "import json,sys; print(json.loads(sys.argv[1])[$i]['script'])" "$plan_json")
    critical=$("$PYTHON_EXE" -c "import json,sys; print(json.loads(sys.argv[1])[$i]['critical'])" "$plan_json")
    args_json=$("$PYTHON_EXE" -c "import json,sys; print(json.dumps(json.loads(sys.argv[1])[$i]['args']))" "$plan_json")

    mapfile -t args < <("$PYTHON_EXE" -c "import json,sys
for a in json.loads(sys.argv[1]): print(a)" "$args_json")

    script_path="$REPO_ROOT/$script"
    echo "[installer] --> $name ($script) ${args[*]:-}"

    started_at=$(date -u +%Y-%m-%dT%H:%M:%S+00:00)
    started_ms=$(date -u +%s%3N)
    set +e
    # F2 follow-up (found while verifying the install): an action with
    # no args must receive zero arguments, not one empty string.
    # "${args[@]:-}" expands to "" for an empty array, which argparse
    # rejects as an unrecognized argument (db-bootstrap takes no args).
    # Branch on element count so the empty case passes no arguments;
    # the runner array itself is never empty, so this is set -u safe
    # on every bash version the script already requires (mapfile).
    if [[ "$script" == *.py ]]; then
        runner=("$PYTHON_EXE" "$script_path")
    else
        runner=(bash "$script_path")
    fi
    if [ "${#args[@]}" -gt 0 ]; then
        "${runner[@]}" "${args[@]}"
    else
        "${runner[@]}"
    fi
    child_exit=$?
    set -e
    completed_at=$(date -u +%Y-%m-%dT%H:%M:%S+00:00)
    completed_ms=$(date -u +%s%3N)
    duration_ms=$((completed_ms - started_ms))

    # Record to install.json (non-fatal if manifest write fails; log and continue).
    set +e
    "$PYTHON_EXE" "$REPO_ROOT/bin/install-record.py" \
        --install-root "$INSTALL_ROOT" \
        --app-version "$APP_VERSION_STR" \
        --platform posix \
        --name "$name" \
        --script "$script" \
        --args-json "$args_json" \
        --phase "$phase" \
        --started-at "$started_at" \
        --completed-at "$completed_at" \
        --duration-ms "$duration_ms" \
        --exit-code "$child_exit" \
        --is-critical "$([ "$critical" = "True" ] && echo true || echo false)"
    rec_exit=$?
    set -e
    [ "$rec_exit" -eq 0 ] || echo "[installer] warning: manifest record failed (exit $rec_exit)" >&2

    if [ "$child_exit" -ne 0 ]; then
        if [ "$critical" = "True" ]; then
            echo "[4] critical action failed: $name (exit $child_exit)" >&2
            exit 4
        fi
        echo "[installer] non-critical failure ($name exit $child_exit); continuing." >&2
    fi
    i=$((i + 1))
done

echo "[installer] done ($phase)."
