/** Renders door states in the overview and a door's tasks in the door view. */
import { testButton } from "./test-tools.js";
import { blockPager, isPagedDoor } from "./block-pager.js";
import { createCrafting } from "./crafting-view.js";
import { createCrossword } from "./crossword-view.js";
import { createMatching } from "./matching-view.js";
import { createOrdering } from "./ordering-view.js";
import { createPick } from "./pick-view.js";
import { createQuiz } from "./quiz-view.js";
import { createQuizHint } from "./quiz-hint.js";
import { recipeCard } from "./recipe-view.js";
import { ticketPicture } from "./ticket-view.js";
import { paragraph, photoSentControls } from "./task-ui.js";
import { DOOR_STATE, doorLabel } from "./lib/door-state.js";
import { CHALLENGE_DONE_LABEL, taskKey } from "./lib/progress.js";
import { TEST_LOCKED_DOOR, TEST_LOCKED_DOOR_LABEL } from "./lib/test-door.js";
import { unlockLabel } from "./lib/unlock-time.js";
import { doorXp, taskXp } from "./lib/level.js";
import { codeRewardLines, isItem } from "./lib/rewards.js";
import { createSudoku } from "./sudoku-view.js";
import { createTypingRace } from "./typing-view.js";
import { createCatchGame } from "./catch-view.js";
import { createPuzzle } from "./puzzle-view.js";
import { createHotspot } from "./hotspot-view.js";
import { createGrouping } from "./grouping-view.js";
import { createWordSearch } from "./wordsearch-view.js";
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
  if (["matching", "catch", "puzzle", "grouping", "wordsearch"].includes(task.type)) return task.prompt ?? null;
  if (task.type === "pick") return task.question ?? null;
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

/** A plain picture question (not an exam sheet, tile sum or witness list) gets its answer beside the picture. */
const isPictureQuiz = (task) => task.type === "quiz" && task.image && !task.exam && !task.tiles && !task.worksheet && !task.statements;

/** Task types that write their prompt into their own controls, so it is never shown above the card. */
const DRAWS_OWN_PROMPT = new Set(["hotspot"]);

/** Witness statements: who said it, then what they said. */
function statementList(statements) {
  const list = Object.assign(document.createElement("dl"), { className: "task-statements" });
  for (const { who, text } of statements) {
    list.append(Object.assign(document.createElement("dt"), { textContent: who }), Object.assign(document.createElement("dd"), { textContent: `”${text}”` }));
  }
  return list;
}

/** Task types that place their own chokladboll hint; every other type gets the text hint added here. */
const OWN_HINT = new Set(["quiz", "pick", "sudoku", "crossword"]);

/** Each task type's own controls; every builder returns the elements to append to the card. */
const TASK_BUILDERS = {
  challenge: ({ card, key, progress }) => photoSentControls(card, progress.isCompleted(key), (done) => (done ? progress.complete(key) : progress.uncomplete(key))),
  crossword: (options) => [createCrossword(options)],
  quiz: createQuiz,
  matching: createMatching,
  sudoku: createSudoku,
  crafting: createCrafting,
  ordering: createOrdering,
  pick: createPick,
  typing: createTypingRace,
  catch: createCatchGame,
  puzzle: createPuzzle,
  hotspot: createHotspot,
  grouping: createGrouping,
  wordsearch: createWordSearch,
};

function taskCard(task, door, progress, xp) {
  const card = document.createElement("article");
  card.className = task.worksheet ? "task task--worksheet" : "task";
  if (task.worksheet) card.append(worksheetHeader(task.worksheet, task.worksheetName));
  if (task.letterAddress) card.append(letterAddress(task.letterAddress));
  if (task.story) card.append(paragraph("task-story", task.story));
  const promptText = taskPrompt(task);
  if (promptText) card.append(Object.assign(document.createElement("p"), { className: "task-prompt", textContent: promptText }));
  if (task.image) card.append(taskImage(task));
  if (task.statements) card.append(statementList(task.statements));
  if (task.formula) card.append(paragraph("task-formula", task.formula));
  if (task.recipe) card.append(recipeCard(task.recipe));
  if (task.ticket) card.append(ticketPicture(task, card, progress.isCompleted(taskKey(door, task.id))));
  const key = taskKey(door, task.id);
  card.append(...(TASK_BUILDERS[task.type]?.({ task, key, progress, card, xp, door }) ?? []));
  if (!OWN_HINT.has(task.type) && !progress.isCompleted(key)) card.append(...[createQuizHint({ task, key, progress })].filter(Boolean));
  if (task.envelope) card.append(...envelope(task.envelope, task.envelopeSent));
  if (task.letterSent) card.append(letterSent(task.letterSent));
  // Shown by CSS once the card is done, so every task type ends with the same signed "Klart!".
  card.append(paragraph("task-done-state task-done-signed task-done-mark", CHALLENGE_DONE_LABEL));
  if (progress.isCompleted(key)) card.classList.add("task--done");
  if (isPictureQuiz(task)) card.classList.add("task--picture-quiz");
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
  const cards = tasks.map((task) => taskCard(DRAWS_OWN_PROMPT.has(task.type) ? task : { ...task, prompt: null }, door, progress, taskXp(task, tasks)));
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

const COME_BACK = "Kom tillbaka då för att öppna den!";

function showLocked(number) {
  const when = number === TEST_LOCKED_DOOR ? TEST_LOCKED_DOOR_LABEL : unlockLabel(number);
  showMessage("Denna lucka är låst", when, COME_BACK);
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

/** TEST_RESET_DOOR / TEST_COMPLETE_DOOR: buttons that clear or finish the player's own progress in this door. */
function doorTestButtons(number, { onReset, onComplete }) {
  return [
    testButton("Rensa lucka", `Rensa din progress i lucka ${number}? Bara för testning.`, onReset),
    testButton("Klara lucka", `Klara alla uppgifter i lucka ${number}? Bara för testning.`, onComplete),
  ];
}

/**
 * Shows an open door's title and tasks, or a message for any other state.
 *
 * Args:
 *   number: the door number, used to build progress keys.
 *   result: { state, door } from the door reader.
 *   progress: { isCompleted(key), complete(key) } for the signed-in user.
 *   testTools: { onReset, onComplete } for the TEST_RESET_DOOR and TEST_COMPLETE_DOOR buttons.
 */
function rewardItem({ name, image, emoji }) {
  const item = Object.assign(document.createElement("span"), { className: "door-done-item" });
  const picture = image
    ? Object.assign(document.createElement("img"), { src: image, alt: "" })
    : Object.assign(document.createElement("span"), { className: "door-done-emoji", textContent: emoji });
  item.append(picture, ` ${name}`);
  return item;
}

/** The door's XP so far and its rewards; CSS shows the XP once it is above 0 and the rewards once the door is done. */
function showDoorReward(door) {
  const xp = Object.assign(document.createElement("span"), { className: "door-done-xp" });
  const item = door?.reward?.item;
  const codeLines = codeRewardLines(door?.reward).map((text) => Object.assign(document.createElement("span"), { className: "door-done-item", textContent: text }));
  element("door-done").replaceChildren(xp, ...codeLines, ...(isItem(item) ? [rewardItem(item)] : []));
  showDoorXp(0);
}

/** XP earned so far in the open door, shown beside the title. */
export function showDoorXp(xp) {
  const box = element("door-done");
  const rounded = Math.round(xp);
  box.dataset.xp = String(rounded);
  box.querySelector(".door-done-xp")?.replaceChildren(`+${rounded} XP`);
}

export function showDoorContent(number, { state, door }, progress, testTools) {
  element("door-tools").replaceChildren();
  showDoorReward(state === DOOR_STATE.OPEN ? door : null);
  if (state === DOOR_STATE.LOCKED) return showLocked(number);
  if (state !== DOOR_STATE.OPEN) return showMessage(STATE_MESSAGES[state]);
  element("task-area").replaceChildren(...taskElements(door.tasks ?? [], number, progress, door.paged));
  showDoorXp(doorXp(number, door, progress));
  // TEST_RESET_DOOR / TEST_COMPLETE_DOOR: kept below the parchment so they do not look like part of the door.
  if (testTools) element("door-tools").append(...doorTestButtons(number, testTools));
}
