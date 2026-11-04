/** Tests for the temporary admin "Rensa lucka" tool (TEST_RESET_DOOR). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_EMAIL, canResetDoors, doorResetPlan } from "../lib/test-reset.js";

const DOOR = { tasks: [{ id: "korsord", type: "crossword" }, { id: "baka", type: "challenge" }] };

test("only the verified admin can reset doors", () => {
  assert.equal(canResetDoors({ email: ADMIN_EMAIL, emailVerified: true }), true);
  assert.equal(canResetDoors({ email: ADMIN_EMAIL, emailVerified: false }), false);
  assert.equal(canResetDoors({ email: "friend@example.com", emailVerified: true }), false);
  assert.equal(canResetDoors(null), false);
});

test("reset plan covers the door's tasks and crosswords", () => {
  const plan = doorResetPlan(5, DOOR, []);
  assert.deepEqual(plan.tasks, ["5-korsord", "5-baka"]);
  assert.deepEqual(plan.crosswords, ["5-korsord"]);
});

test("reset plan only picks correct words from this door", () => {
  const words = ["5-korsord|across-0-0", "15-korsord|across-0-0", "6-korsord|down-1-1", "5-korsord|down-0-2"];
  assert.deepEqual(doorResetPlan(5, DOOR, words).words, ["5-korsord|across-0-0", "5-korsord|down-0-2"]);
});

test("reset plan for a door without tasks is empty", () => {
  assert.deepEqual(doorResetPlan(3, null, ["3-x|a"]), { tasks: [], crosswords: [], words: [] });
});
