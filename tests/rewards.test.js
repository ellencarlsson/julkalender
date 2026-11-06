/** Tests for collecting backpack rewards from completed doors. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_LENGTH, collectRewards } from "../lib/rewards.js";

const door = (reward) => ({ tasks: [{ id: "a", type: "challenge" }], reward });
const progressWith = (...keys) => ({ isCompleted: (key) => keys.includes(key) });

test("only completed doors give their digit and item", () => {
  const doors = [[1, door({ digit: "7", position: 3, item: "🍿 Popcorn" })], [2, door({ digit: "4", position: 1 })]];
  const { code, items } = collectRewards(doors, progressWith("1-a"));
  assert.equal(code.length, CODE_LENGTH);
  assert.deepEqual(code.slice(0, 3), [null, null, "7"]);
  assert.deepEqual(items, ["🍿 Popcorn"]);
});

test("doors without a reward or with a broken one give nothing", () => {
  const doors = [[1, door(undefined)], [2, door({ digit: "12", position: 1 })], [3, door({ digit: "5", position: 12 })]];
  const { code, items } = collectRewards(doors, progressWith("1-a", "2-a", "3-a"));
  assert.ok(code.every((digit) => digit === null));
  assert.deepEqual(items, []);
});

test("items are listed in door order", () => {
  const doors = [[5, door({ item: "🥤 Dricka" })], [2, door({ item: "🍿 Popcorn" })]];
  assert.deepEqual(collectRewards(doors, progressWith("5-a", "2-a")).items, ["🍿 Popcorn", "🥤 Dricka"]);
});
