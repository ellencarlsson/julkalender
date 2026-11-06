/** Tests for matching task logic. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLinks, isCorrectPair, isMatchingSolved, matchingBoard, nextBadge, shuffled } from "../lib/matching.js";

const PAIRS = [
  { item: { text: "Sorteringshatten" }, target: { text: "Harry Potter" } },
  { item: { text: "Cowboyhatt" }, target: { image: "images/arthur.jpg" } },
  { item: { text: "Tomteluva" }, target: { text: "Tomten" } },
];

test("board keeps each side's pair index", () => {
  const { items, targets } = matchingBoard(PAIRS);
  assert.deepEqual(items.map((i) => i.pair), [0, 1, 2]);
  assert.deepEqual(targets[1], { image: "images/arthur.jpg", pair: 1 });
});

test("a pair is correct only when item and target share the pair index", () => {
  assert.equal(isCorrectPair(1, 1), true);
  assert.equal(isCorrectPair(1, 2), false);
  assert.equal(isCorrectPair(undefined, undefined), false);
});

test("solved only when every pair is matched", () => {
  assert.equal(isMatchingSolved(PAIRS, [0, 2]), false);
  assert.equal(isMatchingSolved(PAIRS, [2, 0, 1]), true);
  assert.equal(isMatchingSolved([], []), false);
});

test("shuffle keeps all elements and is the same for the same seed", () => {
  const list = [0, 1, 2, 3, 4, 5];
  assert.deepEqual([...shuffled(list, "11-hattar")].sort(), list);
  assert.deepEqual(shuffled(list, "11-hattar"), shuffled(list, "11-hattar"));
  assert.notDeepEqual(shuffled(list, "11-hattar"), shuffled(list, "12-annat"));
});

test("pairs are only judged once every item has a partner", () => {
  assert.equal(checkLinks(new Map([[0, 0]]), 2), "incomplete");
  assert.equal(checkLinks(new Map([[0, 0], [1, 1]]), 2), "right");
  assert.equal(checkLinks(new Map([[0, 1], [1, 0]]), 2), "wrong");
});

test("a freed badge number is reused", () => {
  assert.equal(nextBadge(new Set()), 1);
  assert.equal(nextBadge(new Set([1, 2, 4])), 3);
});
