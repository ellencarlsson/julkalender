#!/usr/bin/env bash
# Smoke tests for the static site; exits non-zero on first failure.
set -euo pipefail
cd "$(dirname "$0")/.."

passed=0
fail() { echo "FAIL: $1"; exit 1; }
pass() { echo "PASS: $1"; passed=$((passed + 1)); }
check() { local name="$1"; shift; if "$@" >/dev/null 2>&1; then pass "$name"; else fail "$name"; fi; }

check_js_syntax() {
  local tmp
  tmp="$(mktemp -d)"
  cp "$1" "$tmp/check.mjs"
  node --check "$tmp/check.mjs"
}

check "index.html exists" test -f index.html
check "page shows Julkalender heading" grep -q "<h1>Julkalender</h1>" index.html
check "stylesheet is linked" grep -q 'href="style.css"' index.html
check "style.css exists" test -f style.css
check "viewport meta for mobile" grep -q 'name="viewport"' index.html
check "app.js loaded as module" grep -q '<script type="module" src="app.js">' index.html
check "sign-in button exists" grep -q 'id="sign-in-button"' index.html
check "sign-out button exists" grep -q 'id="sign-out-button"' index.html
check "user name placeholder exists" grep -q 'id="user-name"' index.html
check "firebase config has project id" grep -q 'projectId: "julkalender-db633"' firebase-config.js
check "app.js uses Google provider" grep -q "GoogleAuthProvider" app.js
check "app.js listens for auth state" grep -q "onAuthStateChanged" app.js
check "app.js has valid syntax" check_js_syntax app.js
check "firebase-config.js has valid syntax" check_js_syntax firebase-config.js
check "header shows level" grep -q 'id="level"' index.html
check "header shows XP progress bar" grep -q 'id="xp-fill"' index.html
check "header shows hint points" grep -q 'id="hint-points"' index.html
check "door overview grid exists" grep -q 'id="door-grid"' index.html
check "door view has task area" grep -q 'id="task-area"' index.html
check "door view has back link" grep -q 'class="back-link"' index.html
check "backpack view exists" grep -q 'data-view="backpack"' index.html
check "admin nav link hidden by default" grep -q 'id="admin-link" hidden' index.html
check "ui.js has valid syntax" check_js_syntax ui.js
check "admin panel is hidden by default" grep -qE '<section id="admin"[^>]* hidden>' index.html
check "content upload input exists" grep -q 'id="content-files"' index.html
check "reset progress button exists" grep -q 'id="reset-button"' index.html
check "admin.js has valid syntax" check_js_syntax admin.js
check "local content folder is gitignored" git check-ignore -q content/door-1.json
check "firestore.rules exists" test -f firestore.rules
check "firestore.rules uses server time" grep -q "request.time" firestore.rules
check "unit tests pass" node --test "tests/*.test.js"

echo "All $passed tests passed"
