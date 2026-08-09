#!/usr/bin/env bash
# Render every tracked .mmd file with mmdc and fail on any diagram that
# does not render, or (when a snapshot exists) whose hash drifts from the
# committed snapshot.
#
# Snapshots live next to the source as ``<name>.mmd.sha256`` and pin the
# sha256 of the rendered SVG. Regenerate with ``--update``.
#
# Usage:
#   scripts/render-mmd-check.sh          # verify (CI)
#   scripts/render-mmd-check.sh --update # refresh committed snapshots

set -euo pipefail

MODE="verify"
if [[ "${1:-}" == "--update" ]]; then MODE="update"; fi

if ! command -v mmdc >/dev/null 2>&1; then
  echo "mmdc not on PATH. Install with: npm i -g @mermaid-js/mermaid-cli" >&2
  exit 2
fi

# Only render diagrams we author; skip fixtures used by the map linter.
mapfile -t FILES < <(git ls-files '*.mmd' | grep -v '^linter-scripts/fixtures/' || true)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "no .mmd files to render"; exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Create puppeteer config to disable sandbox for CI (Ubuntu AppArmor issues)
echo '{"args": ["--no-sandbox"]}' > "$TMP/puppeteer-config.json"

fail=0
for src in "${FILES[@]}"; do
  out="$TMP/$(echo "$src" | tr '/' '_').svg"
  if ! mmdc -i "$src" -o "$out" -q -p "$TMP/puppeteer-config.json" >"$TMP/mmdc.log" 2>&1; then
    echo "RENDER FAIL: $src" >&2
    sed 's/^/  /' "$TMP/mmdc.log" >&2
    fail=1
    continue
  fi
  hash="$(sha256sum "$out" | cut -d' ' -f1)"
  snap="${src}.sha256"
  if [[ "$MODE" == "update" ]]; then
    echo "$hash" > "$snap"
    echo "UPDATED $snap"
    continue
  fi
  if [[ -f "$snap" ]]; then
    want="$(cat "$snap" | tr -d '[:space:]')"
    if [[ "$hash" != "$want" ]]; then
      echo "SNAPSHOT DRIFT: $src" >&2
      echo "  expected $want" >&2
      echo "  actual   $hash" >&2
      echo "  fix: rerun the generator, then \`scripts/render-mmd-check.sh --update\`" >&2
      fail=1
    else
      echo "OK $src"
    fi
  else
    echo "OK $src (no snapshot; add one with --update to lock)"
  fi
done

exit "$fail"
