/**
 * Sudoku task: tap a cell, then a digit on the pad (or type it). Clashing digits turn red, the grid
 * is saved as you go, and it is solved when every cell matches the solution. A chokladboll fills in
 * three random empty cells.
 */
import { conflicts, decodeRows, encodeRows, isSolved, parseGrid, peers, pickHintCells, SIZE } from "./lib/sudoku.js";
import { chokladbollIcon, doneState, paragraph } from "./task-ui.js";

const SAVE_DELAY_MS = 600;
const HINT_CELLS = 3;
const MESSAGES = {
  ask: `Vill du använda en chokladboll för att fylla i ${HINT_CELLS} rutor?`,
  noPoints: "Du har ätit upp alla chokladbollar 😭 Klara fler sidequests för att samla fler.",
  full: "Alla rutor är redan ifyllda.",
  failed: "Kunde inte använda chokladbollen. Försök igen.",
  notYet: "Något stämmer inte än – kolla de röda siffrorna.",
};

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

const isLocked = (ctx, index) => ctx.givens.has(index) || ctx.hinted.has(index);

function cellButton(ctx, index) {
  const cell = element("button", "sdk-cell");
  cell.type = "button";
  cell.dataset.index = index;
  if (ctx.givens.has(index)) cell.classList.add("sdk-given");
  cell.addEventListener("click", () => select(ctx, index));
  return cell;
}

/** Highlights the selected cell, its row/column/box and every cell with the same digit. */
function refresh(ctx) {
  const clashing = conflicts(ctx.values);
  const related = new Set(ctx.selected === null ? [] : peers(ctx.selected));
  const digit = ctx.selected === null ? 0 : ctx.values[ctx.selected];
  ctx.cells.forEach((cell, index) => {
    cell.textContent = ctx.values[index] || "";
    cell.classList.toggle("sdk-selected", index === ctx.selected);
    cell.classList.toggle("sdk-related", related.has(index));
    cell.classList.toggle("sdk-same", Boolean(digit) && ctx.values[index] === digit);
    cell.classList.toggle("sdk-conflict", clashing.has(index));
    cell.classList.toggle("sdk-hinted", ctx.hinted.has(index));
  });
}

function select(ctx, index) {
  ctx.selected = index;
  refresh(ctx);
}

function scheduleSave(ctx) {
  clearTimeout(ctx.saveTimer);
  ctx.saveTimer = setTimeout(() => ctx.progress.saveCrossword?.(ctx.key, encodeRows(ctx.values, ctx.hinted)), SAVE_DELAY_MS);
}

function setDigit(ctx, digit) {
  if (ctx.done || ctx.selected === null || isLocked(ctx, ctx.selected)) return;
  ctx.values[ctx.selected] = digit;
  ctx.status.textContent = "";
  refresh(ctx);
  scheduleSave(ctx);
  checkSolved(ctx);
}

function moveSelection(ctx, key) {
  const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SIZE, ArrowDown: SIZE };
  const next = (ctx.selected ?? 0) + steps[key];
  if (next >= 0 && next < ctx.values.length) select(ctx, next);
}

function onKey(ctx, event) {
  if (/^[1-9]$/.test(event.key)) setDigit(ctx, Number(event.key));
  else if (["Backspace", "Delete", "0"].includes(event.key)) setDigit(ctx, 0);
  else if (event.key.startsWith("Arrow")) moveSelection(ctx, event.key);
  else return;
  event.preventDefault();
}

function digitPad(ctx) {
  const pad = element("div", "sdk-pad");
  for (let digit = 1; digit <= SIZE; digit++) pad.append(padButton(String(digit), () => setDigit(ctx, digit)));
  pad.append(padButton("⌫", () => setDigit(ctx, 0), "Sudda"));
  return pad;
}

function padButton(text, onClick, label) {
  const button = element("button", "sdk-key", text);
  button.type = "button";
  if (label) button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

function checkSolved(ctx) {
  if (ctx.values.some((value) => !value)) return;
  if (!isSolved(ctx.values, ctx.solution)) return (ctx.status.textContent = MESSAGES.notYet);
  complete(ctx);
}

async function complete(ctx) {
  ctx.done = true;
  clearTimeout(ctx.saveTimer);
  ctx.selected = null;
  refresh(ctx);
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    ctx.pad.remove();
    ctx.lamp?.remove();
    const label = ctx.xp ? `Sudokut är löst! 🎉 +${ctx.xp} XP` : "Sudokut är löst!";
    ctx.status.replaceWith(Object.assign(doneState(label), { className: "task-done-state match-success" }));
  } catch {
    ctx.done = false;
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/** Messages about the chokladboll show right by it, like in the crossword. */
function showNote(ctx, text) {
  ctx.confirm.hidden = true;
  ctx.note.textContent = text;
  ctx.note.hidden = !text;
}

function onLamp(ctx) {
  if (ctx.done) return;
  if ((ctx.progress.hintBalance?.() ?? 0) < 1) return showNote(ctx, MESSAGES.noPoints);
  if (!ctx.values.includes(0)) return showNote(ctx, MESSAGES.full);
  showNote(ctx, "");
  ctx.confirm.hidden = false;
}

/** Each use gets its own key, so every hint costs one chokladboll and a door reset refunds them. */
function nextHintKey(ctx) {
  const used = (ctx.progress.revealedWordKeys?.() ?? []).filter((key) => key.startsWith(`${ctx.key}|hint-`));
  return `${ctx.key}|hint-${used.length + 1}`;
}

async function useHint(ctx) {
  ctx.confirm.hidden = true;
  try {
    await ctx.progress.useHint(nextHintKey(ctx));
  } catch {
    return showNote(ctx, MESSAGES.failed);
  }
  for (const index of pickHintCells(ctx.values, HINT_CELLS)) {
    ctx.values[index] = ctx.solution[index];
    ctx.hinted.add(index);
  }
  refresh(ctx);
  await ctx.progress.saveCrossword?.(ctx.key, encodeRows(ctx.values, ctx.hinted));
  checkSolved(ctx);
}

function confirmButton(text, className, onClick) {
  const button = element("button", `small ${className}`, text);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

function hintControls(ctx) {
  ctx.lamp = element("button", "cw-lamp");
  ctx.lamp.type = "button";
  ctx.lamp.append(chokladbollIcon());
  ctx.lamp.setAttribute("aria-label", `Fyll i ${HINT_CELLS} rutor (kostar 1 chokladboll)`);
  ctx.lamp.addEventListener("click", () => onLamp(ctx));
  ctx.confirm = Object.assign(element("div", "cw-confirm hint-popover"), { hidden: true });
  ctx.confirm.append(
    element("p", "", MESSAGES.ask),
    confirmButton("Ja", "hint-yes", () => useHint(ctx)),
    confirmButton("Nej", "hint-no", () => (ctx.confirm.hidden = true)),
  );
  ctx.note = Object.assign(element("p", "cw-lamp-note hint-popover"), { hidden: true });
  ctx.note.setAttribute("role", "status");
  return [ctx.lamp, ctx.confirm, ctx.note];
}

/** Puzzle digits, then whatever the player had saved on top of them. */
function savedValues(puzzle, key, progress) {
  const saved = decodeRows(progress.crosswordEntries?.(key));
  return { values: puzzle.map((given, index) => given || saved.values[index]), hinted: saved.hinted };
}

function buildGrid(ctx) {
  const grid = element("div", "sdk-grid");
  grid.tabIndex = 0;
  grid.setAttribute("aria-label", "Sudoku");
  ctx.cells = ctx.values.map((_, index) => cellButton(ctx, index));
  grid.append(...ctx.cells);
  grid.addEventListener("keydown", (event) => onKey(ctx, event));
  return grid;
}

/**
 * Builds a sudoku task.
 *
 * Args:
 *   options: { task, key, progress, card, xp } with task.puzzle and task.solution as 81 characters.
 * Returns:
 *   The elements to append to the card.
 */
export function createSudoku({ task, key, progress, card, xp }) {
  const puzzle = parseGrid(task.puzzle);
  const solution = parseGrid(task.solution);
  const givens = new Set(puzzle.flatMap((given, index) => (given ? [index] : [])));
  const done = progress.isCompleted(key);
  const state = done ? { values: [...solution], hinted: new Set() } : savedValues(puzzle, key, progress);
  const ctx = { task, key, progress, card, xp, solution, givens, ...state, selected: null, done };
  const grid = buildGrid(ctx);
  refresh(ctx);
  if (done) return [grid, doneState("Sudokut är löst!")];
  ctx.status = paragraph("task-status", "");
  ctx.status.setAttribute("role", "status");
  ctx.pad = digitPad(ctx);
  return [...hintControls(ctx), grid, ctx.pad, ctx.status];
}
