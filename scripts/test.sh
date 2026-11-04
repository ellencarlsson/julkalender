#!/usr/bin/env bash
# Smoke tests for the static site; exits non-zero on first failure.
set -euo pipefail
cd "$(dirname "$0")/.."

passed=0
fail() { echo "FAIL: $1"; exit 1; }
pass() { echo "PASS: $1"; passed=$((passed + 1)); }

[ -f index.html ] && pass "index.html exists" || fail "index.html exists"
grep -q "<h1>Julkalender</h1>" index.html && pass "page shows Julkalender heading" || fail "page shows Julkalender heading"
grep -q 'href="style.css"' index.html && pass "stylesheet is linked" || fail "stylesheet is linked"
[ -f style.css ] && pass "style.css exists" || fail "style.css exists"
grep -q 'name="viewport"' index.html && pass "viewport meta for mobile" || fail "viewport meta for mobile"

echo "All $passed tests passed"
