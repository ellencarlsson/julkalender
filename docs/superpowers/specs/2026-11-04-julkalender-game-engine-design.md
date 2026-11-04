# Julkalender game engine — design

## Intent

A personal advent calendar for one friend, built as a small game. Ellen (the
owner) gives it to her friend for December 2026. Each day a new door opens with
tasks themed around things the friend loves (Harry Potter, League of Legends,
Red Dead Redemption, hats, Twilight, chokladbollar — more themes later).
Completing a door's tasks levels the friend up; reaching level 24 unlocks a
personal final message from Ellen.

This document covers the **game engine** only. The 24 doors' actual content is
a separate, later step: Claude drafts content per door, Ellen approves/edits.
The visual design ("how the calendar looks") is also deferred — Ellen wants to
decide that later.

## What already exists

- Static site on GitHub Pages: https://ellencarlsson.github.io/julkalender/
  (served from the `dev` branch, plain HTML/CSS/JS, no build step).
- Google sign-in via Firebase Authentication (Firebase JS SDK 13.2.0 from the
  gstatic CDN), working on desktop and mobile. Firebase project
  `julkalender-db633`, free Spark plan.
- `scripts/test.sh` smoke tests.

## Goals

1. **Doors.** 24 doors. Door N unlocks on December N, 2026 at 07:00
   Europe/Stockholm time. Before that it is visibly locked.
2. **Any order.** Every unlocked door can be played at any time, in any order.
   Missed doors can be caught up later.
3. **Tasks.** Each door contains one or more tasks. Task types:
   - **Quiz/riddle** — a question with a typed text answer.
   - **Crossword** — a grid with numbered clues; solved when every cell is
     correct. Some crosswords are "bigger" ones.
   - **Real-life challenge** — e.g. "bake chokladbollar". Completed by ticking
     a checkbox: "Jag lovar på heder och samvete att jag har gjort det". No
     photo upload (the friend texts Ellen a photo outside the app).
4. **XP and levels.** Each door is worth 100 XP, split between its tasks.
   All XP is summed across doors: level = floor(total XP / 100), and one
   progress bar shows XP toward the next level. Half of door 3 plus half of
   door 5 therefore gives one level. There are exactly 2400 XP in total, so
   level 24 is reached only when every task in every door is done. (Decided by
   Ellen.)
5. **Final message.** Reaching level 24 unlocks a final message written by
   Ellen.
6. **Clues backpack.** Some tasks award a clue when completed. Collected clues
   are shown in a "ryggsäck" (backpack). Clues help solve a bigger crossword in
   a later door. They are informational help only — nothing is gated on owning
   a clue.
7. **Saved per Google account.** Progress (completed tasks, collected clues)
   is stored per signed-in user in Firestore, so it follows the friend across
   phone and computer.
8. **Admin preview.** When signed in as `carlssonellen@live.se`, all 24 doors
   are open regardless of date, so Ellen can test everything (including on the
   live site and on mobile) while content is being built.

## Non-goals

- Photo uploads (Firebase Storage would require the paid Blaze plan).
- Multiplayer, leaderboards, sharing.
- The final visual design / theme of the calendar.
- Writing the 24 doors' real content (separate step).

## Anti-goals (would make it a failure even if it works)

- Anything that costs money or requires a credit card on Firebase.
- Answers or the final message readable at a glance in the public repo or the
  browser — spoiling the game for the friend.
- Progress lost between devices or after reload.
- Hard for Ellen to add/edit door content later.

## Constraints

- Free hosting only: GitHub Pages (public repo) + Firebase Spark plan
  (Authentication + Cloud Firestore).
- Plain HTML/CSS/JS ES modules, no build step, no npm runtime dependencies.
  Firebase SDK loaded from the gstatic CDN.
- Works well on mobile (the friend will mostly use her phone).
- Code style: max 20 lines per function; English code, comments and commits;
  UI text in Swedish.
- Tests: the full suite runs through `scripts/test.sh`. Game logic should live
  in pure modules testable with Node's built-in test runner (`node --test`).

## Decided by Ellen

- Door N opens December N at 07:00 Swedish time.
- Doors can be done in any order once open.
- One door = 100 XP = one level; sub-tasks share that XP; XP is summed
  across all doors (partial doors count toward the next level).
- Level 24 unlocks a final message.
- Real-life challenges use an honor checkbox, no photos.
- Clues from some doors help with a bigger crossword later.
- Claude drafts content, Ellen approves.
- Admin account: `carlssonellen@live.se` sees all doors.

## Claude's calls (Ellen can override)

- **XP split:** a door's level is split equally between its tasks unless the
  content specifies weights.
- **Answer checking:** answers compared after normalization (trim, lowercase,
  collapse whitespace; å/ä/ö kept as-is). Content may list several accepted
  answers.
- **Spoiler protection:** door content is not in the repo (see "Door content
  lives in Firestore"). Answers are stored only as SHA-256 hashes of the
  normalized answer, so even an opened door never reveals its solution.
  Crossword solutions are stored as per-cell hashes or similar.
- **Time source — server-enforced, not the device clock (decided by Ellen:
  changing the phone clock must not open doors).** Firestore security rules
  compare `request.time` (Google's server clock) with each door's unlock time
  (December N, 07:00 Europe/Stockholm = 06:00 UTC). Before that the read is
  denied. The client treats "permission denied" as locked; the device clock
  may only be used for cosmetic things like a countdown. The admin email can
  always read.
- **Who can sign in:** any Google account can sign in and gets its own
  separate progress. Only the admin email gets the all-doors preview.
- **Admin tools:** the admin view also gets a "reset my progress" button so
  Ellen can replay doors while testing. The admin's own progress is separate
  from the friend's.
- **User progress layout:** one document per user, `users/{uid}`, holding
  completed task ids, collected clue ids and partial crossword grids. Security rules: a user can only
  read/write their own document. Ellen enables Firestore in the Firebase
  console (production mode, EU location); Claude provides the rules.
- **Door content lives in Firestore:** one document per door, `doors/{n}`
  (questions, tasks, answer hashes, clue texts), plus `final/message` for the
  final message. Rules: `doors/{n}` readable by signed-in users only when
  `request.time >= unlock time of door n`; `final/message` readable from
  December 24 06:00 UTC and only shown by the client at level 24; admin email
  can read and write everything; nobody else can write. This keeps unopened
  doors and the final message out of the public repo and out of reach, so no
  client-side obfuscation is needed.
- **Content authoring pipeline:** readable content (one JSON file per door
  plus the final message) lives in a **gitignored** folder on Ellen's machine.
  The admin view has an "upload content" action: Ellen (or Claude, guiding her)
  picks the files, the browser hashes the answers (`crypto.subtle`) and writes
  the door documents to Firestore under her admin account. No service-account
  keys and no npm dependencies. Claude drafts and edits the JSON; Ellen
  approves and uploads. Risk accepted: the readable source exists only locally
  (no remote backup) — note this in the README.
- **Content format:** new doors are added by editing data, not code.
- **Crossword progress is saved:** partially filled crossword grids are stored
  in the user's Firestore document (debounced writes) so a bigger crossword can
  be continued on another device. "Reset my progress" clears them too.
- **Sample content:** the engine ships with a few placeholder doors (one per
  task type, one awarding a clue) so every mechanic can be tested before real
  content exists.
- **Look:** functional placeholder styling in the existing red/cream palette
  until the visual design is decided.

## Left to the builder

- Exact module structure, file names, and content schema.
- How the crossword grid is rendered and edited on mobile.
- How locked/open/completed doors are shown in the placeholder UI.
- How the level-up moment is shown (simple feedback is enough for now).
