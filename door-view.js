/** Renders door states in the overview and a door's tasks in the door view. */
import { blockPager, isPagedDoor } from "./block-pager.js";
import { createCrafting } from "./crafting-view.js";
import { createCrossword } from "./crossword-view.js";
import { createMatching } from "./matching-view.js";
import { createOrdering } from "./ordering-view.js";
import { createQuiz } from "./quiz-view.js";
import { paragraph, photoSentControls } from "./task-ui.js";
import { DOOR_STATE, doorLabel } from "./lib/door-state.js";
import { taskKey } from "./lib/progress.js";
import { TEST_LOCKED_DOOR, TEST_LOCKED_DOOR_LABEL } from "./lib/test-door.js";
import { unlockLabel } from "./lib/unlock-time.js";
import { doorXp, taskXp } from "./lib/level.js";
import { isItem } from "./lib/rewards.js";
import { createSudoku } from "./sudoku-view.js";
import { createTypingRace } from "./typing-view.js";
import { envelope, letterAddress, letterSent, worksheetHeader } from "./worksheet-view.js";

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

function exampleFigure({ image, name, formula }) {
  const figure = document.createElement("figure");
  const picture = taskImage({ image, alt: name });
  picture.className = "example-image";
  const caption = Object.assign(document.createElement("figcaption"), { textContent: name });
  if (formula) caption.append(Object.assign(document.createElement("span"), { className: "example-formula", textContent: formula }));
  figure.append(picture, caption);
  return figure;
}

function tableRow(cells, tag) {
  const row = document.createElement("tr");
  row.append(...cells.map((text) => Object.assign(document.createElement(tag), { textContent: text })));
  return row;
}

function exampleTable({ title, headers, rows }) {
  const table = Object.assign(document.createElement("table"), { className: "examples-table" });
  table.createCaption().textContent = title;
  table.createTHead().append(tableRow(headers, "th"));
  table.createTBody().append(...rows.map((cells) => tableRow(cells, "td")));
  return table;
}

function exampleGallery(examples, table) {
  const gallery = Object.assign(document.createElement("div"), { className: "task-examples" });
  gallery.append(...examples.map(exampleFigure));
  if (table) gallery.append(exampleTable(table));
  return gallery;
}

function taskCard(task, door, progress, xp) {
  const card = document.createElement("article");
  card.className = task.worksheet ? "task task--worksheet" : "task";
  if (task.worksheet) card.append(worksheetHeader(task.worksheet, task.worksheetName));
  if (task.letterAddress) card.append(letterAddress(task.letterAddress));
  const promptText = taskPrompt(task);
  if (promptText) card.append(Object.assign(document.createElement("p"), { className: "task-prompt", textContent: promptText }));
  if (task.image) card.append(taskImage(task));
  if (task.formula) card.append(paragraph("task-formula", task.formula));
  const key = taskKey(door, task.id);
  if (task.type === "challenge") card.append(...photoSentControls(card, progress.isCompleted(key), () => progress.complete(key)));
  if (task.type === "crossword") card.append(createCrossword({ task, key, progress, card }));
  if (task.type === "quiz") card.append(...createQuiz({ task, key, progress, card, xp }));
  if (task.type === "matching") card.append(...createMatching({ task, key, progress, card, xp }));
  if (task.type === "sudoku") card.append(...createSudoku({ task, key, progress, card, xp }));
  if (task.type === "crafting") card.append(...createCrafting({ task, key, progress, card, xp }));
  if (task.type === "ordering") card.append(...createOrdering({ task, key, progress, card, xp, door }));
  if (task.type === "typing") card.append(...createTypingRace({ task, key, progress, card, door }));
  if (task.envelope) card.append(...envelope(task.envelope, task.envelopeSent));
  if (task.letterSent) card.append(letterSent(task.letterSent));
  if (progress.isCompleted(key)) card.classList.add("task--done");
  return card;
}

/** Examples beside (desktop) or below (mobile) a pager that shows one task at a time. */
function examplesLayout(tasks, examples, door, progress) {
  const cards = tasks.map((task) => taskCard(task, door, progress, taskXp(task, tasks)));
  const layout = Object.assign(document.createElement("div"), { className: "examples-layout" });
  const table = tasks.find((task) => task.examplesTable)?.examplesTable;
  layout.append(blockPager(cards, tasks.map(() => "")), exampleGallery(examples, table));
  return layout;
}

function taskElements(tasks, door, progress, paged) {
  const examples = tasks.flatMap((task) => task.examples ?? []);
  if (examples.length > 0) return [examplesLayout(tasks, examples, door, progress)];
  if (!isPagedDoor(tasks, { paged })) return tasks.map((task) => taskCard(task, door, progress, taskXp(task, tasks)));
  // The block title above the cards already names each task, so its prompt is not repeated in the card.
  const cards = tasks.map((task) => taskCard({ ...task, prompt: null }, door, progress, taskXp(task, tasks)));
  return [blockPager(cards, tasks.map((task) => task.pageTitle ?? task.prompt ?? ""))];
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
function rewardItem({ name, image, emoji }) {
  const item = Object.assign(document.createElement("span"), { className: "door-done-item" });
  const picture = image
    ? Object.assign(document.createElement("img"), { src: image, alt: "" })
    : Object.assign(document.createElement("span"), { className: "door-done-emoji", textContent: emoji });
  item.append(picture, ` ${name}`);
  return item;
}

/** The door's XP so far and its reward item; CSS shows the XP once it is above 0 and the item once the door is done. */
function showDoorReward(door) {
  const xp = Object.assign(document.createElement("span"), { className: "door-done-xp" });
  const item = door?.reward?.item;
  element("door-done").replaceChildren(xp, ...(isItem(item) ? [rewardItem(item)] : []));
  showDoorXp(0);
}

/** XP earned so far in the open door, shown beside the title. */
export function showDoorXp(xp) {
  const box = element("door-done");
  const rounded = Math.round(xp);
  box.dataset.xp = String(rounded);
  box.querySelector(".door-done-xp")?.replaceChildren(`+${rounded} XP`);
}

export function showDoorContent(number, { state, door }, progress, onReset) {
  element("door-tools").replaceChildren();
  showDoorReward(state === DOOR_STATE.OPEN ? door : null);
  if (state === DOOR_STATE.LOCKED) return showLocked(number);
  if (state !== DOOR_STATE.OPEN) return showMessage(STATE_MESSAGES[state]);
  element("task-area").replaceChildren(...taskElements(door.tasks ?? [], number, progress, door.paged));
  showDoorXp(doorXp(number, door, progress));
  // TEST_RESET_DOOR: kept below the parchment so it does not look like part of the door.
  if (onReset) element("door-tools").append(resetButton(number, onReset));
}
