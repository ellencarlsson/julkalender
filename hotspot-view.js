/**
 * Hotspot task: a picture and a question like "Tryck på astronomitornet". A tap inside the right area
 * solves it and outlines the area; a tap anywhere else just says to try again.
 */
import { isInArea, tapPercent } from "./lib/hotspot.js";
import { paragraph } from "./task-ui.js";

const MISS_TEXT = "Inte där, försök igen.";
const element = (tag, className) => Object.assign(document.createElement(tag), { className });

/** The right area drawn on the picture once it is found. */
function areaOutline({ x, y, width, height }) {
  const outline = element("span", "hotspot-area");
  Object.assign(outline.style, { left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` });
  outline.setAttribute("aria-hidden", "true");
  return outline;
}

function showFound(ctx) {
  ctx.done = true;
  ctx.frame.classList.add("hotspot-frame--done");
  ctx.frame.append(areaOutline(ctx.task.area));
  ctx.status.textContent = "Där är det!";
}

async function onTap(ctx, event) {
  if (ctx.done) return;
  const point = tapPercent(event.clientX, event.clientY, ctx.picture.getBoundingClientRect());
  if (!isInArea(point, ctx.task.area)) return (ctx.status.textContent = MISS_TEXT);
  showFound(ctx);
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/**
 * Builds a hotspot task.
 *
 * Args:
 *   options: { task, key, progress, card } with task.picture, task.alt and task.area as
 *   { x, y, width, height } in percent of the picture.
 * Returns:
 *   The elements to append to the card.
 */
export function createHotspot({ task, key, progress, card }) {
  const ctx = { task, key, progress, card, done: false };
  ctx.frame = element("div", "hotspot-frame");
  ctx.picture = Object.assign(element("img", "hotspot-picture"), { src: task.picture, alt: task.alt ?? "", draggable: false });
  ctx.picture.addEventListener("click", (event) => onTap(ctx, event));
  ctx.frame.append(ctx.picture);
  ctx.status = paragraph("task-status hotspot-status", "");
  ctx.status.setAttribute("role", "status");
  if (progress.isCompleted(key)) showFound(ctx);
  return [ctx.frame, ctx.status];
}
