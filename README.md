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

## Admin

Signed in as the admin account, the **Admin** view has **Nollställ min progress**,
which deletes the admin's own progress so doors can be replayed.

## Tests

```sh
scripts/test.sh
```
