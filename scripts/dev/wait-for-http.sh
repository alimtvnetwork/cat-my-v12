#!/usr/bin/env bash
# Usage: ./wait-for-http.sh http://localhost:8787/health 30
URL=$1
TIMEOUT_SEC=${2:-30}

START=$(date +%s)
while true; do
  if curl -s -f "$URL" > /dev/null; then
    exit 0
  fi
  NOW=$(date +%s)
  if [ $((NOW - START)) -gt $TIMEOUT_SEC ]; then
    echo "Timeout waiting for $URL" >&2
    exit 1
  fi
  sleep 1
done
