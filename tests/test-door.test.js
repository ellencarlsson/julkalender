/** Tests for the temporary always-locked test door (TEST_LOCKED_DOOR). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TEST_LOCKED_DOOR, isShownDoor } from "../lib/test-door.js";
import { isValidDoor } from "../lib/unlock-time.js";

test("test door is 25 and not a real door", () => {
  assert.equal(TEST_LOCKED_DOOR, 25);
  assert.equal(isValidDoor(TEST_LOCKED_DOOR), false);
});

test("shown doors are 1-24 plus the test door", () => {
  assert.equal(isShownDoor(1), true);
  assert.equal(isShownDoor(24), true);
  assert.equal(isShownDoor(25), true);
  assert.equal(isShownDoor(0), false);
  assert.equal(isShownDoor(26), false);
});

test("rules only let anyone, including the admin, read doors 1-24", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const doorRule = rules.slice(rules.indexOf("match /doors/{door}"), rules.indexOf("match /final"));
  assert.match(doorRule, /allow read: if isValidDoor\(door\)\s*&& \(isAdmin\(\)/);
});
