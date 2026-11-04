/** Tests for XP per door, levels and the level ring fill. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { doorXp, levelFromXp, totalXp, xpRingPercent } from "../lib/level.js";

test("ring is empty at 0 XP, half at 50 and full at 100", () => {
  assert.equal(xpRingPercent(0), 0);
  assert.equal(xpRingPercent(50), 50);
  assert.equal(xpRingPercent(100), 100);
});

test("ring fill is clamped to 0-100", () => {
  assert.equal(xpRingPercent(-10), 0);
  assert.equal(xpRingPercent(250), 100);
});

test("fractional XP is rounded to a whole percent", () => {
  assert.equal(xpRingPercent(33.3), 33);
});

test("missing XP gives an empty ring", () => {
  assert.equal(xpRingPercent(undefined), 0);
  assert.equal(xpRingPercent(NaN), 0);
});

const done = (...keys) => (key) => keys.includes(key);
const door = (...tasks) => ({ tasks });

test("a door is worth 100 XP split equally by default", () => {
  const d = door({ id: "a" }, { id: "b" });
  assert.equal(doorXp(3, d, done()), 0);
  assert.equal(doorXp(3, d, done("3-a")), 50);
  assert.equal(doorXp(3, d, done("3-a", "3-b")), 100);
});

test("weights split the door's XP", () => {
  const d = door({ id: "big", weight: 3 }, { id: "small" });
  assert.equal(doorXp(1, d, done("1-big")), 75);
  assert.equal(doorXp(1, d, done("1-small")), 25);
});

test("invalid weights count as 1", () => {
  const d = door({ id: "a", weight: 0 }, { id: "b", weight: "x" });
  assert.equal(doorXp(1, d, done("1-a")), 50);
});

test("completion in another door does not count", () => {
  assert.equal(doorXp(3, door({ id: "a" }), done("4-a")), 0);
});

test("door without tasks gives no XP", () => {
  assert.equal(doorXp(1, door(), done()), 0);
  assert.equal(doorXp(1, null, done()), 0);
});

test("a door split in thirds still gives a full level", () => {
  const d = door({ id: "a" }, { id: "b" }, { id: "c" });
  const xp = totalXp([[1, d]], done("1-a", "1-b", "1-c"));
  assert.deepEqual(levelFromXp(xp), { level: 1, xpInLevel: 0 });
});

test("XP is summed across doors: half of door 3 plus half of door 5 is one level", () => {
  const half = door({ id: "a" }, { id: "b" });
  const xp = totalXp([[3, half], [5, half]], done("3-a", "5-b"));
  assert.deepEqual(levelFromXp(xp), { level: 1, xpInLevel: 0 });
});

test("level is floor(total / 100) with the rest toward the next level", () => {
  assert.deepEqual(levelFromXp(0), { level: 0, xpInLevel: 0 });
  assert.deepEqual(levelFromXp(250), { level: 2, xpInLevel: 50 });
  assert.deepEqual(levelFromXp(99.999), { level: 1, xpInLevel: 0 });
});

test("level 24 is the max and shows a full ring", () => {
  assert.deepEqual(levelFromXp(2400), { level: 24, xpInLevel: 100 });
  assert.deepEqual(levelFromXp(5000), { level: 24, xpInLevel: 100 });
});

test("all 24 doors completed reaches exactly level 24", () => {
  const doors = Array.from({ length: 24 }, (_, i) => [i + 1, door({ id: "a" }, { id: "b", weight: 2 })]);
  assert.equal(levelFromXp(totalXp(doors, () => true)).level, 24);
});

test("bad totals give level 0", () => {
  assert.deepEqual(levelFromXp(-5), { level: 0, xpInLevel: 0 });
  assert.deepEqual(levelFromXp(NaN), { level: 0, xpInLevel: 0 });
});
