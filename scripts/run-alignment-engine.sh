#!/usr/bin/env bash
# Run the vertical-centering + wrap/truncate Playwright suites under a
# specific browser engine. Reports and screenshots are written to
# tests/reports/<name>-<engine>/ so runs across engines don't overwrite
# each other.
#
# Usage:  scripts/run-alignment-engine.sh webkit
#         scripts/run-alignment-engine.sh chromium
set -euo pipefail
ENGINE="${1:-webkit}"
export E2E_BROWSER="$ENGINE"

echo "== Installing Playwright $ENGINE =="
python3 -m playwright install "$ENGINE" >/dev/null

echo "== padding_tokens_visual.py [$ENGINE] =="
python3 tests/e2e/padding_tokens_visual.py

echo "== padding_tokens_wrap.py [$ENGINE] =="
python3 tests/e2e/padding_tokens_wrap.py

echo "== item_rows_long_labels.py [$ENGINE] =="
python3 tests/e2e/item_rows_long_labels.py

echo "All alignment suites passed on $ENGINE."
