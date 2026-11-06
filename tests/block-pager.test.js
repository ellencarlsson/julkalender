/** Tests for which doors show their tasks one page at a time. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isPagedDoor } from "../block-pager.js";

const quiz = { type: "quiz" };
const matching = { type: "matching" };

test("a door with several matching tasks is paged", () => {
  assert.equal(isPagedDoor([matching, matching]), true);
  assert.equal(isPagedDoor([matching, quiz]), false);
});

test("any door can ask to be paged, but a single task never is", () => {
  assert.equal(isPagedDoor([quiz, quiz], { paged: true }), true);
  assert.equal(isPagedDoor([quiz, quiz], { paged: false }), false);
  assert.equal(isPagedDoor([quiz], { paged: true }), false);
});
