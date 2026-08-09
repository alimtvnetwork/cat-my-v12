#!/usr/bin/env bash
# Plan 43 slice-2 step 8 (v3.223.0): magic-string guard.
#
# Fails if raw literals that now have a dedicated `src/lib/constants/` leaf
# reappear inside `src/` outside the constants module itself. Complements the
# ESLint `no-restricted-syntax` rule for surfaces ESLint cannot reach
# (comments? no, JSX attributes? yes, template literals, etc.).
#
# Exit codes:
#   0 clean
#   0 advisory mode (default): violations printed, exit 0 so pre-migration
#     code keeps building. Pass `--strict` (or CHECK_MAGIC_STRINGS_STRICT=1)
#     to exit 1 on any violation once Plan 45 migration has landed.
#   1 strict mode: violations found
#   2 tooling missing

set -euo pipefail

STRICT=0
if [ "${1:-}" = "--strict" ] || [ "${CHECK_MAGIC_STRINGS_STRICT:-0}" = "1" ]; then
  STRICT=1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "check-magic-strings: ripgrep (rg) is required" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Search scope: src/ minus the constants module itself and generated files.
SCOPE=(src --glob '!src/lib/constants/**' --glob '!src/routeTree.gen.ts')

# Patterns to ban. Each entry: "label|regex".
PATTERNS=(
  'HttpMethod|"(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)"'
  'StorageKey|"(ca\.debug\.captureRequestPanel\.collapsed|ca\.captureHistory\.v1|editor\.previewMode\.v1|editor\.previewDebugOverlay\.v1|ca\.settings\.camera\.controls|ca\.uiPrefs\.v1|ca\.referenceImage\.v1|ca\.activeProgram\.v1|ca:projects:list-prefs:v1|ca\.sample\.selection\.v1)"'
  'AppEvent|"(editor:open-inspector|editor-reference-ready|ca:bug-error|ca:menu-command)"'
)

violations=0
for entry in "${PATTERNS[@]}"; do
  label="${entry%%|*}"
  regex="${entry#*|}"
  # rg exits 1 when no matches: swallow that but keep other errors.
  matches=$(rg -n --no-heading -e "$regex" "${SCOPE[@]}" || true)
  if [ -n "$matches" ]; then
    echo "== $label violations =="
    echo "$matches"
    echo
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "check-magic-strings: $violations pattern group(s) with violations."
  echo "Import the matching constant from '@/lib/constants' instead."
  if [ "$STRICT" = "1" ]; then
    exit 1
  fi
  echo "(advisory mode: exiting 0. Run with --strict to fail CI.)"
  exit 0
fi

echo "check-magic-strings: clean."
exit 0