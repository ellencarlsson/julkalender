/** Tests for the temporary "Rensa lucka" tool (TEST_RESET_DOOR). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { doorResetPlan } from "../lib/test-reset.js";

const DOOR = { tasks: [{ id: "korsord", type: "crossword" }, { id: "baka", type: "challenge" }] };

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

test("resetting a door also clears a saved sudoku", () => {
  const door = { tasks: [{ id: "sudoku", type: "sudoku" }] };
  assert.deepEqual(doorResetPlan(3, door, []).crosswords, ["3-sudoku"]);
});

test("resetting a door also clears a catch game's saved level", () => {
  const door = { tasks: [{ id: "fanga", type: "catch" }] };
  assert.deepEqual(doorResetPlan(3, door, []).crosswords, ["3-fanga"]);
});

test("resetting a door also clears a saved puzzle", () => {
  const door = { tasks: [{ id: "pussel", type: "puzzle" }] };
  assert.deepEqual(doorResetPlan(12, door, []).crosswords, ["12-pussel"]);
});
