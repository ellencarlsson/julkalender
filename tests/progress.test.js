/** Tests for progress keys and parsing the users/{uid} document. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HONOR_PLEDGE, completedTaskSet, savedCrosswords, taskKey } from "../lib/progress.js";

test("task keys include the door so equal task ids in different doors differ", () => {
  assert.equal(taskKey(3, "baka"), "3-baka");
  assert.notEqual(taskKey(3, "baka"), taskKey(4, "baka"));
});

test("completed tasks are read from completedTasks", () => {
  assert.deepEqual([...completedTaskSet({ completedTasks: ["1-a", "2-b"] })], ["1-a", "2-b"]);
});

test("missing or malformed progress means nothing completed", () => {
  assert.equal(completedTaskSet(null).size, 0);
  assert.equal(completedTaskSet({}).size, 0);
  assert.equal(completedTaskSet({ completedTasks: "1-a" }).size, 0);
  assert.deepEqual([...completedTaskSet({ completedTasks: ["1-a", 7, null] })], ["1-a"]);
});

test("honor pledge text matches the agreed wording", () => {
  assert.equal(HONOR_PLEDGE, "Jag lovar på heder och samvete att jag har gjort det");
});

test("saved crosswords are read per task key", () => {
  const saved = savedCrosswords({ crosswords: { "5-k": ["JU ", " # ", "   "] } });
  assert.deepEqual(saved.get("5-k"), ["JU ", " # ", "   "]);
});

test("malformed crossword saves are ignored", () => {
  assert.equal(savedCrosswords(null).size, 0);
  assert.equal(savedCrosswords({ crosswords: ["x"] }).size, 0);
  assert.equal(savedCrosswords({ crosswords: { "5-k": "JUL", "6-k": [1, 2] } }).size, 0);
});
