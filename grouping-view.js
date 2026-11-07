/**
 * Grouping task: all items start shuffled above one box per group, and the category names are hidden.
 * The player drags (or taps) items into the boxes and checks them all at once: right boxes lock and
 * reveal their category, wrong ones keep their items so they can be moved.
 */
import { enableDrag, isStrayClick } from "./drag.js";
import { checkSelection, decodeFound, encodeFound, groupSize, itemId, shuffledItems } from "./lib/grouping.js";
import { paragraph } from "./task-ui.js";

const POOL = "pool";
const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

/** An item's face: its picture (with alt text) or its text. */
function itemFace(item) {
  if (!item.image) return [element("span", "grp-text", item.text)];
  const picture = Object.assign(element("img", "grp-image"), { src: item.image, alt: item.alt ?? "", draggable: false });
  return item.text ? [picture, element("span", "grp-text", item.text)] : [picture];
}

function itemButton(ctx, item, locked) {
  const button = Object.assign(element("button", "grp-item"), { type: "button", disabled: locked });
  button.classList.toggle("grp-item--selected", item.id === ctx.selected);
  button.append(...itemFace(item));
  if (locked) return button;
  enableDrag(button, {
    targetSelector: ".grp-box, .grp-pool",
    onDrop: (target) => moveItem(ctx, item.id, target.dataset.box ?? POOL),
    onTap: () => select(ctx, item.id),
  });
  return button;
}

function select(ctx, id) {
  ctx.selected = ctx.selected === id ? null : id;
  render(ctx);
}

/** Moves an item into a box (if it has room) or back to the pool; any earlier verdicts are cleared. */
function moveItem(ctx, id, destination) {
  const box = ctx.boxes[destination];
  if (box && (box.found !== null || box.items.length >= ctx.size)) return;
  ctx.boxes.forEach((other) => {
    other.items = other.items.filter((item) => item !== id);
    other.verdict = "";
  });
  if (box) box.items.push(id);
  ctx.selected = null;
  ctx.status.textContent = "";
  render(ctx);
}

/** Tapping a box or the pool (not an item in it) puts the tapped item there. */
function onAreaClick(ctx, destination, event) {
  if (event.target.closest(".grp-item") || isStrayClick() || ctx.selected === null) return;
  moveItem(ctx, ctx.selected, destination);
}

const itemById = (ctx, id) => ctx.items.find((item) => item.id === id);

function boxElement(ctx, box, index) {
  const area = element("div", `grp-box${box.found !== null ? " grp-box--found" : ""}${box.verdict ? " grp-box--wrong" : ""}`);
  area.dataset.box = String(index);
  const title = box.found !== null ? ctx.task.groups[box.found].name : box.verdict || `Låda ${index + 1}`;
  const items = element("div", "grp-box-items");
  items.append(...box.items.map((id) => itemButton(ctx, itemById(ctx, id), box.found !== null)));
  area.append(element("p", "grp-box-title", title), items);
  area.addEventListener("click", (event) => onAreaClick(ctx, String(index), event));
  return area;
}

function render(ctx) {
  const placed = new Set(ctx.boxes.flatMap((box) => box.items));
  const loose = ctx.items.filter((item) => !placed.has(item.id));
  ctx.pool.replaceChildren(...loose.map((item) => itemButton(ctx, item, false)));
  ctx.pool.hidden = loose.length === 0 && ctx.boxes.every((box) => box.found !== null);
  ctx.boxArea.replaceChildren(...ctx.boxes.map((box, index) => boxElement(ctx, box, index)));
  const open = ctx.boxes.filter((box) => box.found === null);
  ctx.check.disabled = open.length === 0 || open.some((box) => box.items.length < ctx.size);
  ctx.controls.hidden = open.length === 0;
}

/** Every open box is checked: right ones lock with their category, wrong ones get a hint. */
function judgeBoxes(ctx) {
  const newlyFound = [];
  for (const box of ctx.boxes.filter((open) => open.found === null)) {
    const { group, almost } = checkSelection(ctx.task.groups, box.items);
    if (group === null) box.verdict = almost ? "En ifrån!" : "Inte rätt";
    else Object.assign(box, { found: group, items: ctx.task.groups[group].items.map((_, i) => itemId(group, i)), verdict: "" });
    if (group !== null) newlyFound.push(group);
  }
  return newlyFound;
}

async function onCheck(ctx) {
  const checked = ctx.boxes.filter((box) => box.found === null).length;
  const newlyFound = judgeBoxes(ctx);
  ctx.found = [...ctx.found, ...newlyFound];
  render(ctx);
  const allFound = ctx.found.length === ctx.task.groups.length;
  ctx.status.textContent = allFound ? "Alla grupper rätt! 🎉" : `${newlyFound.length} av ${checked} lådor rätt.`;
  if (newlyFound.length === 0) return;
  try {
    await ctx.progress.saveCrossword?.(ctx.key, encodeFound(ctx.found));
    if (allFound && !ctx.progress.isCompleted(ctx.key)) await ctx.progress.complete(ctx.key);
    if (allFound) ctx.card.classList.add("task--done");
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

function controls(ctx) {
  ctx.controls = element("div", "grp-controls");
  ctx.check = Object.assign(element("button", "grp-check", "Kolla"), { type: "button", disabled: true });
  ctx.check.addEventListener("click", () => onCheck(ctx));
  ctx.controls.append(ctx.check);
  return ctx.controls;
}

/** Saved groups fill the first boxes, already locked; the rest start empty. */
function startBoxes(ctx) {
  return ctx.task.groups.map((_, index) => {
    const group = ctx.found[index];
    if (group === undefined) return { found: null, items: [], verdict: "" };
    return { found: group, items: ctx.task.groups[group].items.map((_, i) => itemId(group, i)), verdict: "" };
  });
}

/**
 * Builds a grouping task.
 *
 * Args:
 *   options: { task, key, progress, card } with task.groups as [{ name, items: [{ text } | { image, alt, text? }] }].
 * Returns:
 *   The elements to append to the card.
 */
export function createGrouping({ task, key, progress, card }) {
  const all = task.groups.map((_, index) => index);
  const found = progress.isCompleted(key) ? all : decodeFound(progress.crosswordEntries?.(key), task.groups.length);
  const ctx = { task, key, progress, card, found, size: groupSize(task.groups), items: shuffledItems(task.groups), selected: null };
  ctx.boxes = startBoxes(ctx);
  ctx.pool = element("div", "grp-pool");
  ctx.pool.addEventListener("click", (event) => onAreaClick(ctx, POOL, event));
  ctx.boxArea = element("div", "grp-boxes");
  ctx.status = paragraph("task-status grp-status", found.length === all.length ? "Alla grupper rätt! 🎉" : "");
  ctx.status.setAttribute("role", "status");
  const parts = [ctx.pool, ctx.boxArea, controls(ctx), ctx.status];
  render(ctx);
  return parts;
}
