/**
 * Crafting task: drag ingredients from the inventory into a 3×3 workbench (or tap an ingredient and
 * then a cell), then press Tillverka. The grid is checked against the recipe wherever it is placed.
 */
import { enableDrag, isStrayClick } from "./drag.js";
import { GRID, emptyGrid, matchesRecipe } from "./lib/crafting.js";
import { CHALLENGE_DONE_LABEL } from "./lib/progress.js";
import { doneState, paragraph } from "./task-ui.js";

const INSTRUCTION = "Dra sakerna till arbetsbänken (eller tryck på en sak och sedan på en ruta). Tryck på en ruta för att tömma den.";

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

function itemPicture({ image, name }) {
  return Object.assign(element("img", "craft-picture"), { src: image, alt: name, draggable: false });
}

function select(ctx, button) {
  ctx.selected?.removeAttribute("aria-pressed");
  ctx.selected = ctx.selected === button ? null : button;
  ctx.selected?.setAttribute("aria-pressed", "true");
}

function setCell(ctx, row, col, id) {
  ctx.grid[row][col] = id;
  const cell = ctx.cells[row][col];
  const item = ctx.items.get(id);
  cell.replaceChildren(...(item ? [itemPicture(item)] : []));
  cell.setAttribute("aria-label", item ? `${item.name}, rad ${row + 1} kolumn ${col + 1}` : `Tom ruta, rad ${row + 1} kolumn ${col + 1}`);
  ctx.status.textContent = "";
}

function onCellTap(ctx, row, col) {
  if (isStrayClick() || ctx.done) return;
  if (ctx.selected) return setCell(ctx, row, col, ctx.selected.dataset.item);
  setCell(ctx, row, col, null);
}

function workbench(ctx) {
  const grid = element("div", "craft-grid");
  ctx.cells = Array.from({ length: GRID }, (_, row) =>
    Array.from({ length: GRID }, (_, col) => {
      const cell = element("div", "craft-cell");
      cell.setAttribute("role", "button");
      cell.tabIndex = 0;
      Object.assign(cell.dataset, { row: String(row), col: String(col) });
      cell.addEventListener("click", () => onCellTap(ctx, row, col));
      grid.append(cell);
      return cell;
    }),
  );
  return grid;
}

function inventory(ctx) {
  const list = element("div", "craft-inventory");
  for (const item of ctx.task.ingredients) {
    const button = element("button", "craft-item");
    button.type = "button";
    button.dataset.item = item.id;
    button.setAttribute("aria-label", item.name);
    button.append(itemPicture(item), element("span", "craft-item-name", item.name));
    enableDrag(button, {
      targetSelector: ".craft-cell",
      onDrop: (cell) => ctx.root.contains(cell) && setCell(ctx, Number(cell.dataset.row), Number(cell.dataset.col), item.id),
      onTap: () => select(ctx, button),
    });
    list.append(button);
  }
  return list;
}

function resultSlot(ctx) {
  ctx.result = element("div", "craft-result");
  ctx.result.append(itemPicture(ctx.task.result));
  return ctx.result;
}

async function craft(ctx) {
  if (!matchesRecipe(ctx.grid, ctx.task.pattern)) {
    ctx.status.textContent = "Det blev ingenting. Prova att lägga sakerna på ett annat sätt.";
    return;
  }
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    finish(ctx);
    const label = ctx.xp && ctx.xp < 100 ? `${ctx.task.result.name} tillverkad! +${ctx.xp} XP` : `${ctx.task.result.name} tillverkad!`;
    ctx.status.replaceWith(Object.assign(doneState(label), { className: "task-done-state task-done-signed match-success" }));
    ctx.card.dispatchEvent(new CustomEvent("task-solved", { bubbles: true }));
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

function finish(ctx) {
  ctx.done = true;
  ctx.card.classList.add("task--done");
  ctx.result.classList.add("craft-result--made");
  ctx.inventory?.remove();
  ctx.button?.remove();
  ctx.instruction?.remove();
}

/**
 * Builds a crafting task.
 *
 * Args:
 *   options: { task, key, progress, card, xp } where task.ingredients are { id, name, image },
 *     task.pattern the recipe rows of ingredient ids (null for empty) and task.result { name, image }.
 * Returns:
 *   The elements to append to the card.
 */
export function createCrafting({ task, key, progress, card, xp }) {
  const ctx = { task, key, progress, card, xp, grid: emptyGrid(), items: new Map(task.ingredients.map((item) => [item.id, item])), selected: null };
  ctx.root = element("div", "craft-board");
  const bench = element("div", "craft-bench");
  bench.append(workbench(ctx), element("span", "craft-arrow", "➜"), resultSlot(ctx));
  ctx.root.append(bench);
  ctx.status = paragraph("task-status", "");
  ctx.status.setAttribute("role", "status");
  const goal = paragraph("craft-goal", `Tillverka: ${task.result.name}`);
  if (progress.isCompleted(key)) {
    task.pattern.forEach((row, r) => row.forEach((id, c) => id && setCell(ctx, r, c, id)));
    finish(ctx);
    return [goal, ctx.root, doneState(CHALLENGE_DONE_LABEL)];
  }
  ctx.inventory = inventory(ctx);
  ctx.button = Object.assign(element("button", "craft-button", "Tillverka"), { type: "button" });
  ctx.button.addEventListener("click", () => craft(ctx));
  ctx.instruction = paragraph("task-instruction", INSTRUCTION);
  ctx.root.append(ctx.inventory);
  return [goal, ctx.instruction, ctx.root, ctx.button, ctx.status];
}
