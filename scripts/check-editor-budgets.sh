#!/usr/bin/env bash
# Enforce file-size caps per typescript.md rule 7 (80-100 lines target).
# Warns 100-160, fails >160. Excludes generated + shadcn UI primitives.
set -euo pipefail

WARN=100
FAIL=160
STATUS=0

while IFS= read -r -d '' f; do
  case "$f" in
    src/routeTree.gen.ts|src/components/ui/*) continue ;;
  esac
  lines=$(wc -l < "$f")
  if [ "$lines" -gt "$FAIL" ]; then
    echo "FAIL $lines  $f"
    STATUS=1
  elif [ "$lines" -gt "$WARN" ]; then
    echo "WARN $lines  $f"
  fi
done < <(find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0)

exit "$STATUS"
