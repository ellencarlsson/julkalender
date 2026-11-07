/** Tests for XP per door, levels and the level ring fill. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { doorXp, isDoorCompleted, levelFromXp, taskXp, totalXp, xpRingPercent } from "../lib/level.js";

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

const done = (...keys) => ({ isCompleted: (key) => keys.includes(key), isWordCorrect: (key) => keys.includes(key) });
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
  assert.equal(levelFromXp(totalXp(doors, { isCompleted: () => true })).level, 24);
});

test("bad totals give level 0", () => {
  assert.deepEqual(levelFromXp(-5), { level: 0, xpInLevel: 0 });
  assert.deepEqual(levelFromXp(NaN), { level: 0, xpInLevel: 0 });
});

const clue = (direction, row, col) => ({ number: 1, direction, row, col, text: "x" });
const crosswordDoor = (...extra) => door({ id: "kors", type: "crossword", clues: [clue("across", 0, 0), clue("down", 0, 0), clue("across", 2, 0), clue("down", 0, 2)] }, ...extra);

test("each correct crossword word gives its share of the crossword's XP", () => {
  assert.equal(doorXp(5, crosswordDoor(), done("5-kors|across-0-0")), 25);
  assert.equal(doorXp(5, crosswordDoor(), done("5-kors|across-0-0", "5-kors|down-0-2")), 50);
});

test("all words correct gives exactly the crossword's full XP", () => {
  const words = ["across-0-0", "down-0-0", "across-2-0", "down-0-2"].map((id) => `5-kors|${id}`);
  assert.equal(doorXp(5, crosswordDoor(), done(...words)), 100);
});

test("a completed crossword gives full XP even without saved words", () => {
  assert.equal(doorXp(5, crosswordDoor(), done("5-kors")), 100);
});

test("completed crossword plus saved words is not counted twice", () => {
  assert.equal(doorXp(5, crosswordDoor(), done("5-kors", "5-kors|across-0-0")), 100);
});

test("crossword words share the crossword's weight with other tasks", () => {
  const d = crosswordDoor({ id: "baka", type: "challenge" });
  assert.equal(doorXp(5, d, done("5-kors|across-0-0")), 12.5);
});

test("a word from another door or crossword does not count", () => {
  assert.equal(doorXp(5, crosswordDoor(), done("6-kors|across-0-0", "5-other|across-0-0")), 0);
});

test("one word of a 12-word crossword gives 1/12 of a level", () => {
  const clues = Array.from({ length: 12 }, (_, i) => clue("across", i, 0));
  const xp = doorXp(5, door({ id: "kors", type: "crossword", clues }), done("5-kors|across-3-0"));
  assert.ok(Math.abs(xp - 100 / 12) < 1e-9);
});

test("a door is completed only when every task is", () => {
  const d = door({ id: "a" }, { id: "b" });
  assert.equal(isDoorCompleted(2, d, done("2-a", "2-b")), true);
  assert.equal(isDoorCompleted(2, d, done("2-a")), false);
  assert.equal(isDoorCompleted(2, d, done()), false);
});

test("partly correct crossword words do not complete a door", () => {
  assert.equal(isDoorCompleted(5, crosswordDoor(), done("5-kors|across-0-0", "5-kors|down-0-0")), false);
  assert.equal(isDoorCompleted(5, crosswordDoor(), done("5-kors")), true);
});

test("a door without tasks or content is never completed", () => {
  assert.equal(isDoorCompleted(3, door(), done()), false);
  assert.equal(isDoorCompleted(3, undefined, done("3-a")), false);
});

test("a task's XP is its weighted share of the door's 100 XP", () => {
  const six = Array.from({ length: 6 }, (_, i) => ({ id: String(i) }));
  assert.equal(taskXp(six[0], six), 17);
  const weighted = [{ id: "a", weight: 3 }, { id: "b" }];
  assert.equal(taskXp(weighted[0], weighted), 75);
  assert.equal(taskXp(weighted[1], weighted), 25);
  assert.equal(taskXp({ id: "x" }, []), 0);
});

test("a sudoku gives XP for every digit placed everywhere it belongs", async () => {
  const { encodeRows, parseGrid } = await import("../lib/sudoku.js");
  const solutionText = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
  const solution = parseGrid(solutionText);
  const puzzle = solution.map((value) => (value === 1 ? 1 : 0));
  const values = solution.map((value) => (value === 5 || value === 7 ? value : 0));
  const door = { tasks: [{ id: "s", type: "sudoku", puzzle: puzzle.join(""), solution: solutionText }] };
  const progress = { isCompleted: () => false, crosswordEntries: () => encodeRows(values, new Set()) };
  assert.equal(doorXp(3, door, progress), 25);
});

test("a catch game gives a quarter of its XP for every finished level", () => {
  const door = { tasks: [{ id: "c", type: "catch" }] };
  const progress = { isCompleted: () => false, crosswordEntries: () => ["2"] };
  assert.equal(doorXp(3, door, progress), 50);
});
