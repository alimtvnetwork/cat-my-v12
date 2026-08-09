#!/usr/bin/env bash
# One-shot installer: point git at the versioned hooks directory.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
echo "installed: core.hooksPath = .githooks"
echo "hook: .githooks/pre-commit (runs check-ui-backend-map.py --strict-schema + check-ipc-examples.py)"
echo "bypass a single commit with: git commit --no-verify"
