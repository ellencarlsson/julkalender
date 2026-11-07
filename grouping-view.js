/**
 * Grouping task: all items are shown shuffled and the category names are hidden. The player selects
 * the items they think belong together; a right guess locks the group and reveals its name.
 */
import { checkSelection, decodeFound, encodeFound, groupSize, shuffledItems } from "./lib/grouping.js";
import { paragraph } from "./task-ui.js";

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

/** An item's face: its picture (with alt text) or its text. */
function itemFace(item) {
  if (!item.image) return [element("span", "grp-text", item.text)];
  const picture = Object.assign(element("img", "grp-image"), { src: item.image, alt: item.alt ?? "", draggable: false });
  return item.text ? [picture, element("span", "grp-text", item.text)] : [picture];
}

function itemButton(ctx, item) {
  const button = Object.assign(element("button", "grp-item"), { type: "button" });
  button.append(...itemFace(item));
  button.addEventListener("click", () => toggle(ctx, item.id, button));
  return button;
}

function toggle(ctx, id, button) {
  if (ctx.selected.has(id)) ctx.selected.delete(id);
  else if (ctx.selected.size < ctx.size) ctx.selected.add(id);
  button.classList.toggle("grp-item--selected", ctx.selected.has(id));
  ctx.check.disabled = ctx.selected.size !== ctx.size;
  ctx.status.textContent = "";
}

/** A found group: its category name above its items, in the order the player found the groups. */
function solvedRow(ctx, group) {
  const row = element("div", "grp-solved-row");
  const items = element("p", "grp-solved-items", ctx.task.groups[group].items.map((item) => item.text ?? item.alt ?? "").filter(Boolean).join(" · "));
  row.append(element("p", "grp-solved-name", ctx.task.groups[group].name), items);
  return row;
}

function render(ctx) {
  ctx.solved.replaceChildren(...ctx.found.map((group) => solvedRow(ctx, group)));
  const open = ctx.items.filter((item) => !ctx.found.includes(item.group));
  ctx.grid.replaceChildren(...open.map((item) => itemButton(ctx, item)));
  ctx.selected.clear();
  ctx.check.disabled = true;
  ctx.controls.hidden = open.length === 0;
}

async function onFound(ctx, group) {
  ctx.found = [...ctx.found, group];
  render(ctx);
  const allFound = ctx.found.length === ctx.task.groups.length;
  ctx.status.textContent = allFound ? "Alla grupper hittade! 🎉" : "Rätt grupp! ✨";
  try {
    await ctx.progress.saveCrossword?.(ctx.key, encodeFound(ctx.found));
    if (allFound && !ctx.progress.isCompleted(ctx.key)) await ctx.progress.complete(ctx.key);
    if (allFound) ctx.card.classList.add("task--done");
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

function onCheck(ctx) {
  const { group, almost } = checkSelection(ctx.task.groups, [...ctx.selected]);
  if (group !== null) return onFound(ctx, group);
  ctx.status.textContent = almost ? "En ifrån!" : "Inte riktigt, försök igen.";
  ctx.grid.classList.remove("grp-grid--shake");
  void ctx.grid.offsetWidth;
  ctx.grid.classList.add("grp-grid--shake");
}

function controls(ctx) {
  ctx.controls = element("div", "grp-controls");
  ctx.check = Object.assign(element("button", "grp-check", "Kolla"), { type: "button", disabled: true });
  ctx.check.addEventListener("click", () => onCheck(ctx));
  ctx.controls.append(ctx.check);
  return ctx.controls;
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
  const ctx = { task, key, progress, card, found, size: groupSize(task.groups), items: shuffledItems(task.groups), selected: new Set() };
  ctx.solved = element("div", "grp-solved");
  ctx.grid = element("div", "grp-grid");
  ctx.grid.style.setProperty("--grp-cols", String(ctx.size));
  ctx.status = paragraph("task-status grp-status", found.length === all.length ? "Alla grupper hittade! 🎉" : "");
  ctx.status.setAttribute("role", "status");
  const parts = [ctx.solved, ctx.grid, controls(ctx), ctx.status];
  render(ctx);
  return parts;
}
