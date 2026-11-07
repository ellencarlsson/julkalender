/** Sudoku logic: grids are 81 cells, row by row; 0 means empty. */

export const SIZE = 9;
export const CELLS = SIZE * SIZE;
const HINT_LETTERS = "abcdefghi";

/** "4.93..." → [4, 0, 9, 3, ...]; anything that is not 1-9 counts as empty. */
export function parseGrid(text) {
  return [...String(text ?? "")].slice(0, CELLS).map((char) => (/[1-9]/.test(char) ? Number(char) : 0));
}

/** Indices of the 20 other cells that share a row, column or 3×3 box with the given cell. */
export function peers(index) {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const boxRow = row - (row % 3);
  const boxCol = col - (col % 3);
  const result = new Set();
  for (let i = 0; i < SIZE; i++) {
    result.add(row * SIZE + i);
    result.add(i * SIZE + col);
    result.add((boxRow + Math.floor(i / 3)) * SIZE + boxCol + (i % 3));
  }
  result.delete(index);
  return [...result];
}

/** Cells whose digit also appears among their peers. */
export function conflicts(values) {
  const clashing = new Set();
  values.forEach((value, index) => {
    if (value && peers(index).some((peer) => values[peer] === value)) clashing.add(index);
  });
  return clashing;
}

export function isSolved(values, solution) {
  return values.length === CELLS && values.every((value, index) => value === solution[index]);
}

/**
 * Picks cells a hint fills in: empty cells only, chosen at random.
 *
 * Args:
 *   values: current cell values (0 = empty).
 *   count: how many cells to fill (fewer when fewer are empty).
 *   random: function returning [0, 1), injectable for tests.
 * Returns:
 *   Indices of the cells to fill.
 */
export function pickHintCells(values, count, random = Math.random) {
  const empty = values.flatMap((value, index) => (value ? [] : [index]));
  for (let i = empty.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [empty[i], empty[j]] = [empty[j], empty[i]];
  }
  return empty.slice(0, count);
}

/** Saved as 9 strings like the crossword rows: digits for the player's entries, a-i for hinted cells. */
export function encodeRows(values, hinted) {
  const chars = values.map((value, index) => {
    if (!value) return ".";
    return hinted.has(index) ? HINT_LETTERS[value - 1] : String(value);
  });
  return Array.from({ length: SIZE }, (_, row) => chars.slice(row * SIZE, row * SIZE + SIZE).join(""));
}

export function decodeRows(rows) {
  const chars = [...(Array.isArray(rows) ? rows.join("") : "")].slice(0, CELLS);
  const values = Array.from({ length: CELLS }, (_, index) => {
    const char = chars[index] ?? ".";
    if (/[1-9]/.test(char)) return Number(char);
    const letter = HINT_LETTERS.indexOf(char);
    return letter >= 0 ? letter + 1 : 0;
  });
  const hinted = new Set(chars.flatMap((char, index) => (HINT_LETTERS.includes(char) ? [index] : [])));
  return { values, hinted };
}

/** A complete grid where every row, column and box holds 1-9 once. */
export function isValidSolution(values) {
  return values.length === CELLS && values.every((value) => value >= 1 && value <= 9) && conflicts(values).size === 0;
}

/** Pencil marks: one Set of candidate digits per cell. */
export function emptyNotes() {
  return Array.from({ length: CELLS }, () => new Set());
}

/** A digit placed in a cell clears that cell's notes and is no longer a candidate for its peers. */
export function eliminateNotes(notes, index, digit) {
  notes[index].clear();
  for (const peer of peers(index)) notes[peer].delete(digit);
}

/** Saved as one extra row after the 9 grid rows: each cell's notes, cells separated by commas. */
export function encodeNotes(notes) {
  return notes.map((cell) => [...cell].sort().join("")).join(",");
}

export function decodeNotes(rows) {
  const cells = (Array.isArray(rows) ? rows[SIZE] ?? "" : "").split(",");
  return Array.from({ length: CELLS }, (_, index) => new Set([...(cells[index] ?? "")].filter((char) => /[1-9]/.test(char)).map(Number)));
}

/**
 * How many of the digits 1-9 the player has finished: every cell holding that digit in the
 * solution is filled in correctly. Digits the puzzle already gives in full are left out.
 *
 * Returns:
 *   { done, total } where total is the number of digits that had cells to fill.
 */
export function digitProgress(puzzle, values, solution) {
  let done = 0;
  let total = 0;
  for (let digit = 1; digit <= SIZE; digit++) {
    const cells = solution.flatMap((value, index) => (value === digit ? [index] : []));
    if (cells.every((index) => puzzle[index] === digit)) continue;
    total++;
    if (cells.every((index) => values[index] === digit)) done++;
  }
  return { done, total };
}
