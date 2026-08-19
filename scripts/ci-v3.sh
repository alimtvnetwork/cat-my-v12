#!/usr/bin/env bash
# CI entrypoint for Plan 67 (v3 completion).
#
# Root cause of prior gap: Plan 67 verification was scattered across ad-hoc
# commands (typecheck, lint, magic-strings, axe, visual). Without one canonical
# entrypoint, closeout depended on remembering each command and its order,
# and drift went unnoticed. This script chains all gates in strict order and
# fails fast on the first non-zero exit.
#
# Usage: bash scripts/ci-v3.sh
set -euo pipefail

log() { printf '\n\033[1;36m[ci-v3]\033[0m %s\n' "$*"; }

log "1/5 generate routes"
bunx @tanstack/router-cli generate

log "2/5 typecheck (tsgo --noEmit)"
bunx tsgo --noEmit

log "2/5 eslint (--max-warnings=0)"
bunx eslint . --max-warnings=0

log "3/5 magic-strings check (strict)"
bash scripts/check-magic-strings.sh --strict

log "4/5 axe a11y sweep"
python tests/e2e/axe_a11y.py

log "5/6 editor visual regression"
python tests/e2e/editor_visual.py

log "6/6 route visual regression gate (plan 69)"
bun run visual:test

log "ci-v3 all gates passed"