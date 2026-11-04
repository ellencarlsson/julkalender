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
- **Spoiler protection:** the content file stores SHA-256 hashes of normalized
  answers instead of plain answers. Crossword solutions are stored per cell as
  hashes or similarly obfuscated. Clue texts and the final message are lightly
  obfuscated (not plain text in the source). True cryptographic secrecy is not
  a goal — the friend is not expected to reverse-engineer the code.
- **Time source:** the device clock is used for unlocking. Changing the phone's
  clock to cheat is accepted.
- **Who can sign in:** any Google account can sign in and gets its own
  separate progress. Only the admin email gets the all-doors preview.
- **Admin tools:** the admin view also gets a "reset my progress" button so
  Ellen can replay doors while testing. The admin's own progress is separate
  from the friend's.
- **Firestore layout:** one document per user, `users/{uid}`, holding
  completed task ids and collected clue ids. Security rules: a user can only
  read/write their own document. Ellen enables Firestore in the Firebase
  console (production mode, EU location); Claude provides the rules.
- **Content authoring pipeline:** readable door content (questions, answers,
  clues, final message) is written in a **gitignored** source folder on Ellen's
  machine. A Node script (`scripts/build-content.mjs`, run by hand, not part of
  deploy) turns it into the committed, served content file: answers become
  hashes and all other door text is obfuscated. Claude does the content edits
  and runs the script; Ellen approves. Risk accepted: the readable source
  exists only locally (no remote backup) — the builder should note this in the
  README.
- **Hide future doors:** because the whole door is obfuscated by the script,
  questions and challenges of unopened doors are not readable at a glance in
  the repo or browser either.
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
- Exact obfuscation method for clues and the final message.
- How the level-up moment is shown (simple feedback is enough for now).
