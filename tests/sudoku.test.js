/** Tests for sudoku logic. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { conflicts, decodeRows, encodeRows, isSolved, isValidSolution, parseGrid, peers, pickHintCells, decodeNotes, eliminateNotes, emptyNotes, encodeNotes } from "../lib/sudoku.js";

const SOLUTION = "489316752357248619612975384576824931194753826823169475741682593968531247235497168";
const PUZZLE = "4.93.675...724...961.....8.57..24.31...7..8..8.3.6..7...1...5...68..1.47...4.71.8";

test("grids parse to 81 numbers with 0 for empty", () => {
  const grid = parseGrid(PUZZLE);
  assert.equal(grid.length, 81);
  assert.deepEqual(grid.slice(0, 4), [4, 0, 9, 3]);
});

test("every cell has 20 peers", () => {
  assert.equal(peers(0).length, 20);
  assert.equal(peers(40).length, 20);
  assert.ok(!peers(40).includes(40));
});

test("duplicates in a row, column or box are conflicts", () => {
  const values = parseGrid(PUZZLE);
  assert.equal(conflicts(values).size, 0);
  values[1] = 4;
  assert.deepEqual([...conflicts(values)].sort((a, b) => a - b), [0, 1]);
});

test("solved only when every cell matches the solution", () => {
  const solution = parseGrid(SOLUTION);
  assert.equal(isSolved([...solution], solution), true);
  const wrong = [...solution];
  wrong[80] = 9;
  assert.equal(isSolved(wrong, solution), false);
  assert.equal(isValidSolution(solution), true);
  assert.equal(isValidSolution(parseGrid(PUZZLE)), false);
});

test("a hint picks only empty cells, at most the requested count", () => {
  const values = parseGrid(PUZZLE);
  const picked = pickHintCells(values, 3, () => 0.5);
  assert.equal(picked.length, 3);
  picked.forEach((index) => assert.equal(values[index], 0));
  const almostFull = parseGrid(SOLUTION);
  almostFull[5] = 0;
  assert.deepEqual(pickHintCells(almostFull, 3), [5]);
});

test("saved rows keep the player's digits and which cells came from hints", () => {
  const values = parseGrid(PUZZLE);
  values[1] = 8;
  const rows = encodeRows(values, new Set([1]));
  assert.equal(rows.length, 9);
  assert.equal(rows[0], "4h93.675.");
  const decoded = decodeRows(rows);
  assert.deepEqual(decoded.values, values);
  assert.deepEqual([...decoded.hinted], [1]);
});

test("placing a digit removes it from the notes of its row, column and box, and clears the cell", () => {
  const notes = emptyNotes();
  [0, 8, 72, 10, 40].forEach((index) => notes[index].add(5).add(7));
  eliminateNotes(notes, 0, 5);
  assert.deepEqual([...notes[0]], []);
  assert.deepEqual([...notes[8]], [7]);
  assert.deepEqual([...notes[72]], [7]);
  assert.deepEqual([...notes[10]], [7]);
  assert.deepEqual([...notes[40]].sort(), [5, 7]);
});

test("notes round-trip through one saved row next to the grid rows", () => {
  const notes = emptyNotes();
  notes[0].add(1).add(9);
  notes[80].add(4);
  const rows = [...encodeRows(parseGrid(PUZZLE), new Set()), encodeNotes(notes)];
  assert.deepEqual(decodeRows(rows).values, parseGrid(PUZZLE));
  const decoded = decodeNotes(rows);
  assert.deepEqual([...decoded[0]].sort(), [1, 9]);
  assert.deepEqual([...decoded[80]], [4]);
  assert.equal(decoded[40].size, 0);
});

test("saves without a notes row give empty notes", () => {
  assert.ok(decodeNotes(encodeRows(parseGrid(PUZZLE), new Set())).every((cell) => cell.size === 0));
  assert.ok(decodeNotes(null).every((cell) => cell.size === 0));
});
