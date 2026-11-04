/** Renders door states in the overview and a door's tasks in the door view. */
import { DOOR_STATE, doorLabel } from "./lib/door-state.js";

const element = (id) => document.getElementById(id);

const STATE_MESSAGES = {
  loading: "Laddar luckan…",
  [DOOR_STATE.EMPTY]: "Luckan är öppen, men innehållet är inte klart än.",
  [DOOR_STATE.LOCKED]: "Den här luckan är inte öppen än.",
  [DOOR_STATE.ERROR]: "Kunde inte ladda luckan. Kontrollera anslutningen och försök igen.",
};

const TASK_TYPE_LABELS = { quiz: "Fråga", challenge: "Utmaning", crossword: "Korsord" };

function taskPrompt(task) {
  if (task.type === "quiz") return task.question;
  if (task.type === "challenge") return task.description;
  return "Korsordet visas här snart.";
}

function taskCard(task) {
  const card = document.createElement("article");
  card.className = "task";
  const heading = document.createElement("h3");
  heading.textContent = TASK_TYPE_LABELS[task.type] ?? "Uppgift";
  const prompt = document.createElement("p");
  prompt.textContent = taskPrompt(task);
  card.append(heading, prompt);
  return card;
}

function showMessage(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  element("task-area").replaceChildren(paragraph);
  element("door-subtitle").hidden = true;
}

export function markDoor(number, state) {
  const link = document.querySelector(`.door[data-door="${number}"]`);
  link.dataset.state = state;
  link.setAttribute("aria-label", doorLabel(number, state));
}

export function showDoorLoading() {
  showMessage(STATE_MESSAGES.loading);
}

/** Shows an open door's title and tasks, or a message for any other state. */
export function showDoorContent({ state, door }) {
  if (state !== DOOR_STATE.OPEN) return showMessage(STATE_MESSAGES[state]);
  const subtitle = element("door-subtitle");
  subtitle.textContent = door.title ?? "";
  subtitle.hidden = !door.title;
  element("task-area").replaceChildren(...(door.tasks ?? []).map(taskCard));
}
