/** Interactive crossword: grid input, clue list, debounced saving and solve detection. */
import {
  ACROSS,
  DOWN,
  SPACE,
  clueNumbers,
  directionFor,
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
} from "./lib/crossword.js";

const SAVE_DELAY_MS = 800;
const DIRECTION_LABELS = { [ACROSS]: "Vågrätt", [DOWN]: "Lodrätt" };
const ARROWS = { ArrowRight: [ACROSS, 1], ArrowLeft: [ACROSS, -1], ArrowDown: [DOWN, 1], ArrowUp: [DOWN, -1] };
const cellKey = (row, col) => `${row},${col}`;

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function scheduleSave(ctx) {
  clearTimeout(ctx.saveTimer);
  ctx.dirty = true;
  ctx.saveTimer = setTimeout(() => flushSave(ctx), SAVE_DELAY_MS);
}

async function flushSave(ctx) {
  clearTimeout(ctx.saveTimer);
  if (!ctx.dirty) return;
  ctx.dirty = false;
  try {
    await ctx.progress.saveCrossword(ctx.key, ctx.entries);
  } catch {
    ctx.dirty = true;
    ctx.status.textContent = "Kunde inte spara korsordet. Det försöker igen när du skriver.";
  }
}

function setLocked(ctx, locked) {
  ctx.solved = locked;
  ctx.inputs.forEach((input) => (input.readOnly = locked));
  ctx.root.classList.toggle("cw--solved", locked);
}

async function finish(ctx) {
  setLocked(ctx, true);
  ctx.dirty = true;
  await flushSave(ctx);
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    ctx.status.textContent = "Korsordet är löst! 🎉";
  } catch {
    setLocked(ctx, false);
    ctx.status.textContent = "Rätt! Men det gick inte att spara. Ändra en bokstav och försök igen.";
  }
}

function afterChange(ctx) {
  if (isSolved(ctx.cells, ctx.entries)) return finish(ctx);
  ctx.status.textContent = isFilled(ctx.cells, ctx.entries) ? "Alla rutor är ifyllda, men något stämmer inte än." : "";
  scheduleSave(ctx);
}

function moveFocus(ctx, cell) {
  if (cell) ctx.inputs.get(cellKey(...cell)).focus();
}

function clueForWord(ctx, word) {
  const [row, col] = word[0] ?? [];
  return ctx.task.clues.find((clue) => clue.direction === ctx.direction && clue.row === row && clue.col === col);
}

function highlight(ctx, row, col) {
  const word = wordAt(ctx.cells, row, col, ctx.direction);
  const inWord = new Set(word.map((cell) => cellKey(...cell)));
  ctx.inputs.forEach((input, key) => {
    input.parentElement.classList.toggle("cw-active-word", inWord.has(key));
    input.parentElement.classList.toggle("cw-current", key === cellKey(row, col));
  });
  const clue = clueForWord(ctx, word);
  ctx.clueButtons.forEach((button) => button.toggleAttribute("aria-current", button.clue === clue));
  ctx.currentClue.textContent = clue ? `${clue.number} ${DIRECTION_LABELS[clue.direction]}: ${clue.text}` : "";
}

function focusCell(ctx, input, row, col) {
  ctx.activeKey = cellKey(row, col);
  ctx.direction = directionFor(ctx.cells, row, col, ctx.direction);
  highlight(ctx, row, col);
  input.select();
}

/** A second tap on the already active cell switches between across and down. */
function toggleDirection(ctx, row, col) {
  const other = ctx.direction === ACROSS ? DOWN : ACROSS;
  if (wordAt(ctx.cells, row, col, other).length > 1) ctx.direction = other;
  highlight(ctx, row, col);
}

function typeLetter(ctx, input, row, col) {
  if (ctx.solved) return;
  const letter = normalizeLetter(input.value);
  input.value = letter;
  ctx.entries = setEntry(ctx.entries, row, col, letter);
  if (letter) moveFocus(ctx, stepCell(ctx.cells, row, col, ctx.direction));
  afterChange(ctx);
}

/** Backspace in an empty cell clears and moves to the previous cell of the word. */
function backspace(ctx, event, row, col) {
  event.preventDefault();
  const previous = stepCell(ctx.cells, row, col, ctx.direction, -1);
  if (ctx.solved || !previous) return;
  ctx.entries = setEntry(ctx.entries, ...previous, "");
  ctx.inputs.get(cellKey(...previous)).value = "";
  moveFocus(ctx, previous);
  afterChange(ctx);
}

function handleKey(ctx, event, row, col) {
  if (event.key === "Backspace" && !event.target.value) return backspace(ctx, event, row, col);
  const arrow = ARROWS[event.key];
  if (!arrow) return;
  event.preventDefault();
  ctx.direction = arrow[0];
  moveFocus(ctx, stepCell(ctx.cells, row, col, ...arrow));
}

function wireInput(ctx, input, row, col) {
  input.addEventListener("pointerdown", () => (ctx.wasActive = ctx.activeKey === cellKey(row, col)));
  input.addEventListener("click", () => ctx.wasActive && toggleDirection(ctx, row, col));
  input.addEventListener("focus", () => focusCell(ctx, input, row, col));
  input.addEventListener("input", () => typeLetter(ctx, input, row, col));
  input.addEventListener("keydown", (event) => handleKey(ctx, event, row, col));
}

function createInput(ctx, row, col, number) {
  const input = document.createElement("input");
  input.value = entryAt(ctx.entries, row, col).trim();
  input.readOnly = ctx.solved;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("autocapitalize", "characters");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("aria-label", `${number ? `${number}, ` : ""}rad ${row + 1}, kolumn ${col + 1}`);
  wireInput(ctx, input, row, col);
  ctx.inputs.set(cellKey(row, col), input);
  return input;
}

function createCell(ctx, row, col) {
  if (ctx.cells[row][col] === SPACE) return createElement("div", "cw-space");
  if (!isLetterCell(ctx.cells, row, col)) return createElement("div", "cw-block");
  const cell = createElement("div", "cw-cell");
  const number = ctx.numbers.get(cellKey(row, col));
  if (number) cell.append(createElement("span", "cw-number", String(number)));
  cell.append(createInput(ctx, row, col, number));
  return cell;
}

function createGrid(ctx) {
  const grid = createElement("div", "cw-grid");
  grid.style.setProperty("--cols", ctx.cells[0].length);
  ctx.cells.forEach((cells, row) => cells.forEach((_, col) => grid.append(createCell(ctx, row, col))));
  return grid;
}

function createClueButton(ctx, clue) {
  const button = createElement("button", "cw-clue", `${clue.number}. ${clue.text}`);
  button.type = "button";
  button.clue = clue;
  button.addEventListener("click", () => {
    ctx.direction = clue.direction;
    moveFocus(ctx, [clue.row, clue.col]);
  });
  ctx.clueButtons.push(button);
  return button;
}

function createClueGroup(ctx, direction) {
  const clues = ctx.task.clues.filter((clue) => clue.direction === direction).sort((a, b) => a.number - b.number);
  if (clues.length === 0) return [];
  const group = createElement("div", `cw-clue-group cw-clue-group--${direction}`);
  const list = createElement("ol", "cw-clue-list");
  for (const clue of clues) {
    const item = createElement("li");
    item.append(createClueButton(ctx, clue));
    list.append(item);
  }
  group.append(createElement("h4", null, DIRECTION_LABELS[direction]), list);
  return [group];
}

/** Saves the last letters when the page is hidden; removes itself once the crossword is gone. */
function flushWhenHidden(ctx) {
  const onChange = () => {
    if (!ctx.root.isConnected) return document.removeEventListener("visibilitychange", onChange);
    if (document.visibilityState === "hidden") flushSave(ctx);
  };
  document.addEventListener("visibilitychange", onChange);
}

function createContext({ task, key, progress, card }) {
  const cells = solutionCells(task.grid);
  const solved = progress.isCompleted(key);
  const entries = solved ? solvedEntries(cells) : restoreEntries(cells, progress.crosswordEntries(key));
  const numbers = clueNumbers(task.clues);
  return { task, key, progress, card, cells, solved, entries, numbers, inputs: new Map(), clueButtons: [], direction: ACROSS };
}

/**
 * Builds the crossword for a task.
 *
 * Args:
 *   options: { task, key, progress, card } where progress offers isCompleted, complete,
 *     crosswordEntries and saveCrossword, and card is the task card to mark as done.
 * Returns:
 *   The crossword element.
 */
export function createCrossword(options) {
  const ctx = createContext(options);
  ctx.root = createElement("div", "cw");
  ctx.currentClue = createElement("p", "cw-current-clue");
  ctx.status = createElement("p", "task-status", ctx.solved ? "Korsordet är löst!" : "");
  ctx.status.setAttribute("role", "status");
  const clues = createElement("div", "cw-clues");
  clues.append(...createClueGroup(ctx, ACROSS), ...createClueGroup(ctx, DOWN));
  ctx.root.append(ctx.currentClue, createGrid(ctx), clues, ctx.status);
  ctx.root.classList.toggle("cw--solved", ctx.solved);
  flushWhenHidden(ctx);
  return ctx.root;
}
