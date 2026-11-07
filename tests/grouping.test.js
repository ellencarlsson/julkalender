/** Tests for the grouping task: checking a selection, saving found groups and shuffling. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSelection, decodeFound, encodeFound, groupSize, itemId, shuffledItems } from "../lib/grouping.js";

const groups = [
  { name: "Frukt", items: [{ text: "äpple" }, { text: "päron" }, { text: "kiwi" }] },
  { name: "Färger", items: [{ text: "röd" }, { text: "blå" }, { text: "grön" }] },
];

test("a selection of one whole group finds that group", () => {
  assert.deepEqual(checkSelection(groups, ["0-0", "0-2", "0-1"]), { group: 0, almost: false });
});

test("one item away is almost, anything else is wrong", () => {
  assert.deepEqual(checkSelection(groups, ["1-0", "1-1", "0-2"]), { group: null, almost: true });
  assert.deepEqual(checkSelection(groups, ["1-0", "0-1", "0-2"]), { group: null, almost: true });
  const four = [{ name: "a", items: [1, 2, 3, 4].map((n) => ({ text: `a${n}` })) }, { name: "b", items: [1, 2, 3, 4].map((n) => ({ text: `b${n}` })) }];
  assert.deepEqual(checkSelection(four, ["0-0", "0-1", "1-0", "1-1"]), { group: null, almost: false });
});

test("the group size is the size of the first group", () => {
  assert.equal(groupSize(groups), 3);
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
