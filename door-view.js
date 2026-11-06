/** Renders door states in the overview and a door's tasks in the door view. */
import { createCrossword } from "./crossword-view.js";
import { createMatching } from "./matching-view.js";
import { createQuiz } from "./quiz-view.js";
import { paragraph, photoSentControls } from "./task-ui.js";
import { DOOR_STATE, doorLabel } from "./lib/door-state.js";
import { taskKey } from "./lib/progress.js";
import { TEST_LOCKED_DOOR, TEST_LOCKED_DOOR_LABEL } from "./lib/test-door.js";
import { unlockLabel } from "./lib/unlock-time.js";

const element = (id) => document.getElementById(id);

const STATE_MESSAGES = {
  loading: "Laddar luckan…",
  [DOOR_STATE.EMPTY]: "Luckan är öppen, men innehållet är inte klart än.",
  [DOOR_STATE.ERROR]: "Kunde inte ladda luckan. Kontrollera anslutningen och försök igen.",
};

function taskPrompt(task) {
  if (task.type === "quiz") return task.question;
  if (task.type === "challenge") return task.description;
  if (task.type === "matching") return task.prompt ?? null;
  return null;
}

function taskImage(task) {
  const image = Object.assign(document.createElement("img"), { src: task.image, alt: task.alt ?? "", className: "task-image" });
  image.loading = "lazy";
  return image;
}

function taskCard(task, door, progress) {
  const card = document.createElement("article");
  card.className = "task";
  if (task.image) card.append(taskImage(task));
  const promptText = taskPrompt(task);
  if (promptText) card.append(Object.assign(document.createElement("p"), { textContent: promptText }));
  const key = taskKey(door, task.id);
  if (task.type === "challenge") card.append(...photoSentControls(card, progress.isCompleted(key), () => progress.complete(key)));
  if (task.type === "crossword") card.append(createCrossword({ task, key, progress, card }));
  if (task.type === "quiz") card.append(...createQuiz({ task, key, progress, card }));
  if (task.type === "matching") card.append(...createMatching({ task, key, progress, card }));
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
}

function showLocked(number) {
  const when = number === TEST_LOCKED_DOOR ? TEST_LOCKED_DOOR_LABEL : unlockLabel(number);
  showMessage("🔒 Denna lucka är låst", when);
  element("task-area").firstChild.className = "locked-title";
}

const doorLink = (number) => document.querySelector(`.door[data-door="${number}"]`);

export function markDoor(number, state) {
  const link = doorLink(number);
  link.dataset.state = state;
  link.setAttribute("aria-label", doorLabel(number, state, link.dataset.completed === "true"));
}

export function markDoorCompleted(number, completed) {
  const link = doorLink(number);
  if (!link) return;
  if (completed) link.dataset.completed = "true";
  else delete link.dataset.completed;
  link.setAttribute("aria-label", doorLabel(number, link.dataset.state, completed));
}

export function showDoorLoading() {
  showMessage(STATE_MESSAGES.loading);
}

/** TEST_RESET_DOOR: button that clears the player's own progress in this door after a confirm. */
function resetButton(number, onReset) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: "reset-door small" });
  button.textContent = "🧹 Rensa lucka";
  button.addEventListener("click", async () => {
    if (!confirm(`Rensa din progress i lucka ${number}? Bara för testning.`)) return;
    button.disabled = true;
    try {
      await onReset();
    } catch {
      button.disabled = false;
      button.textContent = "Kunde inte rensa. Försök igen.";
    }
  });
  return button;
}

/**
 * Shows an open door's title and tasks, or a message for any other state.
 *
 * Args:
 *   number: the door number, used to build progress keys.
 *   result: { state, door } from the door reader.
 *   progress: { isCompleted(key), complete(key) } for the signed-in user.
 *   onReset: TEST_RESET_DOOR callback for the "Rensa lucka" button.
 */
export function showDoorContent(number, { state, door }, progress, onReset) {
  element("door-tools").replaceChildren();
  if (state === DOOR_STATE.LOCKED) return showLocked(number);
  if (state !== DOOR_STATE.OPEN) return showMessage(STATE_MESSAGES[state]);
  element("task-area").replaceChildren(...(door.tasks ?? []).map((task) => taskCard(task, number, progress)));
  // TEST_RESET_DOOR: kept below the parchment so it does not look like part of the door.
  if (onReset) element("door-tools").append(resetButton(number, onReset));
}
