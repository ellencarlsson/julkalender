/** Crossword grid logic: solution cells, word paths, player entries and solving. */

export const BLOCK = "#";
export const EMPTY = " ";
/** Gap inside a multi-word answer ("STUPID SONG"); written as a space in the grid, never typed into. */
export const SPACE = "_";
export const ACROSS = "across";
export const DOWN = "down";

const STEP = { [ACROSS]: [0, 1], [DOWN]: [1, 0] };
const upper = (text) => text.normalize("NFC").toLocaleUpperCase("sv-SE");

/** Solution as a 2D array of single uppercase letters, with BLOCK for black squares and SPACE for gaps. */
export function solutionCells(grid) {
  return grid.map((row) => [...upper(row)].map((cell) => (cell === " " ? SPACE : cell)));
}

/** Last letter typed into a cell, uppercased; "" for anything that is not a letter. */
export function normalizeLetter(text) {
  const letters = [...upper(text ?? "")].filter((char) => /\p{L}/u.test(char));
  return letters.at(-1) ?? "";
}

const SWEDISH_LETTERS = new Set(["Å", "Ä", "Ö"]);

/** Strips foreign accents (Ü → U, É → E) but keeps Å, Ä and Ö, which are letters of their own in Swedish. */
function baseLetter(letter) {
  if (SWEDISH_LETTERS.has(letter)) return letter;
  return letter.normalize("NFD").replace(/\p{M}/gu, "");
}

/** A typed letter matches the grid letter exactly or without a foreign accent, so FÜR ELISE counts as FUR ELISE. */
export function lettersMatch(typed, solution) {
  return typed === solution || (typed !== "" && baseLetter(typed) === baseLetter(solution));
}

const isFixed = (cell) => cell === BLOCK || cell === SPACE;
const isWordCell = (cells, row, col) => cells[row]?.[col] !== undefined && cells[row][col] !== BLOCK;
export const isLetterCell = (cells, row, col) => isWordCell(cells, row, col) && cells[row][col] !== SPACE;

export function emptyEntries(cells) {
  return cells.map((row) => row.map((cell) => (isFixed(cell) ? cell : EMPTY)).join(""));
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
  const restore = (cell, r, c) => (isFixed(cell) ? cell : normalizeLetter([...saved[r]][c]) || EMPTY);
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

const letterCellsOf = (cells) => cells.flatMap((row, r) => row.flatMap((cell, c) => (isFixed(cell) ? [] : [[r, c]])));

export function isFilled(cells, entries) {
  return letterCellsOf(cells).every(([r, c]) => entryAt(entries, r, c) !== EMPTY);
}

export function isSolved(cells, entries) {
  return letterCellsOf(cells).every(([r, c]) => lettersMatch(entryAt(entries, r, c), cells[r][c]));
}

export function solvedEntries(cells) {
  return cells.map((row) => row.join(""));
}

const offset = ([row, col], direction, step) => [row + STEP[direction][0] * step, col + STEP[direction][1] * step];

/** Next letter cell in the direction, skipping gaps; null at a black square or the edge. */
export function stepCell(cells, row, col, direction, step = 1) {
  for (let next = offset([row, col], direction, step); isWordCell(cells, ...next); next = offset(next, direction, step)) {
    if (isLetterCell(cells, ...next)) return next;
  }
  return null;
}

/** All cells of the word through (row, col) in the direction, from its first cell; gaps included. */
export function wordAt(cells, row, col, direction) {
  if (!isLetterCell(cells, row, col)) return [];
  let start = [row, col];
  while (isWordCell(cells, ...offset(start, direction, -1))) start = offset(start, direction, -1);
  const word = [];
  for (let cell = start; isWordCell(cells, ...cell); cell = offset(cell, direction, 1)) word.push(cell);
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

/** Stable id for the word a clue describes, e.g. "across-0-2". */
export function wordId(clue) {
  return `${clue.direction}-${clue.row}-${clue.col}`;
}

/** Ids of every clue whose word is completely and correctly filled in. */
export function correctWordIds(cells, entries, clues) {
  const isCorrect = (clue) =>
    wordAt(cells, clue.row, clue.col, clue.direction)
      .filter(([r, c]) => isLetterCell(cells, r, c))
      .every(([r, c]) => lettersMatch(entryAt(entries, r, c), cells[r][c]));
  return clues.filter(isCorrect).map(wordId);
}
