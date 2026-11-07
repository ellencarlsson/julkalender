/** Tests for collecting backpack rewards from completed doors. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_LENGTH, collectRewards } from "../lib/rewards.js";

const POPCORN = { name: "Popcorn", image: "images/items/popcorn.webp" };
const DRICKA = { name: "Dricka", image: "images/items/dricka.webp" };
const door = (reward) => ({ tasks: [{ id: "a", type: "challenge" }], reward });
const progressWith = (...keys) => ({ isCompleted: (key) => keys.includes(key) });

test("only completed doors give their digit and item", () => {
  const doors = [[1, door({ digit: "7", position: 3, item: POPCORN })], [2, door({ digit: "4", position: 1 })]];
  const { code, items } = collectRewards(doors, progressWith("1-a"));
  assert.equal(code.length, CODE_LENGTH);
  assert.deepEqual(code.slice(0, 3), [null, null, "7"]);
  assert.deepEqual(items, [POPCORN]);
});

test("doors without a reward or with a broken one give nothing", () => {
  const doors = [[1, door(undefined)], [2, door({ digit: "12", position: 1 })], [3, door({ digit: "5", position: 12 })]];
  const { code, items } = collectRewards(doors, progressWith("1-a", "2-a", "3-a"));
  assert.ok(code.every((digit) => digit === null));
  assert.deepEqual(items, []);
});

test("items are listed in door order", () => {
  const doors = [[5, door({ item: DRICKA })], [2, door({ item: POPCORN })]];
  assert.deepEqual(collectRewards(doors, progressWith("5-a", "2-a")).items, [POPCORN, DRICKA]);
});

test("an item without a picture is ignored", () => {
  assert.deepEqual(collectRewards([[1, door({ item: "Popcorn" })]], progressWith("1-a")).items, []);
});

test("an item may use an emoji instead of a picture", () => {
  const popcorn = { name: "Popcorn", emoji: "🍿" };
  assert.deepEqual(collectRewards([[1, door({ item: popcorn })]], progressWith("1-a")).items, [popcorn]);
});

test("clues from completed doors reveal parts of the code", () => {
  const doors = [[1, door({ clue: "code-start" })], [2, door({ clue: "code-title" })], [3, door({ clue: "nope" })]];
  assert.deepEqual([...collectRewards(doors, progressWith("1-a", "3-a")).clues], ["code-start"]);
});

test("an item keeps its note and wide flag, like the cinema ticket", () => {
  const ticket = { name: "Biobiljett", image: "images/door-24/biobiljett.webp", note: "123", wide: true };
  assert.deepEqual(collectRewards([[24, door({ item: ticket })]], progressWith("24-a")).items, [ticket]);
});

test("a completed prize door gives the prize", () => {
  const prize = { image: "images/door-24/cinema-ticket.svg", code: "123", text: "Grattis!" };
  assert.deepEqual(collectRewards([[24, door({ prize })]], progressWith("24-a")).prize, prize);
  assert.equal(collectRewards([[24, door({ prize })]], progressWith()).prize, null);
});
