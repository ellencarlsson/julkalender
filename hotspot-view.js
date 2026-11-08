/**
 * Hotspot task: a picture with its question written on it, like "Klicka på astronomitornet" or "Hitta de 13 hattarna". A tap
 * inside a right area outlines it; once every area is found the task is solved. A tap anywhere else
 * just says to try again.
 */
import { decodeFound, encodeFound } from "./lib/grouping.js";
import { areaAt, hotspotAreas, tapPercent } from "./lib/hotspot.js";
import { paragraph } from "./task-ui.js";

const MISS_TEXT = "Inte där, försök igen.";
const element = (tag, className) => Object.assign(document.createElement(tag), { className });

/** A found area drawn on the picture. */
function areaOutline({ x, y, width, height }) {
  const outline = element("span", "hotspot-area");
  Object.assign(outline.style, { left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` });
  outline.setAttribute("aria-hidden", "true");
  return outline;
}

const allFound = (ctx) => ctx.found.length === ctx.areas.length;
const countText = (ctx) => `Hittade ${ctx.found.length} av ${ctx.areas.length}`;

function showFound(ctx, index) {
  ctx.found.push(index);
  ctx.frame.append(areaOutline(ctx.areas[index]));
}

function showProgress(ctx) {
  ctx.frame.classList.toggle("hotspot-frame--done", allFound(ctx));
  if (allFound(ctx)) ctx.status.textContent = ctx.areas.length > 1 ? `Du hittade alla ${ctx.areas.length}!` : "Där är det!";
  else ctx.status.textContent = ctx.areas.length > 1 ? countText(ctx) : "";
}

/** Several areas are saved as they are found, so the hunt can go on later; the last one completes the task. */
async function save(ctx) {
  if (ctx.areas.length > 1) await ctx.progress.saveCrossword(ctx.key, encodeFound(ctx.found));
  if (!allFound(ctx)) return;
  await ctx.progress.complete(ctx.key);
  ctx.card.classList.add("task--done");
}

async function onTap(ctx, event) {
  if (allFound(ctx)) return;
  const index = areaAt(tapPercent(event.clientX, event.clientY, ctx.picture.getBoundingClientRect()), ctx.areas);
  if (index === -1) return (ctx.status.textContent = MISS_TEXT);
  if (ctx.found.includes(index)) return (ctx.status.textContent = `Den har du redan hittat. ${countText(ctx)}`);
  showFound(ctx, index);
  showProgress(ctx);
  try {
    await save(ctx);
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

function savedFound(task, key, progress, count) {
  if (progress.isCompleted(key)) return [...Array(count).keys()];
  return decodeFound(progress.crosswordEntries?.(key), count);
}

/**
 * Builds a hotspot task.
 *
 * Args:
 *   options: { task, key, progress, card } with task.picture, task.alt and either task.area or a list
 *   task.areas, each { x, y, width, height } in percent of the picture.
 * Returns:
 *   The elements to append to the card.
 */
export function createHotspot({ task, key, progress, card }) {
  const ctx = { task, key, progress, card, areas: hotspotAreas(task), found: [] };
  ctx.frame = element("div", "hotspot-frame");
  ctx.picture = Object.assign(element("img", "hotspot-picture"), { src: task.picture, alt: `${task.prompt} ${task.alt ?? ""}`.trim(), draggable: false });
  ctx.picture.addEventListener("click", (event) => onTap(ctx, event));
  const caption = Object.assign(element("span", "hotspot-caption"), { textContent: task.prompt });
  caption.setAttribute("aria-hidden", "true");
  ctx.frame.append(ctx.picture, caption);
  ctx.status = paragraph("task-status hotspot-status", "");
  ctx.status.setAttribute("role", "status");
  savedFound(task, key, progress, ctx.areas.length).forEach((index) => showFound(ctx, index));
  showProgress(ctx);
  return [ctx.frame, ctx.status];
}
