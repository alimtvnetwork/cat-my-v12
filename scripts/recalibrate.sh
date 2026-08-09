#!/usr/bin/env bash
# One-command recalibration workflow.
#
#   1. Run worker/calibrate.py to regenerate worker/calibration-report.json
#      from the labelled fixtures.
#   2. Run linter-scripts/check-calibration-regression.py against the
#      committed baseline so unintentional drift stops the pipeline before
#      anything is committed.
#   3. If the report changed on disk, git-commit it (message includes a
#      per-kind summary of thr/margin/midpoint) on the current branch.
#   4. Trigger the "Deploy staging" GitHub Actions workflow via the gh CLI
#      so the validation worker picks up the fresh calibration.
#
# Usage:
#   scripts/recalibrate.sh                 # full flow
#   scripts/recalibrate.sh --skip-commit   # regenerate + check only
#   scripts/recalibrate.sh --skip-deploy   # regenerate + commit, no dispatch
#   scripts/recalibrate.sh --update-baseline
#                                          # accept drift, refresh baseline
#                                          # and commit both files
#   scripts/recalibrate.sh --fly-app my-worker-staging
#                                          # override staging Fly app input
#
# Environment:
#   PYTHON            python interpreter to use (default: python3)
#   FLY_STAGING_APP   default value for the workflow's fly_app input
#   GH_WORKFLOW       workflow file to dispatch (default: deploy-staging.yml)
#   GIT_BRANCH        branch to commit onto (default: current HEAD)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

PYTHON="${PYTHON:-python3}"
GH_WORKFLOW="${GH_WORKFLOW:-deploy-staging.yml}"
REPORT="worker/calibration-report.json"
BASELINE="worker/calibration-baseline.json"

SKIP_COMMIT=0
SKIP_DEPLOY=0
UPDATE_BASELINE=0
FLY_APP="${FLY_STAGING_APP:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-commit)    SKIP_COMMIT=1 ;;
    --skip-deploy)    SKIP_DEPLOY=1 ;;
    --update-baseline) UPDATE_BASELINE=1 ;;
    --fly-app)        FLY_APP="${2:-}"; shift ;;
    -h|--help)
      sed -n '2,25p' "$0"
      exit 0
      ;;
    *)
      echo "unknown flag: $1" >&2
      exit 2
      ;;
  esac
  shift
done

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
err() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; }

require() {
  command -v "$1" >/dev/null 2>&1 || { err "missing required command: $1"; exit 2; }
}

require "$PYTHON"
require git

# 1) Calibrate.
log "Running $PYTHON worker/calibrate.py"
"$PYTHON" worker/calibrate.py

if [ ! -s "$REPORT" ]; then
  err "$REPORT was not produced by calibrate.py"
  exit 1
fi

# 2) Regression check (or baseline refresh).
if [ "$UPDATE_BASELINE" -eq 1 ]; then
  log "Updating baseline to match current report"
  "$PYTHON" linter-scripts/check-calibration-regression.py --update-baseline
else
  log "Checking regression vs $BASELINE"
  if ! "$PYTHON" linter-scripts/check-calibration-regression.py; then
    err "Calibration regressed vs baseline. Re-run with --update-baseline if intentional."
    exit 1
  fi
fi

# Build a short summary from the fresh report for the commit message.
SUMMARY=$("$PYTHON" - <<'PY'
import json, pathlib
r = json.loads(pathlib.Path("worker/calibration-report.json").read_text())
lines = []
for k, v in sorted((r.get("per_kind") or {}).items()):
    sep = v.get("separation") or {}
    lines.append(
        f"  {k}: thr={v.get('threshold', 0):.2f} "
        f"f1={v.get('f1', 0):.2f} "
        f"margin={sep.get('margin', 0):.2f} "
        f"mid={sep.get('midpoint', 0):.2f} "
        f"n={v.get('n', 0)}"
    )
print("\n".join(lines))
PY
)

# 3) Commit (only if something changed).
CHANGED_FILES=()
if ! git diff --quiet -- "$REPORT"; then CHANGED_FILES+=("$REPORT"); fi
if [ "$UPDATE_BASELINE" -eq 1 ] && ! git diff --quiet -- "$BASELINE"; then
  CHANGED_FILES+=("$BASELINE")
fi

if [ "$SKIP_COMMIT" -eq 1 ]; then
  log "--skip-commit set, leaving working tree changes in place"
  if [ "${#CHANGED_FILES[@]}" -gt 0 ]; then
    printf 'Changed: %s\n' "${CHANGED_FILES[@]}"
  fi
elif [ "${#CHANGED_FILES[@]}" -eq 0 ]; then
  log "No changes to $REPORT (calibration output identical). Skipping commit."
else
  BRANCH="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
  log "Committing on $BRANCH: ${CHANGED_FILES[*]}"
  git add -- "${CHANGED_FILES[@]}"
  MSG=$(printf 'chore(calibration): refresh calibration-report.json\n\n%s\n' "$SUMMARY")
  git commit -m "$MSG"
  echo "committed: $(git rev-parse --short HEAD)"
fi

# 4) Trigger staging redeploy.
if [ "$SKIP_DEPLOY" -eq 1 ]; then
  log "--skip-deploy set, not dispatching $GH_WORKFLOW"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  warn "gh CLI not installed, cannot dispatch $GH_WORKFLOW automatically."
  warn "Push the branch and rerun 'gh workflow run $GH_WORKFLOW' when ready."
  exit 0
fi

# Push the commit so the workflow runs against the new SHA (best-effort:
# skip when the branch has no upstream configured; the user can push
# manually).
if [ "$SKIP_COMMIT" -ne 1 ] && [ "${#CHANGED_FILES[@]}" -gt 0 ]; then
  BRANCH="${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
  if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
    log "Pushing $BRANCH"
    git push origin "$BRANCH"
  else
    warn "Branch $BRANCH has no upstream; skipping push. Set one with 'git push -u origin $BRANCH'."
  fi
fi

DISPATCH_ARGS=(workflow run "$GH_WORKFLOW")
if [ -n "$FLY_APP" ]; then
  DISPATCH_ARGS+=(-f "fly_app=$FLY_APP")
fi

log "Dispatching GitHub Actions: gh ${DISPATCH_ARGS[*]}"
gh "${DISPATCH_ARGS[@]}"

log "Done. Follow the run with: gh run watch --workflow $GH_WORKFLOW"