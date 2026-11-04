/** Tests for crossword grid logic. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACROSS,
  BLOCK,
  DOWN,
  EMPTY,
  SPACE,
  clueNumbers,
  correctWordIds,
  directionFor,
  emptyEntries,
  entryAt,
  isFilled,
  isLetterCell,
  isSolved,
  normalizeLetter,
  restoreEntries,
  setEntry,
  solutionCells,
  solvedEntries,
  stepCell,
  wordAt,
  wordId,
} from "../lib/crossword.js";

const GRID = ["JUL", "A#U", "GÅS"];
const cells = solutionCells(GRID);
const fill = (entries, rows) => rows.reduce((acc, row, r) => [...row].reduce((a, ch, c) => (ch === BLOCK ? a : setEntry(a, r, c, ch)), acc), entries);

test("solution cells are uppercase single letters with black squares", () => {
  assert.deepEqual(cells, [["J", "U", "L"], ["A", BLOCK, "U"], ["G", "Å", "S"]]);
  assert.deepEqual(solutionCells(["gås"]), [["G", "Å", "S"]]);
});

test("decomposed å in the grid becomes one cell", () => {
  assert.deepEqual(solutionCells(["gås"]), [["G", "Å", "S"]]);
});

test("normalizeLetter keeps the last typed letter, uppercased", () => {
  assert.equal(normalizeLetter("a"), "A");
  assert.equal(normalizeLetter("jå"), "Å");
  assert.equal(normalizeLetter("ö"), "Ö");
  assert.equal(normalizeLetter("1"), "");
  assert.equal(normalizeLetter(" "), "");
  assert.equal(normalizeLetter(""), "");
  assert.equal(normalizeLetter(undefined), "");
});

test("empty entries keep black squares", () => {
  assert.deepEqual(emptyEntries(cells), ["   ", " # ", "   "]);
});

test("setEntry and entryAt", () => {
  const entries = setEntry(emptyEntries(cells), 2, 1, "Å");
  assert.equal(entryAt(entries, 2, 1), "Å");
  assert.equal(entryAt(setEntry(entries, 2, 1, ""), 2, 1), EMPTY);
});

test("filled is not the same as solved", () => {
  const wrong = fill(emptyEntries(cells), ["JUL", "A#U", "GAS"]);
  assert.equal(isFilled(cells, wrong), true);
  assert.equal(isSolved(cells, wrong), false);
});

test("solved when every letter matches", () => {
  const right = fill(emptyEntries(cells), GRID.map((row) => row.toUpperCase()));
  assert.equal(isSolved(cells, right), true);
  assert.deepEqual(solvedEntries(cells), ["JUL", "A#U", "GÅS"]);
  assert.equal(isSolved(cells, emptyEntries(cells)), false);
});

test("restoreEntries reuses saved rows that fit the grid", () => {
  assert.deepEqual(restoreEntries(cells, ["JU ", " # ", "gå "]), ["JU ", " # ", "GÅ "]);
});

test("restoreEntries starts fresh for missing or mismatched saves", () => {
  for (const saved of [undefined, null, "JUL", ["JU"], ["JUL", "A#U"], ["JUL", "A#U", 7]]) {
    assert.deepEqual(restoreEntries(cells, saved), emptyEntries(cells), JSON.stringify(saved));
  }
});

test("restoreEntries never overwrites black squares or keeps non-letters", () => {
  assert.deepEqual(restoreEntries(cells, ["J1L", "AXU", "GÅS"]), ["J L", "A#U", "GÅS"]);
});

test("stepCell stops at black squares and edges", () => {
  assert.deepEqual(stepCell(cells, 0, 0, ACROSS), [0, 1]);
  assert.equal(stepCell(cells, 0, 1, DOWN), null);
  assert.equal(stepCell(cells, 0, 2, ACROSS), null);
  assert.deepEqual(stepCell(cells, 2, 2, ACROSS, -1), [2, 1]);
});

test("wordAt finds the whole word from any of its cells", () => {
  assert.deepEqual(wordAt(cells, 0, 2, ACROSS), [[0, 0], [0, 1], [0, 2]]);
  assert.deepEqual(wordAt(cells, 1, 0, DOWN), [[0, 0], [1, 0], [2, 0]]);
  assert.deepEqual(wordAt(cells, 0, 1, DOWN), [[0, 1]]);
  assert.deepEqual(wordAt(cells, 1, 1, ACROSS), []);
});

test("directionFor switches when the preferred direction has no word", () => {
  assert.equal(directionFor(cells, 1, 0, ACROSS), DOWN);
  assert.equal(directionFor(cells, 0, 0, ACROSS), ACROSS);
  assert.equal(directionFor(cells, 0, 0, DOWN), DOWN);
  assert.equal(directionFor(cells, 0, 1, DOWN), ACROSS);
});

test("clue numbers are keyed by start cell", () => {
  const numbers = clueNumbers([{ number: 1, row: 0, col: 0 }, { number: 2, row: 0, col: 2 }]);
  assert.equal(numbers.get("0,0"), 1);
  assert.equal(numbers.get("0,2"), 2);
  assert.equal(numbers.get("1,1"), undefined);
});

const SPACED = solutionCells(["STUPID SONG", "###########"]);

test("a space in the grid becomes a gap cell", () => {
  assert.equal(SPACED[0][6], SPACE);
  assert.equal(isLetterCell(SPACED, 0, 6), false);
  assert.deepEqual(emptyEntries([SPACED[0]]), ["      _    "]);
});

test("typing skips over the gap", () => {
  assert.deepEqual(stepCell(SPACED, 0, 5, ACROSS), [0, 7]);
  assert.deepEqual(stepCell(SPACED, 0, 7, ACROSS, -1), [0, 5]);
});

test("the whole multi-word answer is one word, gap included", () => {
  const word = wordAt(SPACED, 0, 9, ACROSS);
  assert.equal(word.length, 11);
  assert.deepEqual(word[0], [0, 0]);
  assert.deepEqual(word[6], [0, 6]);
});

test("solving ignores the gap and needs only letters", () => {
  const cells = [SPACED[0]];
  const typed = [..."STUPIDSONG"].reduce((entries, letter, i) => setEntry(entries, 0, i < 6 ? i : i + 1, letter), emptyEntries(cells));
  assert.deepEqual(typed, ["STUPID_SONG"]);
  assert.equal(isSolved(cells, typed), true);
  assert.deepEqual(solvedEntries(cells), ["STUPID_SONG"]);
});

test("restored entries keep gaps fixed", () => {
  assert.deepEqual(restoreEntries([SPACED[0]], ["STUPIDXSONG"]), ["STUPID_SONG"]);
});

const CLUES = [
  { number: 1, direction: ACROSS, row: 0, col: 0 },
  { number: 1, direction: DOWN, row: 0, col: 0 },
  { number: 2, direction: DOWN, row: 0, col: 2 },
  { number: 3, direction: ACROSS, row: 2, col: 0 },
];

test("wordId is stable per clue", () => {
  assert.equal(wordId(CLUES[2]), "down-0-2");
});

test("correctWordIds finds only fully correct words", () => {
  const partial = fill(emptyEntries(cells), ["JUL", "A#U", "G  "]);
  assert.deepEqual(correctWordIds(cells, partial, CLUES), ["across-0-0", "down-0-0"]);
});

test("a wrong letter makes a word incorrect", () => {
  const wrong = fill(emptyEntries(cells), ["JUL", "A#U", "GAS"]);
  assert.deepEqual(correctWordIds(cells, wrong, CLUES), ["across-0-0", "down-0-0", "down-0-2"]);
});

test("words through gaps are correct when all letters are", () => {
  const spaced = solutionCells(["STUPID SONG"]);
  const entries = [..."STUPIDSONG"].reduce((e, letter, i) => setEntry(e, 0, i < 6 ? i : i + 1, letter), emptyEntries(spaced));
  assert.deepEqual(correctWordIds(spaced, entries, [{ direction: ACROSS, row: 0, col: 0 }]), ["across-0-0"]);
});
