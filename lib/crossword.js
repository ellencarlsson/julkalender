/** Crossword grid logic: solution cells, word paths, player entries and solving. */

export const BLOCK = "#";
export const EMPTY = " ";
export const ACROSS = "across";
export const DOWN = "down";

const STEP = { [ACROSS]: [0, 1], [DOWN]: [1, 0] };
const upper = (text) => text.normalize("NFC").toLocaleUpperCase("sv-SE");

/** Solution as a 2D array of single uppercase letters, with BLOCK for black squares. */
export function solutionCells(grid) {
  return grid.map((row) => [...upper(row)]);
}

/** Last letter typed into a cell, uppercased; "" for anything that is not a letter. */
export function normalizeLetter(text) {
  const letters = [...upper(text ?? "")].filter((char) => /\p{L}/u.test(char));
  return letters.at(-1) ?? "";
}

export const isLetterCell = (cells, row, col) => cells[row]?.[col] !== undefined && cells[row][col] !== BLOCK;

export function emptyEntries(cells) {
  return cells.map((row) => row.map((cell) => (cell === BLOCK ? BLOCK : EMPTY)).join(""));
}

function fitsGrid(cells, saved) {
  return (
    Array.isArray(saved) &&
    saved.length === cells.length &&
    saved.every((row, r) => typeof row === "string" && [...row].length === cells[r].length)
  );
}

/** Saved rows are only reused if they fit this grid, so an edited crossword starts fresh. */
export function restoreEntries(cells, saved) {
  if (!fitsGrid(cells, saved)) return emptyEntries(cells);
  const restore = (cell, r, c) => (cell === BLOCK ? BLOCK : normalizeLetter([...saved[r]][c]) || EMPTY);
  return cells.map((row, r) => row.map((cell, c) => restore(cell, r, c)).join(""));
}

export function entryAt(entries, row, col) {
  return [...entries[row]][col];
}

export function setEntry(entries, row, col, letter) {
  return entries.map((line, r) => {
    if (r !== row) return line;
    const chars = [...line];
    chars[col] = letter || EMPTY;
    return chars.join("");
  });
}

const letterCellsOf = (cells) => cells.flatMap((row, r) => row.flatMap((cell, c) => (cell === BLOCK ? [] : [[r, c]])));

export function isFilled(cells, entries) {
  return letterCellsOf(cells).every(([r, c]) => entryAt(entries, r, c) !== EMPTY);
}

export function isSolved(cells, entries) {
  return letterCellsOf(cells).every(([r, c]) => entryAt(entries, r, c) === cells[r][c]);
}

export function solvedEntries(cells) {
  return cells.map((row) => row.join(""));
}

/** Next letter cell in the direction, or null at a black square or the edge. */
export function stepCell(cells, row, col, direction, step = 1) {
  const [dr, dc] = STEP[direction];
  const next = [row + dr * step, col + dc * step];
  return isLetterCell(cells, ...next) ? next : null;
}

/** All cells of the word through (row, col) in the direction, from its first letter. */
export function wordAt(cells, row, col, direction) {
  if (!isLetterCell(cells, row, col)) return [];
  let start = [row, col];
  for (let prev = stepCell(cells, ...start, direction, -1); prev; prev = stepCell(cells, ...prev, direction, -1)) start = prev;
  const word = [start];
  for (let next = stepCell(cells, ...start, direction); next; next = stepCell(cells, ...next, direction)) word.push(next);
  return word;
}

/** Number shown in each clue's start cell, keyed "row,col". */
export function clueNumbers(clues) {
  return new Map(clues.map((clue) => [`${clue.row},${clue.col}`, clue.number]));
}

/** Direction to use when a cell is focused: keep the current one unless it has no word there. */
export function directionFor(cells, row, col, preferred) {
  const other = preferred === ACROSS ? DOWN : ACROSS;
  return wordAt(cells, row, col, preferred).length > 1 || wordAt(cells, row, col, other).length <= 1 ? preferred : other;
}
