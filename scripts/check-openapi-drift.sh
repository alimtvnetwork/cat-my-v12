#!/bin/bash

# check-openapi-drift.sh
# Validates that BE/openapi.snapshot.json is up-to-date with the live FastAPI app.
#
# Comparison is SEMANTIC (parsed JSON equality), not byte equality:
# the committed snapshot must also pass the CI prettier gate
# (prettier collapses short arrays, while json.dumps explodes them),
# so formatting-only differences are not drift. Any real API change —
# added/removed/changed routes, fields, defaults, or version — still
# fails this check.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TMP_FILE=$(mktemp)

if [ -f "BE/.venv/bin/python" ]; then
    PYTHON_CMD="BE/.venv/bin/python"
elif command -v uv &> /dev/null; then
    PYTHON_CMD="uv run --project BE python"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

echo "Generating current OpenAPI spec using $PYTHON_CMD..."

$PYTHON_CMD -c "
import json
import sys
import os
sys.path.insert(0, os.path.abspath('.'))
from BE.main import create_app
app = create_app()
with open('$TMP_FILE', 'w', encoding='utf-8') as f:
    f.write(json.dumps(app.openapi(), indent=2) + '\n')
"

if "$PYTHON_CMD" -c "
import json, sys
with open('BE/openapi.snapshot.json', encoding='utf-8') as f:
    snapshot = json.load(f)
with open('$TMP_FILE', encoding='utf-8') as f:
    live = json.load(f)
sys.exit(0 if snapshot == live else 1)
"; then
    echo "OK: OpenAPI spec is up-to-date."
    rm "$TMP_FILE"
    exit 0
else
    echo "ERROR: OpenAPI drift detected!"
    echo "The file BE/openapi.snapshot.json does not match the live application."
    echo "Please run Step 76 locally to update it."
    diff -u BE/openapi.snapshot.json "$TMP_FILE" || true
    rm "$TMP_FILE"
    exit 1
fi
