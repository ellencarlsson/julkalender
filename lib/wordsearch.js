/** Word search logic: a grid of letters where words run in straight lines. Cells are { row, col }. */

/** Grid letters compared without case or spaces, so "Mamma Mu" is found as MAMMAMU. */
export const wordLetters = (word) => [...String(word).toLocaleUpperCase("sv-SE").replace(/\s+/g, "")];

/** The grid as rows of single letters; Å, Ä and Ö each count as one letter. */
export const gridLetters = (rows) => rows.map((row) => wordLetters(row));

/**
 * The cells from one cell to another along a row, a column or a diagonal.
 *
 * Returns:
 *   The cells in order, both ends included, or null when the two cells are not on one straight line.
 */
export function lineCells(start, end) {
  const [dr, dc] = [end.row - start.row, end.col - start.col];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from({ length: steps + 1 }, (_, i) => ({ row: start.row + Math.sign(dr) * i, col: start.col + Math.sign(dc) * i }));
}

const readCells = (grid, cells) => cells.map(({ row, col }) => grid[row]?.[col] ?? "").join("");

/** Index of the word the cells spell, forwards or backwards, or -1. */
export function wordIndexAt(grid, cells, words) {
  const letters = readCells(grid, cells);
  const backwards = [...letters].reverse().join("");
  return words.findIndex((word) => [letters, backwards].includes(wordLetters(word).join("")));
}

const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];

/** The cells where a word is written in the grid, or null when it is not there. */
export function findWord(grid, word) {
  const letters = wordLetters(word);
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        const cells = letters.map((_, i) => ({ row: row + dr * i, col: col + dc * i }));
        if (readCells(grid, cells) === letters.join("")) return cells;
      }
    }
  }
  return null;
}
