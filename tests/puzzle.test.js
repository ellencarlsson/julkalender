/** Tests for the picture puzzle: shuffling, swapping, solving and the saved order. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeOrder, encodeOrder, isSolved, shuffledOrder, swapPieces } from "../lib/puzzle.js";

test("a shuffled puzzle holds every piece once and is never already solved", () => {
  for (let run = 0; run < 50; run++) {
    const order = shuffledOrder(6);
    assert.deepEqual([...order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
    assert.equal(isSolved(order), false);
  }
});

test("swapping two places exchanges their pieces", () => {
  assert.deepEqual(swapPieces([2, 0, 1], 0, 2), [1, 0, 2]);
});

test("the puzzle is solved when every place holds its own piece", () => {
  assert.equal(isSolved([0, 1, 2, 3]), true);
  assert.equal(isSolved([1, 0, 2, 3]), false);
});

test("a saved order comes back only when it is a full set of pieces", () => {
  assert.deepEqual(decodeOrder(encodeOrder([2, 0, 1]), 3), [2, 0, 1]);
  assert.equal(decodeOrder(null, 3), null);
  assert.equal(decodeOrder(["0,1"], 3), null);
  assert.equal(decodeOrder(["0,0,1"], 3), null);
});
