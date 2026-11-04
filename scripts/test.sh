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

check_local_imports() {
  local file target
  for file in *.js lib/*.js; do
    for target in $(grep -oE 'from "\./[^"]+"' "$file" | sed -E 's/from "(.*)"/\1/'); do
      test -f "$(dirname "$file")/$target" || { echo "$file imports missing $target"; return 1; }
    done
  done
}

check_sign_out_in_footer() {
  sed -n '/<footer class="app-footer">/,/<\/footer>/p' index.html | grep -q 'id="sign-out-button"' \
    && ! sed -n '/<header/,/<\/header>/p' index.html | grep -q 'id="sign-out-button"'
}

check "index.html exists" test -f index.html
check "page shows Julkalender heading" grep -q "<h1>Julkalender</h1>" index.html
check "stylesheet is linked" grep -q 'href="style.css"' index.html
check "style.css exists" test -f style.css
check "viewport meta for mobile" grep -q 'name="viewport"' index.html
check "app.js loaded as module" grep -q '<script type="module" src="app.js">' index.html
check "sign-in button exists" grep -q 'id="sign-in-button"' index.html
check "sign-out button exists" grep -q 'id="sign-out-button"' index.html
check "sign-out button sits in the footer" check_sign_out_in_footer
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
check "ui.js has valid syntax" check_js_syntax ui.js
check "firestore.rules exists" test -f firestore.rules
check "firestore.rules uses server time" grep -q "request.time" firestore.rules
check "all local imports exist" check_local_imports
check "unit tests pass" node --test "tests/*.test.js"

echo "All $passed tests passed"
