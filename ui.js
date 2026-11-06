/** Signed-in app shell: door grid and hash-based switching between views. */
import { xpRingPercent } from "./lib/level.js";
import { doorHash, parseRoute } from "./lib/router.js";
import { TEST_LOCKED_DOOR } from "./lib/test-door.js";
import { DOOR_COUNT } from "./lib/unlock-time.js";
import { chokladbollar } from "./task-ui.js";

const element = (id) => document.getElementById(id);
const GRID_DOORS = [...Array.from({ length: DOOR_COUNT }, (_, index) => index + 1), TEST_LOCKED_DOOR];

function renderDoorGrid() {
  const grid = element("door-grid");
  for (const door of GRID_DOORS) {
    const link = document.createElement("a");
    link.href = doorHash(door);
    link.className = "door";
    link.dataset.door = door;
    link.textContent = door;
    link.setAttribute("aria-label", `Lucka ${door}`);
    const item = document.createElement("li");
    item.append(link);
    grid.append(item);
  }
}

const [FIRST_DOOR, LAST_DOOR] = [1, 24];

/** Points an arrow at a neighbouring door, or hides it past the first or last door. */
function setDoorArrow(id, door) {
  const arrow = element(id);
  arrow.hidden = door < FIRST_DOOR || door > LAST_DOOR;
  arrow.href = doorHash(door);
}

function showDoorTitle(door) {
  element("door-title").textContent = `Lucka ${door}`;
  setDoorArrow("prev-door", door - 1);
  setDoorArrow("next-door", door + 1);
}

function showRoute(route) {
  for (const section of document.querySelectorAll("[data-view]")) {
    section.hidden = section.dataset.view !== route.view;
  }
  for (const link of document.querySelectorAll("[data-nav]")) {
    if (link.dataset.nav === route.view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  if (route.view === "door") showDoorTitle(route.door);
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

const LEVEL_UP_VISIBLE_MS = 4000;
let levelUpTimer = null;

export function showHintPoints(points) {
  element("hint-points").textContent = points;
  element("backpack-chokladbollar").textContent = chokladbollar(points);
  element("hint-circle").setAttribute("aria-label", `${chokladbollar(points)}. Visa sidouppdrag`);
}

export function hideLevelUp() {
  clearTimeout(levelUpTimer);
  element("level-up").hidden = true;
}

export function showLevelUp(level) {
  const toast = element("level-up");
  toast.textContent = `Nivå upp! Du är nu på nivå ${level} 🎉`;
  toast.hidden = false;
  clearTimeout(levelUpTimer);
  levelUpTimer = setTimeout(() => (toast.hidden = true), LEVEL_UP_VISIBLE_MS);
}

/**
 * Builds the shell once and returns a function that shows the view for the current hash.
 *
 * Args:
 *   onDoorOpen: called with the door number whenever the door view is shown.
 *   onSideQuestsOpen: called whenever the side quests panel is shown.
 */
export function createShell({ onDoorOpen, onSideQuestsOpen }) {
  renderDoorGrid();
  const render = () => {
    const route = parseRoute(location.hash);
    showRoute(route);
    if (route.view === "door") onDoorOpen(route.door);
    if (route.view === "sidequests") onSideQuestsOpen();
  };
  window.addEventListener("hashchange", render);
  return render;
}
