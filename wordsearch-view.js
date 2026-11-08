/**
 * Word search task: a grid of letters with words hidden in straight lines. The player taps a word's
 * first letter and then its last; a hidden word is marked in the grid and struck from the list. Found
 * words are saved as they are found, and the last one completes the task.
 */
import { decodeFound, encodeFound } from "./lib/grouping.js";
import { findWord, gridLetters, lineCells, wordIndexAt } from "./lib/wordsearch.js";
import { paragraph } from "./task-ui.js";

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });
const cellButton = (ctx, { row, col }) => ctx.cells[row][col];
const allFound = (ctx) => ctx.found.length === ctx.task.words.length;

function letterButton(ctx, letter, row, col) {
  const button = Object.assign(element("button", "ws-cell", letter), { type: "button" });
  button.addEventListener("click", () => onTap(ctx, { row, col }));
  return button;
}

function board(ctx) {
  const grid = element("div", "ws-grid");
  grid.style.setProperty("--cols", String(ctx.grid[0].length));
  ctx.cells = ctx.grid.map((letters, row) => letters.map((letter, col) => letterButton(ctx, letter, row, col)));
  grid.append(...ctx.cells.flat());
  return grid;
}

function wordList(ctx) {
  const list = element("ul", "ws-words");
  ctx.wordItems = ctx.task.words.map((word) => element("li", "ws-word", word));
  list.append(...ctx.wordItems);
  return list;
}

function markFound(ctx, index) {
  ctx.found.push(index);
  findWord(ctx.grid, ctx.task.words[index])?.forEach((cell) => cellButton(ctx, cell).classList.add("ws-cell--found"));
  ctx.wordItems[index].classList.add("ws-word--found");
}

function setStart(ctx, cell) {
  if (ctx.start) cellButton(ctx, ctx.start).classList.remove("ws-cell--start");
  ctx.start = cell;
  if (cell) cellButton(ctx, cell).classList.add("ws-cell--start");
}

const countText = (ctx) => `Hittade ${ctx.found.length} av ${ctx.task.words.length}`;

function showProgress(ctx, note = "") {
  ctx.status.textContent = allFound(ctx) ? `Du hittade alla ${ctx.task.words.length} orden!` : `${note}${countText(ctx)}`;
}

function onTap(ctx, cell) {
  if (allFound(ctx)) return;
  if (!ctx.start) return setStart(ctx, cell);
  const line = lineCells(ctx.start, cell);
  setStart(ctx, null);
  if (!line || line.length < 2) return showProgress(ctx, "Tryck på första och sista bokstaven i ett ord. ");
  const index = wordIndexAt(ctx.grid, line, ctx.task.words);
  if (index === -1) return showProgress(ctx, "Inget ord där. ");
  if (ctx.found.includes(index)) return showProgress(ctx, "Det ordet har du redan hittat. ");
  markFound(ctx, index);
  showProgress(ctx);
  save(ctx);
}

async function save(ctx) {
  try {
    await ctx.progress.saveCrossword(ctx.key, encodeFound(ctx.found));
    if (!allFound(ctx)) return;
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

function savedFound({ task, key, progress }) {
  if (progress.isCompleted(key)) return task.words.map((_, index) => index);
  return decodeFound(progress.crosswordEntries?.(key), task.words.length);
}

/**
 * Builds a word search task.
 *
 * Args:
 *   options: { task, key, progress, card } with task.rows (one string of letters per grid row) and
 *     task.words (the words to find, written as they should be shown in the list).
 * Returns:
 *   The elements to append to the card.
 */
export function createWordSearch({ task, key, progress, card }) {
  const ctx = { task, key, progress, card, grid: gridLetters(task.rows), found: [], start: null };
  const grid = board(ctx);
  const words = wordList(ctx);
  ctx.status = paragraph("task-status ws-status", "");
  ctx.status.setAttribute("role", "status");
  savedFound(ctx).forEach((index) => markFound(ctx, index));
  showProgress(ctx);
  return [grid, ctx.status, words];
}
