/** Tests for door unlock times and their sync with firestore.rules. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CALENDAR_YEAR,
  DOOR_COUNT,
  UNLOCK_HOUR_UTC,
  doorUnlockTime,
  finalMessageUnlockTime,
  isDoorUnlocked,
  isValidDoor,
} from "../lib/unlock-time.js";

const ONE_MS = 1;

test("door 1 unlocks December 1 at 06:00 UTC", () => {
  assert.equal(doorUnlockTime(1).toISOString(), "2026-12-01T06:00:00.000Z");
});

test("door 24 unlocks December 24 at 06:00 UTC", () => {
  assert.equal(doorUnlockTime(24).toISOString(), "2026-12-24T06:00:00.000Z");
});

test("unlock time is 07:00 in Stockholm", () => {
  const stockholm = doorUnlockTime(13).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });
  assert.equal(stockholm, "2026-12-13 07:00:00");
});

test("every door unlocks exactly one day after the previous", () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  for (let door = 2; door <= DOOR_COUNT; door++) {
    assert.equal(doorUnlockTime(door) - doorUnlockTime(door - 1), ONE_DAY_MS);
  }
});

test("door is locked one millisecond before unlock time", () => {
  const justBefore = new Date(doorUnlockTime(5).getTime() - ONE_MS);
  assert.equal(isDoorUnlocked(5, justBefore), false);
});

test("door is unlocked exactly at unlock time", () => {
  assert.equal(isDoorUnlocked(5, doorUnlockTime(5)), true);
});

test("earlier doors stay unlocked later in December", () => {
  assert.equal(isDoorUnlocked(1, new Date("2026-12-31T23:00:00Z")), true);
});

test("final message unlocks with door 24", () => {
  assert.equal(finalMessageUnlockTime().toISOString(), "2026-12-24T06:00:00.000Z");
});

test("only integers 1-24 are valid doors", () => {
  assert.equal(isValidDoor(1), true);
  assert.equal(isValidDoor(24), true);
  for (const invalid of [0, 25, -1, 1.5, "1", null, undefined, NaN]) {
    assert.equal(isValidDoor(invalid), false, `expected ${invalid} to be invalid`);
  }
});

test("invalid door throws", () => {
  assert.throws(() => doorUnlockTime(0), RangeError);
  assert.throws(() => doorUnlockTime(25), RangeError);
});

test("firestore.rules uses the same unlock schedule", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, new RegExp(`timestamp\\.date\\(${CALENDAR_YEAR}, 12, day\\)`));
  assert.match(rules, new RegExp(`duration\\.value\\(${UNLOCK_HOUR_UTC}, 'h'\\)`));
  assert.match(rules, /unlockTime\(24\)/);
  assert.match(rules, /\^\(\[1-9\]\|1\[0-9\]\|2\[0-4\]\)\$/);
});
