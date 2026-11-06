/** Matching task: tap an item, then the target it belongs with; right pairs lock, wrong ones bounce back. */
import { isCorrectPair, isMatchingSolved, matchingBoard, shuffled } from "./lib/matching.js";
import { CHALLENGE_DONE_LABEL } from "./lib/progress.js";
import { doneState, paragraph } from "./task-ui.js";

const WRONG_MS = 600;
const INSTRUCTION = "Para ihop rätt saker. Tryck först på något i vänstra kolumnen och sedan på det det hör till.";

function sideContent(side) {
  if (!side.image) return [document.createTextNode(side.text)];
  const image = Object.assign(document.createElement("img"), { src: side.image, alt: side.alt ?? "" });
  image.loading = "lazy";
  return [image];
}

function sideButton(side, role) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: `match-card match-${role}` });
  button.dataset.pair = side.pair;
  button.append(...sideContent(side));
  if (side.image) button.setAttribute("aria-label", side.alt || "Bild");
  return button;
}

function lockPair(ctx, pair) {
  ctx.matched.add(pair);
  ctx.root.querySelectorAll(`.match-card[data-pair="${pair}"]`).forEach((button) => {
    button.classList.add("match-done");
    button.disabled = true;
    button.removeAttribute("aria-pressed");
  });
}

function bounce(ctx, item, target) {
  ctx.status.textContent = "Inte rätt, försök igen.";
  [item, target].forEach((button) => button.classList.add("match-wrong"));
  setTimeout(() => [item, target].forEach((button) => button.classList.remove("match-wrong")), WRONG_MS);
}

async function completeIfSolved(ctx) {
  if (!isMatchingSolved(ctx.task.pairs, ctx.matched)) return;
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    ctx.status.replaceWith(doneState(CHALLENGE_DONE_LABEL));
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen genom att ladda om sidan.";
  }
}

function selectItem(ctx, button) {
  ctx.selected?.removeAttribute("aria-pressed");
  ctx.selected = ctx.selected === button ? null : button;
  ctx.selected?.setAttribute("aria-pressed", "true");
  ctx.status.textContent = "";
}

function tryTarget(ctx, target) {
  const item = ctx.selected;
  if (!item) return (ctx.status.textContent = "Välj först något i vänstra kolumnen.");
  selectItem(ctx, item);
  if (!isCorrectPair(Number(item.dataset.pair), Number(target.dataset.pair))) return bounce(ctx, item, target);
  ctx.status.textContent = "";
  lockPair(ctx, Number(item.dataset.pair));
  completeIfSolved(ctx);
}

function column(ctx, sides, role, onTap) {
  const list = Object.assign(document.createElement("div"), { className: `match-column match-column-${role}` });
  for (const side of shuffled(sides, `${ctx.key}-${role}`)) {
    const button = sideButton(side, role);
    button.addEventListener("click", () => onTap(ctx, button));
    list.append(button);
  }
  return list;
}

/**
 * Builds a matching task.
 *
 * Args:
 *   options: { task, key, progress, card } where card is the task card to mark as done.
 * Returns:
 *   The elements to append to the card.
 */
export function createMatching({ task, key, progress, card }) {
  const { items, targets } = matchingBoard(task.pairs);
  const ctx = { task, key, progress, card, matched: new Set(), selected: null };
  ctx.root = Object.assign(document.createElement("div"), { className: "match-board" });
  ctx.root.append(column(ctx, items, "item", selectItem), column(ctx, targets, "target", tryTarget));
  ctx.status = paragraph("task-status", "");
  ctx.status.setAttribute("role", "status");
  if (progress.isCompleted(key)) {
    task.pairs.forEach((_, pair) => lockPair(ctx, pair));
    return [ctx.root, doneState(CHALLENGE_DONE_LABEL)];
  }
  return [paragraph("task-instruction", INSTRUCTION), ctx.root, ctx.status];
}
