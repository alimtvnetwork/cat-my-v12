#!/usr/bin/env bash
# Plan 89 Step 5: Verification pattern automation

API_BASE="${API_BASE:-http://127.0.0.1:8000}"

echo "=== API Envelope Verification ==="
echo "Base URL: $API_BASE"
echo ""

ROUTES=("/healthz" "/meta" "/rules" "/samples")
FAILED=0

for route in "${ROUTES[@]}"; do
    echo "Checking $route..."
    RESP=$(curl -s -w "\n%{http_code}" "$API_BASE$route")
    HTTP_CODE=$(echo "$RESP" | tail -n1)
    BODY=$(echo "$RESP" | sed '$d')

    echo "   HTTP $HTTP_CODE"
    
    # Check envelope schema using jq
    if echo "$BODY" | jq -e '(.Status | has("IsSuccess")) and (.Attributes | has("RequestedAt")) and (.Results | type == "array")' > /dev/null 2>&1; then
        echo "   ✅ Envelope schema is valid."
    else
        echo "   ❌ Envelope invalid or missing."
        echo "      Body: $BODY"
        FAILED=1
    fi
    echo ""
done

if [ "$FAILED" -eq 0 ]; then
    echo "=== Verification Complete: ALL PASS ==="
    exit 0
else
    echo "=== Verification Complete: FAILED ==="
    exit 1
fi
