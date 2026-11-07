/**
 * Ordering task: pictures wait below a row of numbered slots (with an optional anchor picture, like
 * the sun, on the left). Drag a picture to a slot, or tap the picture and then the slot. Once every
 * slot is filled the order is checked: right ones lock, wrong ones go back.
 */
import { enableDrag, isStrayClick } from "./drag.js";
import { shuffled } from "./lib/matching.js";
import { checkOrder, isOrdered } from "./lib/ordering.js";
import { CHALLENGE_DONE_LABEL, taskKey } from "./lib/progress.js";
import { doneState, paragraph } from "./task-ui.js";

const WRONG_MS = 700;
const INSTRUCTION = "Dra planeterna till rätt plats från solen, eller tryck på en planet och sedan på en plats.";

const element = (tag, className) => Object.assign(document.createElement(tag), { className });

function picture({ image, name }) {
  return Object.assign(element("img", "ord-picture"), { src: image, alt: name, draggable: false });
}

function itemButton(ctx, index) {
  const button = element("button", "ord-item");
  button.type = "button";
  button.dataset.item = String(index);
  button.setAttribute("aria-label", ctx.task.items[index].name);
  button.append(picture(ctx.task.items[index]));
  enableDrag(button, {
    targetSelector: ".ord-slot",
    onDrop: (slot) => ctx.root.contains(slot) && place(ctx, button, Number(slot.dataset.slot)),
    onTap: () => select(ctx, button),
  });
  return button;
}

/** A div, not a button, because the picture placed in it is a button itself. */
function slotButton(ctx, slot) {
  const button = element("div", "ord-slot");
  button.setAttribute("role", "button");
  button.tabIndex = 0;
  button.dataset.slot = String(slot);
  button.setAttribute("aria-label", `Plats ${slot + 1}`);
  button.append(Object.assign(element("span", "ord-slot-number"), { textContent: String(slot + 1) }));
  button.addEventListener("click", () => onSlotTap(ctx, slot));
  return button;
}

function select(ctx, button) {
  ctx.selected?.removeAttribute("aria-pressed");
  ctx.selected = ctx.selected === button ? null : button;
  ctx.selected?.setAttribute("aria-pressed", "true");
}

/** Moves an item into a slot; an item already there goes back to the pool. */
function place(ctx, button, slot) {
  if (ctx.locked.has(slot)) return;
  const previous = ctx.slots[slot];
  if (previous !== null) ctx.pool.append(ctx.buttons[previous]);
  const from = ctx.slots.indexOf(Number(button.dataset.item));
  if (from >= 0) ctx.slots[from] = null;
  ctx.slots[slot] = Number(button.dataset.item);
  ctx.slotButtons[slot].append(button);
  select(ctx, null);
  ctx.status.textContent = "";
  if (ctx.slots.every((item) => item !== null)) checkPlacements(ctx);
}

function onSlotTap(ctx, slot) {
  if (isStrayClick()) return;
  if (ctx.selected) return place(ctx, ctx.selected, slot);
  const item = ctx.slots[slot];
  if (item === null || ctx.locked.has(slot)) return;
  // Tapping a filled slot sends its picture back down.
  ctx.slots[slot] = null;
  ctx.pool.append(ctx.buttons[item]);
}

function checkPlacements(ctx) {
  const { right, wrong } = checkOrder(ctx.slots);
  right.forEach((slot) => {
    ctx.locked.add(slot);
    ctx.slotButtons[slot].classList.add("ord-slot--right");
    ctx.buttons[ctx.slots[slot]].disabled = true;
  });
  if (isOrdered(ctx.slots)) return complete(ctx);
  ctx.status.textContent = "Inte rätt ordning än. De som står fel åker tillbaka.";
  wrong.forEach((slot) => ctx.slotButtons[slot].classList.add("ord-slot--wrong"));
  setTimeout(() => {
    wrong.forEach((slot) => {
      ctx.slotButtons[slot].classList.remove("ord-slot--wrong");
      ctx.pool.append(ctx.buttons[ctx.slots[slot]]);
      ctx.slots[slot] = null;
    });
  }, WRONG_MS);
}

async function complete(ctx) {
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    ctx.pool.remove();
    ctx.instruction?.remove();
    const label = ctx.xp && ctx.xp < 100 ? `Alla rätt! 🎉 +${ctx.xp} XP` : CHALLENGE_DONE_LABEL;
    ctx.status.replaceWith(Object.assign(doneState(label), { className: "task-done-state match-success" }));
    ctx.card.dispatchEvent(new CustomEvent("task-solved", { bubbles: true }));
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen genom att ladda om sidan.";
  }
}

function board(ctx) {
  ctx.root = element("div", "ord-board");
  const row = element("div", "ord-row");
  if (ctx.task.anchor) row.append(Object.assign(element("img", "ord-anchor"), { src: ctx.task.anchor.image, alt: ctx.task.anchor.alt ?? "" }));
  ctx.slotButtons = ctx.task.items.map((_, slot) => slotButton(ctx, slot));
  const slots = element("div", "ord-slots");
  slots.append(...ctx.slotButtons);
  row.append(slots);
  ctx.buttons = ctx.task.items.map((_, index) => itemButton(ctx, index));
  ctx.pool = element("div", "ord-pool");
  ctx.pool.append(...shuffled(ctx.buttons, ctx.key));
  ctx.root.append(row, ctx.pool);
  return ctx.root;
}

function solvedBoard(ctx) {
  ctx.task.items.forEach((_, index) => {
    ctx.slots[index] = index;
    ctx.slotButtons[index].append(ctx.buttons[index]);
    ctx.slotButtons[index].classList.add("ord-slot--right");
    ctx.buttons[index].disabled = true;
  });
  ctx.pool.remove();
}

/** Until the task it waits for is done, the card only says what to do first. */
function lockedUntil(ctx, requiredKey, build) {
  const note = paragraph("task-instruction ord-locked", ctx.task.lockedText ?? "🔒 Klara förra steget först.");
  const unlock = () => {
    if (!ctx.progress.isCompleted(requiredKey)) return;
    document.removeEventListener("task-solved", unlock);
    note.replaceWith(...build());
  };
  document.addEventListener("task-solved", unlock);
  return [note];
}

/**
 * Builds an ordering task.
 *
 * Args:
 *   options: { task, key, progress, card, xp, door } where task.items are { name, image } in the
 *     right order, task.anchor an optional picture before slot 1 and task.requires the id of a task
 *     in the same door (door is its number) that must be done first.
 * Returns:
 *   The elements to append to the card.
 */
export function createOrdering({ task, key, progress, card, xp, door }) {
  const ctx = { task, key, progress, card, xp, slots: task.items.map(() => null), locked: new Set(), selected: null };
  const build = () => {
    const root = board(ctx);
    if (progress.isCompleted(key)) {
      solvedBoard(ctx);
      return [root, doneState(CHALLENGE_DONE_LABEL)];
    }
    ctx.status = paragraph("task-status", "");
    ctx.status.setAttribute("role", "status");
    ctx.instruction = paragraph("task-instruction", task.instruction ?? INSTRUCTION);
    return [ctx.instruction, root, ctx.status];
  };
  const requiredKey = task.requires && taskKey(door, task.requires);
  return requiredKey && !progress.isCompleted(requiredKey) ? lockedUntil(ctx, requiredKey, build) : build();
}
