#!/bin/bash
# Smoke test — run after deploy to verify production is working.
# Usage: ./smoke-test.sh

URL="https://pgnlens.com"
PASSED=0
FAILED=0

echo "=== Smoke Testing $URL ==="

check() {
    if [ $1 -eq 0 ]; then
        echo "  ✓ $2"
        PASSED=$((PASSED + 1))
    else
        echo "  ✗ $2"
        FAILED=$((FAILED + 1))
    fi
}

# Homepage loads
curl -sf "$URL/" > /dev/null
check $? "Homepage loads"

# API responds
curl -sf "$URL/api/games/" > /dev/null
check $? "Games API responds"

# Registration endpoint exists (405 = Method Not Allowed for GET, which is correct)
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$URL/api/auth/registration/")
[ "$STATUS" = "405" ]
check $? "Registration endpoint exists (got $STATUS)"

# Static assets load
curl -sf "$URL/data/eco.json" > /dev/null
check $? "ECO data loads"

curl -sf "$URL/static/assets/" > /dev/null 2>&1
# Just check any CSS/JS file loads — grab filename from index.html
JS_FILE=$(curl -sf "$URL/" | grep -o 'assets/index-[^"]*\.js' | head -1)
if [ -n "$JS_FILE" ]; then
    curl -sf "$URL/static/$JS_FILE" > /dev/null
    check $? "JS bundle loads ($JS_FILE)"
else
    echo "  ⊘ Could not find JS bundle filename (OK if SPA)"
fi

# Sound files accessible
curl -sf "$URL/sound/lichess/standard/Move.mp3" > /dev/null
check $? "Sound files accessible"

# Piece images accessible
curl -sf "$URL/piece/cburnett/wK.svg" > /dev/null 2>&1
check $? "Piece images accessible"

echo ""
echo "=== Results: $PASSED passed, $FAILED failed ==="

if [ $FAILED -gt 0 ]; then
    exit 1
fi
