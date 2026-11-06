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
  for file in *.js lib/*.js tools/*.js tools/*.mjs; do
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
check "page shows the one-line Haris Julkalender title image" grep -q '<img src="./images/theme/title-oneline.webp" alt="Haris Julkalender"' index.html
check "title image exists" test -f images/theme/title-oneline.webp
check "same title image on mobile and desktop" bash -c '! grep -q "<picture\|title-wide-v2\|images/theme/title.png" index.html'
check "browser tab title is Haris Julkalender" grep -q "<title>Haris Julkalender</title>" index.html
check "title has no Santa hats" bash -c '! grep -q "class=\"hat\"" index.html && ! grep -q "\.hat" style.css'
check "stylesheet is linked" grep -q 'rel="stylesheet" href="./style.css' index.html
check "style.css exists" test -f style.css
check "viewport meta for mobile" grep -q 'name="viewport"' index.html
check "app.js loaded as module" grep -qE '<script type="module" src="\./app\.js\?v=[0-9a-f]{10}">' index.html
check "every local module has a versioned import map entry" bash -c 'for f in *.js lib/*.js; do grep -qE "\"\./$f\": \"\./$f\?v=[0-9a-f]{10}\"" index.html || { echo "missing $f"; exit 1; }; done'
check "stylesheet is versioned" grep -qE 'href="\./style\.css\?v=[0-9a-f]{10}"' index.html
check "version stamps are up to date" node scripts/stamp-versions.mjs --check
check "palette is defined as CSS variables" bash -c 'for v in --bg --surface --surface-raised --cell --gold --cream; do grep -q "^  $v:" style.css || exit 1; done'
check "no bright filled surfaces (cream only for text and accents)" bash -c '! grep -nE "background: (var\(--cream\)|#f3d9a4|#d8efc9|#fff)" style.css'
check "no ✅ emoji anywhere in the UI" bash -c '! grep -rq "✅" *.js lib/*.js style.css index.html'
check "square checkmark icon defined" grep -q "check-mask" style.css
check "footer is pushed to the bottom of the page" bash -c 'sed -n "/^\.app-footer {/,/^}/p" style.css | grep -q "margin-top: auto"'
check "load-error fallback exists" grep -q 'id="load-error"' index.html
check "app marks itself ready for the fallback" grep -q "dataset.appReady" app.js
check "sign-in button exists" grep -q 'id="sign-in-button"' index.html
check "sign-out button exists" grep -q 'id="sign-out-button"' index.html
check "sign-out button sits in the footer" check_sign_out_in_footer
check "user name placeholder exists" grep -q 'id="user-name"' index.html
check "firebase config has project id" grep -q 'projectId: "julkalender-db633"' firebase-config.js
check "app.js uses Google provider" grep -q "GoogleAuthProvider" app.js
check "app.js listens for auth state" grep -q "onAuthStateChanged" app.js
check "app.js has valid syntax" check_js_syntax app.js
check "firebase-config.js has valid syntax" check_js_syntax firebase-config.js
check "header shows level number" grep -q 'id="level"' index.html
check "level ring is a progressbar" grep -qE 'id="level-ring"[^>]*role="progressbar"' index.html
check "doors icon button in nav" grep -qE '<a href="#/"[^>]*class="icon-button"[^>]*aria-label="Luckor"' index.html
check "no greeting in header" bash -c '! sed -n "/<header/,/<\/header>/p" index.html | grep -q "Hej,"'
check "signed-in name in footer" bash -c 'sed -n "/<footer/,/<\/footer>/p" index.html | grep -q "Inloggad som: <span id=\"user-name\">"'
check "hint points circle links to the side quests" grep -qE '<a href="#/sidequests" id="hint-circle"' index.html
check "backpack no longer shows hint points" bash -c '! sed -n "/view-backpack/,/<\/section>/p" index.html | grep -qi "ledtrådspoäng"'
check "side quests view exists" grep -q 'data-view="sidequests"' index.html
check "sidequest-view.js has valid syntax" check_js_syntax sidequest-view.js
check "title comes before the header controls" bash -c '[ "$(grep -n "<h1" index.html | cut -d: -f1)" -lt "$(grep -n "<header" index.html | cut -d: -f1)" ]'
check "header is not pulled out of the page flow" bash -c '! sed -n "/^\.game-header {/,/}/p" style.css | grep -q "position: absolute"'
check "door overview grid exists" grep -q 'id="door-grid"' index.html
check "no Luckor heading above the doors" bash -c '! grep -q "<h2>Luckor</h2>" index.html'
check "door view has task area" grep -q 'id="task-area"' index.html
check "door view has no back link" bash -c '! grep -q "back-link" index.html'
check "door view shows no door title" bash -c '! grep -q "door-subtitle" index.html door-view.js'
check "door number uses the handwritten script font" grep -q "Dancing Script" style.css
check "no task type labels in the door view" bash -c '! grep -nE "TASK_TYPE_LABELS|\"Utmaning\"|\"Fråga\"" door-view.js'
check "backpack view exists" grep -q 'data-view="backpack"' index.html
check "backpack opened by icon button" grep -qE '<a href="#/backpack"[^>]*class="icon-button"[^>]*aria-label="Ryggsäck"' index.html
check "no text Ryggsäck link in nav" bash -c '! grep -q ">Ryggsäck</a>" index.html'
check "ui.js has valid syntax" check_js_syntax ui.js
check "doors.js has valid syntax" check_js_syntax doors.js
check "door-view.js has valid syntax" check_js_syntax door-view.js
check "no honor checkbox left anywhere" bash -c '! grep -rqiE "heder och samvete|honor" *.js lib style.css'
check "progress.js has valid syntax" check_js_syntax progress.js
check "hint-tracker.js has valid syntax" check_js_syntax hint-tracker.js
check "sidequests.js has valid syntax" check_js_syntax sidequests.js
check "side quests readable only from door 1 unlock (or admin)" grep -q "match /sidequests/{quest}" firestore.rules
check "quiz-view.js has valid syntax" check_js_syntax quiz-view.js
check "matching-view.js has valid syntax" check_js_syntax matching-view.js
check "task-ui.js has valid syntax" check_js_syntax task-ui.js
check "reset button is wired into the door view" grep -q "resetHandler(number, result.door, progress)" app.js
check "crossword-view.js has valid syntax" check_js_syntax crossword-view.js
check "level-tracker.js has valid syntax" check_js_syntax level-tracker.js
check "level-up message element exists" grep -q 'id="level-up"' index.html
check "door content rendered as text, never HTML" bash -c '! grep -n "innerHTML" *.js'
check "tools/upload-content.mjs has valid syntax" check_js_syntax tools/upload-content.mjs
check "tools/reset-progress.mjs has valid syntax" check_js_syntax tools/reset-progress.mjs
check "tools/firebase-admin.js has valid syntax" check_js_syntax tools/firebase-admin.js
check "service account key is gitignored" git check-ignore -q tools/service-account.json
check "local content folder is gitignored" git check-ignore -q content/door-1.json
check "website never imports the admin SDK" bash -c '! grep -l "firebase-admin" *.js lib/*.js'
check "firestore.rules exists" test -f firestore.rules
check "firestore.rules uses server time" grep -q "request.time" firestore.rules
check "task images have a renderer (regression #101)" grep -q "^function taskImage" door-view.js
check "door view has prev/next arrows" grep -q "id=\"next-door\"" index.html
check "block-pager.js has valid syntax" check_js_syntax block-pager.js
check "final-message.js has valid syntax" check_js_syntax final-message.js
check "doors with examples page their tasks beside the examples" grep -q "^function examplesLayout" door-view.js
check "a solved quiz tells the pager to move on" grep -q '"task-solved"' quiz-view.js
check "a solved quiz keeps the typed answer" grep -q "solvedState(ctx.task, answer)" quiz-view.js
check "door 22 formulas draw letters as strokes, never font text" bash -c '! grep -l "<text" images/door-22/*.svg'
check "exam quizzes get the teacher's tick when solved" grep -q "task.exam ? examTick() : checkIcon()" quiz-view.js
check "backpack-view.js has valid syntax" check_js_syntax backpack-view.js
check "all local imports exist" check_local_imports
check "unit tests pass" node --test "tests/*.test.js"

echo "All $passed tests passed"
