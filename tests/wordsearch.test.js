/** Tests for word search logic. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findWord, gridLetters, lineCells, wordIndexAt, wordLetters } from "../lib/wordsearch.js";

const grid = gridLetters(["GTAX", "XÖLX", "MUXL", "XXXU"]);
const words = ["GTA", "Mu", "Öl"];

test("words are compared as capital letters without spaces, with Å Ä Ö as one letter", () => {
  assert.deepEqual(wordLetters("Mamma Mu"), ["M", "A", "M", "M", "A", "M", "U"]);
  assert.deepEqual(gridLetters(["åäö"]), [["Å", "Ä", "Ö"]]);
});

test("a line runs along a row, a column or a diagonal", () => {
  assert.deepEqual(lineCells({ row: 0, col: 0 }, { row: 0, col: 2 }), [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]);
  assert.deepEqual(lineCells({ row: 2, col: 2 }, { row: 0, col: 0 }), [{ row: 2, col: 2 }, { row: 1, col: 1 }, { row: 0, col: 0 }]);
  assert.equal(lineCells({ row: 0, col: 0 }, { row: 1, col: 2 }), null);
});

test("the cells between two taps spell a word forwards or backwards", () => {
  assert.equal(wordIndexAt(grid, lineCells({ row: 0, col: 0 }, { row: 0, col: 2 }), words), 0);
  assert.equal(wordIndexAt(grid, lineCells({ row: 0, col: 2 }, { row: 0, col: 0 }), words), 0);
  assert.equal(wordIndexAt(grid, lineCells({ row: 2, col: 0 }, { row: 2, col: 1 }), words), 1);
  assert.equal(wordIndexAt(grid, lineCells({ row: 0, col: 0 }, { row: 1, col: 1 }), words), -1);
});

test("a word is found in any direction, and a missing word gives null", () => {
  assert.deepEqual(findWord(grid, "Öl"), [{ row: 1, col: 1 }, { row: 1, col: 2 }]);
  const upward = findWord(grid, "UX");
  assert.equal(upward.map(({ row, col }) => grid[row][col]).join(""), "UX");
  assert.equal(findWord(grid, "JUL"), null);
});
