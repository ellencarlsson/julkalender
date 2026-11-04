/** Signed-in app shell: door grid and hash-based switching between views. */
import { xpRingPercent } from "./lib/level.js";
import { doorHash, parseRoute } from "./lib/router.js";
import { DOOR_COUNT } from "./lib/unlock-time.js";

const element = (id) => document.getElementById(id);

function renderDoorGrid() {
  const grid = element("door-grid");
  for (let door = 1; door <= DOOR_COUNT; door++) {
    const link = document.createElement("a");
    link.href = doorHash(door);
    link.className = "door";
    link.textContent = door;
    link.setAttribute("aria-label", `Lucka ${door}`);
    const item = document.createElement("li");
    item.append(link);
    grid.append(item);
  }
}

function showRoute(route) {
  for (const section of document.querySelectorAll("[data-view]")) {
    section.hidden = section.dataset.view !== route.view;
  }
  for (const link of document.querySelectorAll("[data-nav]")) {
    if (link.dataset.nav === route.view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  if (route.view === "door") element("door-title").textContent = `Lucka ${route.door}`;
  window.scrollTo(0, 0);
}

/** Shows the level number and fills the ring by XP earned toward the next level. */
export function showLevel(level, xpInLevel) {
  const percent = xpRingPercent(xpInLevel);
  const ring = element("level-ring");
  ring.style.setProperty("--progress", percent);
  ring.setAttribute("aria-valuenow", percent);
  ring.setAttribute("aria-label", `Nivå ${level}, ${percent} av 100 XP mot nästa nivå`);
  element("level").textContent = level;
}

/** Builds the shell once and returns a function that shows the view for the current hash. */
export function createShell() {
  renderDoorGrid();
  const render = () => showRoute(parseRoute(location.hash));
  window.addEventListener("hashchange", render);
  return render;
}
