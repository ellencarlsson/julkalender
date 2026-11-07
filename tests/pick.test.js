/** Tests for the pick task. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isRightPick } from "../lib/pick.js";

const options = [{ text: "A", correct: true }, { text: "B" }, { text: "C", correct: true }];

test("only exactly the right options count as right", () => {
  assert.equal(isRightPick(options, new Set([0, 2])), true);
  assert.equal(isRightPick(options, new Set([0])), false);
  assert.equal(isRightPick(options, new Set([0, 1, 2])), false);
  assert.equal(isRightPick(options, new Set()), false);
});
