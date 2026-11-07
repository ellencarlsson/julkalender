/**
 * Picture puzzle: the picture is cut into pieces that start shuffled. Tap two pieces to swap them;
 * the order is saved as you go, and the task is solved when every piece is in its place.
 */
import { decodeOrder, encodeOrder, isSolved, shuffledOrder, swapPieces } from "./lib/puzzle.js";
import { paragraph } from "./task-ui.js";

const element = (tag, className) => Object.assign(document.createElement(tag), { className });

/** Shows one piece of the picture by sliding the whole picture behind the tile. */
function paintPiece(tile, piece, { cols, rows }) {
  const [col, row] = [piece % cols, Math.floor(piece / cols)];
  tile.style.backgroundPositionX = `${cols > 1 ? (col / (cols - 1)) * 100 : 0}%`;
  tile.style.backgroundPositionY = `${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`;
}

function render(ctx) {
  ctx.tiles.forEach((tile, place) => {
    paintPiece(tile, ctx.order[place], ctx.task);
    tile.classList.toggle("puzzle-piece--selected", place === ctx.selected);
  });
}

async function solve(ctx) {
  ctx.done = true;
  ctx.board.classList.add("puzzle-board--solved");
  ctx.status.textContent = "Pusslet är klart!";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/** First tap picks a piece, the second swaps it with the tapped one; tapping it again lets go. */
function onTap(ctx, place) {
  if (ctx.done) return;
  if (ctx.selected === null || ctx.selected === place) {
    ctx.selected = ctx.selected === place ? null : place;
    return render(ctx);
  }
  ctx.order = swapPieces(ctx.order, ctx.selected, place);
  ctx.selected = null;
  render(ctx);
  ctx.progress.saveCrossword?.(ctx.key, encodeOrder(ctx.order)).catch(() => {});
  if (isSolved(ctx.order)) solve(ctx);
}

function pieceButton(ctx, place) {
  const tile = Object.assign(element("button", "puzzle-piece"), { type: "button" });
  tile.style.backgroundImage = `url("${ctx.task.picture}")`;
  tile.style.backgroundSize = `${ctx.task.cols * 100}% ${ctx.task.rows * 100}%`;
  tile.setAttribute("aria-label", `Pusselbit ${place + 1}`);
  tile.addEventListener("click", () => onTap(ctx, place));
  return tile;
}

/** The board takes the picture's own shape once its size is known. */
function buildBoard(ctx) {
  ctx.board = element("div", "puzzle-board");
  ctx.board.style.gridTemplateColumns = `repeat(${ctx.task.cols}, 1fr)`;
  const probe = new Image();
  probe.addEventListener("load", () => (ctx.board.style.aspectRatio = `${probe.naturalWidth} / ${probe.naturalHeight}`));
  probe.src = ctx.task.picture;
  ctx.tiles = ctx.order.map((_, place) => pieceButton(ctx, place));
  ctx.board.append(...ctx.tiles);
  if (ctx.done) ctx.board.classList.add("puzzle-board--solved");
  return ctx.board;
}

/**
 * Builds a picture puzzle task.
 *
 * Args:
 *   options: { task, key, progress, card } with task.picture, task.cols and task.rows.
 * Returns:
 *   The elements to append to the card.
 */
export function createPuzzle({ task, key, progress, card }) {
  const count = task.cols * task.rows;
  const done = progress.isCompleted(key);
  const solved = Array.from({ length: count }, (_, index) => index);
  const order = done ? solved : decodeOrder(progress.crosswordEntries?.(key), count) ?? shuffledOrder(count);
  const ctx = { task, key, progress, card, order, done, selected: null };
  const board = buildBoard(ctx);
  ctx.status = paragraph("task-status puzzle-status", done ? "Pusslet är klart!" : "");
  ctx.status.setAttribute("role", "status");
  render(ctx);
  return [board, ctx.status];
}
