# julkalender

A personal advent calendar web page.

Live: https://ellencarlsson.github.io/julkalender/

## Firestore setup

1. In the [Firebase console](https://console.firebase.google.com/project/julkalender-db633/firestore),
   create a Cloud Firestore database: **production mode**, EU location (e.g. `eur3`).
2. Open **Firestore → Rules**, replace the contents with [`firestore.rules`](firestore.rules)
   and click **Publish**. Re-publish whenever the file changes.

Door N opens December N, 2026 at 07:00 Swedish time, enforced by Google's server
clock in the rules. The admin account sees all doors.

## Door content

Door content never goes in the repo, so the friend can't read answers on GitHub.

- Write one JSON file per door plus `final.json` in the gitignored `content/` folder.
  The format is shown in [`sample-content/`](sample-content/) (placeholder doors 1-3:
  quiz with a clue, real-life challenge, crossword).
- Sign in as the admin account, choose the files under **Admin → Ladda upp innehåll**
  and upload. The browser validates every file and hashes the answers before writing
  to Firestore; if any file is invalid nothing is uploaded. Uploading a door again
  replaces it.
- **Nollställ min progress** deletes the admin's own progress so doors can be replayed.

> ⚠️ `content/` exists only on this machine and has no remote backup. Back it up yourself
> (e.g. a private cloud folder) — losing it means rewriting the readable content.

### Format

| Field | Notes |
|---|---|
| `door` | 1-24 |
| `title` | optional |
| `tasks[].id` | unique within the door; changing it later resets that task's progress |
| `tasks[].type` | `quiz` (`question`, `answers`), `challenge` (`description`) or `crossword` (`grid`, `clues`) |
| `tasks[].weight` | optional, default 1; the door's 100 XP is split by weight |
| `tasks[].clue` | optional text put in the backpack when the task is completed |

Crossword `grid` is a list of equal-length rows, `#` marks a black square. Each clue
has `number`, `direction` (`across`/`down`), `row`, `col` (0-based start cell) and `text`.
Answers are compared case-insensitively with extra spaces ignored.

## Tests

```sh
scripts/test.sh
```
