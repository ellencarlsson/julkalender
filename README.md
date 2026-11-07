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

**Temporary test door 25** is always locked, also for the admin, so the locked view can be
checked while building. Remove it before giving the calendar away: search for
`TEST_LOCKED_DOOR` (`lib/test-door.js` and its uses).

**Temporary "Rensa lucka" button** clears the signed-in user's own progress in one door
while testing. Remove it before giving the calendar away: search for `TEST_RESET_DOOR`
(`lib/test-reset.js` and its uses).

## Managing content from the terminal

There is no admin page; content and progress are managed with scripts in `tools/`
(run by Claude from the terminal).

**One-time setup**

1. Firebase console → Project settings → **Service accounts** → **Generate new private key**.
   Save the file as `tools/service-account.json` (gitignored — never commit it; it gives full
   database access).
2. `cd tools && npm install`

**Upload doors and the final message**

```sh
node tools/upload-content.mjs content/*.json
```

Write one JSON file per door plus `final.json` in the gitignored `content/` folder. All files
are validated first; if any is invalid nothing is uploaded. Uploading a door again replaces it.

To move a door, change `"door"` in its file (and the file name), upload it, then remove the old
number so it shows as not ready yet:

```sh
node tools/remove-door.mjs 8
```

> ⚠️ `content/` exists only on this machine and has no remote backup.

```json
{
  "door": 1,
  "title": "Harry Potter",
  "tasks": [
    { "id": "uggla", "type": "quiz", "question": "Vad heter Harrys uggla?", "answers": ["Hedwig", "Hedvig"], "clue": "Ledtråd till korsordet" },
    { "id": "baka", "type": "challenge", "description": "Baka chokladbollar" },
    { "id": "korsord", "type": "crossword", "weight": 2, "grid": ["JUL", "A#U", "GÅS"],
      "clues": [{ "number": 1, "direction": "across", "row": 0, "col": 0, "text": "Högtid i december" }] }
  ]
}
```

`final.json`: `{ "message": "..." }`.

`sidequests.json` holds **all** side quests (not tied to a door; visible from December 1 07:00).
Uploading it replaces the list, so a quest left out of the file is removed. Each completed side
quest gives `reward` hint points (default 1); revealing a crossword word costs one.

```json
{ "sidequests": [ { "id": "lol-stats", "text": "Få stats 10/0/5", "reward": 1 } ] }
```

 Task `id` must be unique within the door; `weight`
(default 1) splits the door's 100 XP; `clue` is optional. In a crossword `grid`, `#` is a
black square and clue `row`/`col` are the 0-based start cell.

**Reset someone's progress**

```sh
node tools/reset-progress.mjs carlssonellen@live.se   # or a uid
```

## Version stamps (cache busting)

GitHub Pages lets browsers cache files for 10 minutes. To stop a browser from mixing old and
new files after a deploy, every local JS module and `style.css` is loaded through a
content-hashed URL from the import map in `index.html`. After changing any `.js` or `.css` file:

```sh
node scripts/stamp-versions.mjs
```

`scripts/test.sh` fails if the stamps are out of date. If the app still fails to load, the page
shows "Något gick fel när sidan laddades" with a reload button instead of going blank.

## Tests

```sh
scripts/test.sh
```

## Image credits

- `images/door-11/hatt-sorteringshatten.webp` — cropped from "The Sorting Hat" by Chad Sparkes, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Sorting_Hat_(16263996296).jpg)
- `images/door-11/hatt-tomteluva.webp` — cropped from "Santa Claus cap" by Tuphuggy, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Santa_Claus_cap.jpg); this crop is shared under the same licence
- `images/door-3/mamma-mu.webp` — Mamma Mu illustration by Sven Nordqvist, from the books by Jujja Wieslander
- `images/icons/sidequests.webp`, `images/icons/kalender.webp` — made by Ellen with Google Gemini
- `images/icons/ryggsack.webp` — cut out from a Haglöfs Corker Medium product photo (© Haglöfs)
- `images/door-11/hatt-arthur.webp` — cropped from Ellen's own Red Dead Redemption 2 screenshot (game art © Rockstar Games)
- `images/door-23/{edward,alice,jasper,bella,jane}.webp` — Twilight Saga promotional stills (© Summit Entertainment), from screenshots Ellen saved
- `images/door-23/{tonks,sirius,trelawney}.webp` — Harry Potter film stills (© Warner Bros.), from screenshots Ellen saved
- `images/door-23/{eleven,kali,will,vecna}.webp` — Stranger Things stills (© Netflix), from screenshots Ellen saved
- `images/door-1/mobs/*` — Minecraft mob renders from the [Minecraft Wiki](https://minecraft.wiki/), Minecraft © Mojang, used under Mojang's [usage guidelines](https://www.minecraft.net/en-us/usage-guidelines)
- `images/door-11/hatt-twisted-fate.webp`, `images/door-11/hatt-teemo.webp`, `images/door-23/{teemo,ezreal,blitzcrank,lux,thresh}.webp`, `images/lol/*` — League of Legends art © Riot Games, used under Riot's [Legal Jibber Jabber](https://www.riotgames.com/en/legal) fan content policy
- `images/door-17/flagga-*.svg` — [flag-icons](https://github.com/lipis/flag-icons) (MIT); `images/door-17/kontur-*.svg` drawn from [Natural Earth](https://www.naturalearthdata.com/) (public domain)
