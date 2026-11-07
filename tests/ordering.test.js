/** Tests for ordering task logic. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOrder, isOrdered } from "../lib/ordering.js";

test("each item belongs in the slot with its own index", () => {
  assert.deepEqual(checkOrder([0, 2, 1, null]), { right: [0], wrong: [1, 2] });
  assert.equal(isOrdered([0, 1, 2]), true);
  assert.equal(isOrdered([0, 2, 1]), false);
  assert.equal(isOrdered([0, null, 2]), false);
});
