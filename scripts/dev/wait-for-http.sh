#!/usr/bin/env bash
# Usage: ./wait-for-http.sh http://localhost:8787/health 30
#   or:  ./wait-for-http.sh http://localhost:8787/healthz http://localhost:8080/ 30
# All arguments except an optional trailing numeric timeout are URLs. The
# call succeeds when EVERY URL answers (run-efficiency 6.1.2: one combined
# wait, so wall time is the slowest service, not the sum); each service
# still gets the full timeout from this call's start, and the timeout
# message names the services still pending. A single URL plus timeout
# behaves exactly as before.
URLS=()
TIMEOUT_SEC=30
for arg in "$@"; do
  URLS+=("$arg")
done
# A lone numeric argument is a timeout with zero URLs, not a URL:
# stripping applies from one argument up, so a bare timeout falls
# into the empty-URLS usage error below instead of polling a
# nonsense "URL" until the default timeout (F6).
if [ "$#" -ge 1 ]; then
  last_index=$((${#URLS[@]} - 1))
  last="${URLS[$last_index]}"
  case "$last" in
    ''|*[!0-9]*) ;;
    *) TIMEOUT_SEC="$last"; unset "URLS[$last_index]" ;;
  esac
fi
if [ "${#URLS[@]}" -eq 0 ]; then
  echo "Usage: ./wait-for-http.sh <url>... [timeout-seconds]" >&2
  exit 1
fi

# Poll interval is 0.5s (was 1s): localhost probes are cheap and this halves
# average readiness-detection latency. The fallback keeps 1s on systems
# whose sleep rejects fractions, so a bad sleep can never busy-loop.
START=$(date +%s)
while true; do
  PENDING=()
  for url in "${URLS[@]}"; do
    if ! curl -s -f "$url" > /dev/null; then
      PENDING+=("$url")
    fi
  done
  if [ "${#PENDING[@]}" -eq 0 ]; then
    exit 0
  fi
  NOW=$(date +%s)
  if [ $((NOW - START)) -gt $TIMEOUT_SEC ]; then
    echo "Timeout waiting for ${PENDING[*]}" >&2
    exit 1
  fi
  sleep 0.5 2>/dev/null || sleep 1
done
