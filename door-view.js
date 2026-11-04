/** Renders door states in the overview and a door's tasks in the door view. */
import { createCrossword } from "./crossword-view.js";
import { DOOR_STATE, doorLabel } from "./lib/door-state.js";
import { HONOR_PLEDGE, taskKey } from "./lib/progress.js";
import { TEST_LOCKED_DOOR, TEST_LOCKED_DOOR_LABEL } from "./lib/test-door.js";
import { unlockLabel } from "./lib/unlock-time.js";

const element = (id) => document.getElementById(id);

const STATE_MESSAGES = {
  loading: "Laddar luckan…",
  [DOOR_STATE.EMPTY]: "Luckan är öppen, men innehållet är inte klart än.",
  [DOOR_STATE.ERROR]: "Kunde inte ladda luckan. Kontrollera anslutningen och försök igen.",
};

const TASK_TYPE_LABELS = { quiz: "Fråga", challenge: "Utmaning", crossword: "Korsord" };

function taskPrompt(task) {
  if (task.type === "quiz") return task.question;
  if (task.type === "challenge") return task.description;
  return null;
}

async function completeTask(card, box, status, save) {
  box.disabled = true;
  try {
    await save();
    card.classList.add("task--done");
    status.textContent = "Klart! Bra jobbat.";
  } catch {
    box.checked = false;
    box.disabled = false;
    status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/** Honor checkbox for real-life challenges; once ticked it stays ticked. */
function honorCheckbox(card, key, progress) {
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = box.disabled = progress.isCompleted(key);
  const label = document.createElement("label");
  label.className = "honor";
  label.append(box, ` ${HONOR_PLEDGE}`);
  const status = document.createElement("p");
  status.className = "task-status";
  status.setAttribute("role", "status");
  if (box.checked) status.textContent = "Klart!";
  box.addEventListener("change", () => completeTask(card, box, status, () => progress.complete(key)));
  return [label, status];
}

function taskCard(task, door, progress) {
  const card = document.createElement("article");
  card.className = "task";
  const heading = document.createElement("h3");
  heading.textContent = TASK_TYPE_LABELS[task.type] ?? "Uppgift";
  card.append(heading);
  const promptText = taskPrompt(task);
  if (promptText) card.append(Object.assign(document.createElement("p"), { textContent: promptText }));
  const key = taskKey(door, task.id);
  if (task.type === "challenge") card.append(...honorCheckbox(card, key, progress));
  if (task.type === "crossword") card.append(createCrossword({ task, key, progress, card }));
  if (progress.isCompleted(key)) card.classList.add("task--done");
  return card;
}

function showMessage(...lines) {
  const paragraphs = lines.map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  });
  element("task-area").replaceChildren(...paragraphs);
  element("door-subtitle").hidden = true;
}

function showLocked(number) {
  const when = number === TEST_LOCKED_DOOR ? TEST_LOCKED_DOOR_LABEL : unlockLabel(number);
  showMessage("🔒 Denna lucka är låst", when);
  element("task-area").firstChild.className = "locked-title";
}

export function markDoor(number, state) {
  const link = document.querySelector(`.door[data-door="${number}"]`);
  link.dataset.state = state;
  link.setAttribute("aria-label", doorLabel(number, state));
}

export function showDoorLoading() {
  showMessage(STATE_MESSAGES.loading);
}

/**
 * Shows an open door's title and tasks, or a message for any other state.
 *
 * Args:
 *   number: the door number, used to build progress keys.
 *   result: { state, door } from the door reader.
 *   progress: { isCompleted(key), complete(key) } for the signed-in user.
 */
export function showDoorContent(number, { state, door }, progress) {
  if (state === DOOR_STATE.LOCKED) return showLocked(number);
  if (state !== DOOR_STATE.OPEN) return showMessage(STATE_MESSAGES[state]);
  const subtitle = element("door-subtitle");
  subtitle.textContent = door.title ?? "";
  subtitle.hidden = !door.title;
  element("task-area").replaceChildren(...(door.tasks ?? []).map((task) => taskCard(task, number, progress)));
}
