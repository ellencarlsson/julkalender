/**
 * Matching task: tap an item, then the target it belongs with. A chosen pair is joined by a coloured line and can be
 * changed freely; only when every item has a partner are all pairs checked at once, so single pairs
 * never reveal whether they are right.
 */
import { checkLinks, matchingBoard, nextBadge, shuffled } from "./lib/matching.js";
import { createLineLayer, drawLines } from "./match-lines.js";
import { CHALLENGE_DONE_LABEL } from "./lib/progress.js";
import { doneState, paragraph } from "./task-ui.js";

const WRONG_MS = 600;
const INSTRUCTION = "Para ihop rätt saker. Tryck först på en bild och sedan på det den hör till.";
const NOT_YET = "Inte rätt än – byt några par och försök igen.";

const successLabel = (xp) => (xp ? `Alla rätt! 🎉 +${xp} XP` : CHALLENGE_DONE_LABEL);
const card = (ctx, role, pair) => ctx.root.querySelector(`.match-${role}[data-pair="${pair}"]`);

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

const LINE_COLOR = "#2b1d12";
const SOLVED_COLOR = "#2c6a3f";

/** Marks a card as part of a pair; the pair itself is shown by the line between the two cards. */
function setBadge(button, badge) {
  button.classList.toggle("match-linked", Boolean(badge));
}

function redraw(ctx) {
  // Lines start at the picture itself, not the wider button around it.
  const pairs = [...ctx.links].map(([item, target]) => ({
    item: card(ctx, "item", item).querySelector("img") ?? card(ctx, "item", item),
    target: card(ctx, "target", target),
    color: ctx.solved ? SOLVED_COLOR : LINE_COLOR,
  }));
  drawLines(ctx.root, ctx.lines, pairs);
}

function unlink(ctx, item) {
  if (!ctx.links.has(item)) return;
  setBadge(card(ctx, "target", ctx.links.get(item)), null);
  setBadge(card(ctx, "item", item), null);
  ctx.links.delete(item);
  ctx.badges.delete(item);
  redraw(ctx);
}

function link(ctx, item, target) {
  const owner = [...ctx.links].find(([, chosen]) => chosen === target)?.[0];
  if (owner !== undefined) unlink(ctx, owner);
  const badge = nextBadge(new Set(ctx.badges.values()));
  ctx.links.set(item, target);
  ctx.badges.set(item, badge);
  setBadge(card(ctx, "item", item), badge);
  setBadge(card(ctx, "target", target), badge);
  redraw(ctx);
}

function select(ctx, button) {
  ctx.selected?.removeAttribute("aria-pressed");
  ctx.selected = ctx.selected === button ? null : button;
  ctx.selected?.setAttribute("aria-pressed", "true");
}

/** Tapping a paired item frees it so it can be paired again. */
function selectItem(ctx, button) {
  ctx.status.textContent = "";
  unlink(ctx, Number(button.dataset.pair));
  select(ctx, button);
}

function tryTarget(ctx, target) {
  const item = ctx.selected;
  if (!item) return (ctx.status.textContent = "Välj först en bild att para ihop.");
  select(ctx, item);
  link(ctx, Number(item.dataset.pair), Number(target.dataset.pair));
  checkAll(ctx);
}

function shakeBoard(ctx) {
  ctx.root.classList.add("match-wrong");
  setTimeout(() => ctx.root.classList.remove("match-wrong"), WRONG_MS);
}

function checkAll(ctx) {
  const result = checkLinks(ctx.links, ctx.task.pairs.length);
  if (result === "incomplete") return;
  if (result === "wrong") {
    ctx.status.textContent = NOT_YET;
    return shakeBoard(ctx);
  }
  lockAll(ctx);
  complete(ctx);
}

/** Solved: every picture is joined to its own name with a green line. */
function lockAll(ctx) {
  ctx.solved = true;
  ctx.task.pairs.forEach((_, pair) => ctx.links.set(pair, pair));
  redraw(ctx);
  ctx.root.querySelectorAll(".match-card").forEach((button) => {
    setBadge(button, null);
    button.classList.add("match-done");
    button.disabled = true;
    button.removeAttribute("aria-pressed");
  });
}

async function complete(ctx) {
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    const success = doneState(successLabel(ctx.xp));
    success.classList.add("match-success");
    ctx.status.replaceWith(success);
    // Lets a paged door move on to the next block.
    ctx.card.dispatchEvent(new CustomEvent("task-solved", { bubbles: true }));
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen genom att ladda om sidan.";
  }
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
 *   options: { task, key, progress, card, xp } where card is the task card to mark as done and
 *     xp the XP this task is worth, shown when it is solved.
 * Returns:
 *   The elements to append to the card.
 */
export function createMatching({ task, key, progress, card: taskCard, xp }) {
  const { items, targets } = matchingBoard(task.pairs);
  const ctx = { task, key, progress, card: taskCard, xp, links: new Map(), badges: new Map(), selected: null };
  ctx.root = Object.assign(document.createElement("div"), { className: "match-board" });
  ctx.lines = createLineLayer();
  ctx.root.append(ctx.lines, column(ctx, items, "item", selectItem), column(ctx, targets, "target", tryTarget));
  // Lines follow the cards when the layout changes (rotation, images loading, a block becoming visible).
  new ResizeObserver(() => redraw(ctx)).observe(ctx.root);
  ctx.status = paragraph("task-status", "");
  ctx.status.setAttribute("role", "status");
  if (progress.isCompleted(key)) {
    lockAll(ctx);
    return [ctx.root, doneState(CHALLENGE_DONE_LABEL)];
  }
  return [paragraph("task-instruction", INSTRUCTION), ctx.root, ctx.status];
}
