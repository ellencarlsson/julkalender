/**
 * Matching task: tap an item, then the target it belongs with. A chosen target moves in under its item and
 * can be changed freely; only when every item has a partner are all pairs checked at once, so single pairs
 * never reveal whether they are right.
 */
import { checkLinks, matchingBoard, shuffled } from "./lib/matching.js";
import { paragraph } from "./task-ui.js";

const WRONG_MS = 600;
const INSTRUCTION = "Para ihop rätt saker. Tryck först på en bild och sedan på det den hör till.";
const TEXT_INSTRUCTION = "Para ihop rätt saker. Tryck först på ett namn och sedan på det det hör till.";
const NOT_YET = "Inte rätt än – byt några par och försök igen.";

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
  // A backdrop picture (like an enchanted book) is drawn above the text; as a CSS background it keeps
  // the board a text board, so long names still wrap.
  if (side.backdrop) {
    button.classList.add("match-card--backdrop");
    button.style.backgroundImage = `url("${side.backdrop}")`;
  }
  if (side.image) button.setAttribute("aria-label", side.alt || "Bild");
  return button;
}

/** Every paired target sits in the slot under its item; the rest stay in their column in their first order. */
function placeTargets(ctx) {
  const itemOf = new Map([...ctx.links].map(([item, target]) => [target, item]));
  for (const target of ctx.targets) {
    const item = itemOf.get(Number(target.dataset.pair));
    const home = item === undefined ? ctx.targetColumn : card(ctx, "item", item).nextElementSibling;
    if (target.parentElement !== home) home.append(target);
  }
}

function unlink(ctx, item) {
  ctx.links.delete(item);
  placeTargets(ctx);
}

function link(ctx, item, target) {
  const owner = [...ctx.links].find(([, chosen]) => chosen === target)?.[0];
  if (owner !== undefined) ctx.links.delete(owner);
  ctx.links.set(item, target);
  placeTargets(ctx);
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

/** Tapping a paired target with no item chosen sends it back to the column. */
function tryTarget(ctx, target) {
  const item = ctx.selected;
  const owner = [...ctx.links].find(([, chosen]) => chosen === Number(target.dataset.pair))?.[0];
  if (!item && owner !== undefined) return unlink(ctx, owner);
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

/** Solved: every picture is joined to its own name. */
function lockAll(ctx) {
  ctx.task.pairs.forEach((_, pair) => ctx.links.set(pair, pair));
  placeTargets(ctx);
  ctx.root.querySelectorAll(".match-card").forEach((button) => {
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
    ctx.status.remove();
    // Lets a paged door move on to the next block.
    ctx.card.dispatchEvent(new CustomEvent("task-solved", { bubbles: true }));
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen genom att ladda om sidan.";
  }
}

const element = (tag, className) => Object.assign(document.createElement(tag), { className });

/** Each item gets a cell with an empty slot under it for the target it is paired with. */
function itemColumn(ctx, items) {
  const list = element("div", "match-column match-column-item");
  for (const side of shuffled(items, `${ctx.key}-item`)) {
    const button = sideButton(side, "item");
    button.addEventListener("click", () => selectItem(ctx, button));
    const cell = element("div", "match-cell");
    cell.append(button, element("div", "match-slot"));
    list.append(cell);
  }
  return list;
}

function targetColumn(ctx, targets) {
  ctx.targetColumn = element("div", "match-column match-column-target");
  ctx.targets = shuffled(targets, `${ctx.key}-target`).map((side) => sideButton(side, "target"));
  ctx.targets.forEach((button) => button.addEventListener("click", () => tryTarget(ctx, button)));
  ctx.targetColumn.append(...ctx.targets);
  return ctx.targetColumn;
}

/**
 * Builds a matching task.
 *
 * Args:
 *   options: { task, key, progress, card } where card is the task card to mark as done.
 * Returns:
 *   The elements to append to the card.
 */
export function createMatching({ task, key, progress, card: taskCard }) {
  const { items, targets } = matchingBoard(task.pairs);
  const ctx = { task, key, progress, card: taskCard, links: new Map(), selected: null };
  ctx.root = element("div", "match-board");
  ctx.root.append(itemColumn(ctx, items), targetColumn(ctx, targets));
  ctx.status = paragraph("task-status", "");
  ctx.status.setAttribute("role", "status");
  if (progress.isCompleted(key)) {
    lockAll(ctx);
    return [ctx.root];
  }
  const instruction = task.pairs.some((pair) => pair.item.image) ? INSTRUCTION : TEXT_INSTRUCTION;
  return [paragraph("task-instruction", instruction), ctx.root, ctx.status];
}
