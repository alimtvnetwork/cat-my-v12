#!/usr/bin/env bash
set -euo pipefail

# Forbid BE/** from importing sdk directly outside BE/sdk_facade/
echo "Checking for forbidden direct sdk imports in BE..."

# Search BE/ for "import sdk" or "from sdk" or similar, excluding BE/sdk_facade/
matches=$(git grep -E '^(import|from) +sdk\b' -- 'BE/' ':(exclude)BE/sdk_facade/' || true)

if [ -n "$matches" ]; then
    echo "ERROR: Direct sdk imports found outside BE/sdk_facade/:"
    echo "$matches"
    exit 1
fi

echo "Backend lint passed."
