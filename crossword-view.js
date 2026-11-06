/** Interactive crossword: grid input, clue list, debounced saving and solve detection. */
import {
  ACROSS,
  DOWN,
  SPACE,
  clueNumbers,
  correctWordIds,
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
  wordId,
} from "./lib/crossword.js";
import { wordKey } from "./lib/progress.js";
import { chokladbollIcon } from "./task-ui.js";

const SAVE_DELAY_MS = 800;
/** The crossword view currently shown for each task, so a re-render or reset can deal with its pending save. */
const liveViews = new Map();
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
  ctx.inputs.forEach((input, key) => (input.readOnly = locked || ctx.lockedCells.has(key)));
  ctx.root.classList.toggle("cw--solved", locked);
}

/** Next cell the player can type in, skipping letters locked by a hint. */
function nextEditable(ctx, cell, direction, step) {
  let next = cell && stepCell(ctx.cells, ...cell, direction, step);
  while (next && ctx.lockedCells.has(cellKey(...next))) next = stepCell(ctx.cells, ...next, direction, step);
  return next;
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

/** Awards XP for newly correct words; a failed save is simply retried on the next change. */
async function awardCorrectWords(ctx) {
  const fresh = correctWordIds(ctx.cells, ctx.entries, ctx.task.clues)
    .map((id) => wordKey(ctx.key, id))
    .filter((key) => !ctx.progress.isWordCorrect(key) && !ctx.pendingWords.has(key));
  if (fresh.length === 0) return;
  fresh.forEach((key) => ctx.pendingWords.add(key));
  try {
    await ctx.progress.markWordsCorrect(fresh);
  } catch {
    // Not fatal: the words are offered again after the next letter.
  } finally {
    fresh.forEach((key) => ctx.pendingWords.delete(key));
  }
}

function afterChange(ctx) {
  awardCorrectWords(ctx);
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

/** Uses the typed text, not the field value: Safari may keep the old letter and put the caret before it. */
function typeLetter(ctx, input, row, col, event) {
  if (ctx.solved) return;
  const letter = normalizeLetter(event.data ?? input.value);
  input.value = letter;
  ctx.entries = setEntry(ctx.entries, row, col, letter);
  if (letter) moveFocus(ctx, nextEditable(ctx, [row, col], ctx.direction, 1));
  afterChange(ctx);
}

/** Backspace in an empty cell clears and moves to the previous cell of the word. */
function backspace(ctx, event, row, col) {
  event.preventDefault();
  const previous = nextEditable(ctx, [row, col], ctx.direction, -1);
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
  input.addEventListener("input", (event) => typeLetter(ctx, input, row, col, event));
  input.addEventListener("keydown", (event) => handleKey(ctx, event, row, col));
}

function createInput(ctx, row, col, number) {
  const input = document.createElement("input");
  input.value = entryAt(ctx.entries, row, col).trim();
  input.readOnly = ctx.solved || ctx.lockedCells.has(cellKey(row, col));
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
  if (ctx.lockedCells.has(cellKey(row, col))) cell.classList.add("cw-revealed");
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
    const cells = letterCellsOfWord(ctx.cells, clue);
    moveFocus(ctx, cells.find((cell) => !ctx.lockedCells.has(cellKey(...cell))) ?? cells[0]);
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

const letterCellsOfWord = (cells, clue) =>
  wordAt(cells, clue.row, clue.col, clue.direction).filter(([r, c]) => isLetterCell(cells, r, c));

/** Cells of words already revealed with a hint point stay locked. */
function revealedCells(cells, task, key, progress) {
  const revealed = task.clues.filter((clue) => progress.isWordRevealed?.(wordKey(key, wordId(clue))));
  return new Set(revealed.flatMap((clue) => letterCellsOfWord(cells, clue)).map((cell) => cellKey(...cell)));
}

const LAMP_MESSAGES = {
  noWord: "Markera ett ord i korsordet först.",
  alreadyRight: "Det ordet är redan rätt, så ingen ledtråd behövs.",
  noPoints: "Du har inga chokladbollar. Klara ett sidouppdrag för att få fler.",
  failed: "Kunde inte använda ledtråden. Försök igen.",
};

function selectedClue(ctx) {
  if (!ctx.activeKey) return null;
  const [row, col] = ctx.activeKey.split(",").map(Number);
  return clueForWord(ctx, wordAt(ctx.cells, row, col, ctx.direction)) ?? null;
}

function fillWord(ctx, clue) {
  for (const [r, c] of letterCellsOfWord(ctx.cells, clue)) {
    const key = cellKey(r, c);
    ctx.entries = setEntry(ctx.entries, r, c, ctx.cells[r][c]);
    Object.assign(ctx.inputs.get(key), { value: ctx.cells[r][c], readOnly: true });
    ctx.inputs.get(key).parentElement.classList.add("cw-revealed");
    ctx.lockedCells.add(key);
  }
}

/** Messages about the chokladboll show right by it, where the player is looking. */
function showLampNote(ctx, text) {
  ctx.confirm.hidden = true;
  ctx.lampNote.textContent = text;
  ctx.lampNote.hidden = !text;
}

const clueName = (clue) => `${clue.number} ${DIRECTION_LABELS[clue.direction].toLocaleLowerCase("sv-SE")}`;

async function revealSelected(ctx, clue) {
  ctx.confirm.hidden = true;
  if (ctx.revealing) return;
  ctx.revealing = true;
  try {
    await ctx.progress.revealWord(wordKey(ctx.key, wordId(clue)));
    fillWord(ctx, clue);
    showLampNote(ctx, "");
    afterChange(ctx);
  } catch {
    showLampNote(ctx, LAMP_MESSAGES.failed);
  } finally {
    ctx.revealing = false;
  }
}

/** Checks everything that must not cost a hint point before asking for confirmation. */
function onLamp(ctx) {
  if (ctx.solved) return;
  const clue = selectedClue(ctx);
  if (!clue) return showLampNote(ctx, LAMP_MESSAGES.noWord);
  if (correctWordIds(ctx.cells, ctx.entries, [clue]).length > 0) return showLampNote(ctx, LAMP_MESSAGES.alreadyRight);
  if ((ctx.progress.hintBalance?.() ?? 0) < 1) return showLampNote(ctx, LAMP_MESSAGES.noPoints);
  showLampNote(ctx, "");
  ctx.pendingClue = clue;
  ctx.confirmText.textContent = `Vill du använda en chokladboll för ${clueName(clue)}: ”${clue.text}”?`;
  ctx.confirm.hidden = false;
}

function confirmButton(text, className, onClick) {
  const button = createElement("button", `small ${className}`, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

function createLamp(ctx) {
  const lamp = createElement("button", "cw-lamp");
  lamp.type = "button";
  lamp.append(chokladbollIcon());
  lamp.setAttribute("aria-label", "Använd en ledtråd för det markerade ordet (kostar 1 chokladboll)");
  lamp.addEventListener("click", () => onLamp(ctx));
  ctx.confirm = Object.assign(createElement("div", "cw-confirm hint-popover"), { hidden: true });
  ctx.confirmText = createElement("p");
  ctx.confirm.append(
    ctx.confirmText,
    confirmButton("Ja", "hint-yes", () => revealSelected(ctx, ctx.pendingClue)),
    confirmButton("Nej", "hint-no", () => (ctx.confirm.hidden = true)),
  );
  ctx.lampNote = Object.assign(createElement("p", "cw-lamp-note hint-popover"), { hidden: true });
  ctx.lampNote.setAttribute("role", "status");
  return ctx.solved ? [] : [lamp, ctx.confirm, ctx.lampNote];
}

function createContext({ task, key, progress, card }) {
  const cells = solutionCells(task.grid);
  const solved = progress.isCompleted(key);
  const entries = solved ? solvedEntries(cells) : restoreEntries(cells, progress.crosswordEntries(key));
  const numbers = clueNumbers(task.clues);
  const lockedCells = revealedCells(cells, task, key, progress);
  // Revealed words are stored on their own, so they show even if the latest letters were never saved.
  const filled = [...lockedCells].reduce((rows, cell) => {
    const [r, c] = cell.split(",").map(Number);
    return setEntry(rows, r, c, cells[r][c]);
  }, entries);
  return {
    task, key, progress, card, cells, solved, entries: filled, numbers, lockedCells,
    inputs: new Map(),
    clueButtons: [],
    pendingWords: new Set(),
    direction: ACROSS,
  };
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
  if (liveViews.has(options.key)) flushSave(liveViews.get(options.key));
  const ctx = createContext(options);
  liveViews.set(options.key, ctx);
  ctx.root = createElement("div", "cw");
  ctx.currentClue = createElement("p", "cw-current-clue");
  const toolbar = createElement("div", "cw-toolbar");
  toolbar.append(ctx.currentClue, ...createLamp(ctx));
  ctx.status = createElement("p", "task-status", ctx.solved ? "Korsordet är löst!" : "");
  ctx.status.setAttribute("role", "status");
  const clues = createElement("div", "cw-clues");
  clues.append(...createClueGroup(ctx, ACROSS), ...createClueGroup(ctx, DOWN));
  ctx.root.append(toolbar, createGrid(ctx), clues, ctx.status);
  ctx.root.classList.toggle("cw--solved", ctx.solved);
  flushWhenHidden(ctx);
  return ctx.root;
}

/** TEST_RESET_DOOR: drops a pending save so letters typed just before a reset are not written back. */
export function discardPendingCrossword(key) {
  const ctx = liveViews.get(key);
  if (!ctx) return;
  clearTimeout(ctx.saveTimer);
  ctx.dirty = false;
}
