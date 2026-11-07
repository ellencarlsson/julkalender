/** Tests for the grouping task: checking a selection, saving found groups and shuffling. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSelection, decodeFound, encodeFound, itemId, shuffledItems } from "../lib/grouping.js";

const groups = [
  { name: "Frukt", items: [{ text: "äpple" }, { text: "päron" }, { text: "kiwi" }] },
  { name: "Färger", items: [{ text: "röd" }, { text: "blå" }, { text: "grön" }] },
];

test("a selection of one whole group finds that group", () => {
  assert.deepEqual(checkSelection(groups, ["0-0", "0-2", "0-1"]), { group: 0, almost: false });
});

test("one item away is almost: one swapped, one missing or one extra", () => {
  assert.deepEqual(checkSelection(groups, ["1-0", "1-1", "0-2"]), { group: null, almost: true });
  assert.deepEqual(checkSelection(groups, ["1-0", "1-1"]), { group: null, almost: true });
  assert.deepEqual(checkSelection(groups, ["1-0", "1-1", "1-2", "0-0"]), { group: null, almost: true });
  const four = [{ name: "a", items: [1, 2, 3, 4].map((n) => ({ text: `a${n}` })) }, { name: "b", items: [1, 2, 3, 4].map((n) => ({ text: `b${n}` })) }];
  assert.deepEqual(checkSelection(four, ["0-0", "0-1", "1-0", "1-1"]), { group: null, almost: false });
});

test("groups of different sizes are found by their exact items", () => {
  const mixed = [{ name: "tre", items: [{ text: "a" }, { text: "b" }, { text: "c" }] }, { name: "fem", items: [1, 2, 3, 4, 5].map((n) => ({ text: `f${n}` })) }];
  assert.deepEqual(checkSelection(mixed, ["0-2", "0-0", "0-1"]), { group: 0, almost: false });
  assert.deepEqual(checkSelection(mixed, ["1-0", "1-1", "1-2", "1-3", "1-4"]), { group: 1, almost: false });
  assert.deepEqual(checkSelection(mixed, []), { group: null, almost: false });
  assert.deepEqual(checkSelection(mixed, ["1-0", "1-1", "1-2"]), { group: null, almost: false });
});

test("shuffled items keep every item exactly once", () => {
  const ids = shuffledItems(groups).map((item) => item.id).sort();
  assert.deepEqual(ids, ["0-0", "0-1", "0-2", "1-0", "1-1", "1-2"]);
  assert.equal(itemId(1, 2), "1-2");
});

test("found groups round-trip through the saved row and ignore unknown numbers", () => {
  assert.deepEqual(decodeFound(encodeFound([1, 0]), 2), [1, 0]);
  assert.deepEqual(decodeFound(["0,5,0"], 2), [0]);
  assert.deepEqual(decodeFound(null, 2), []);
});
