/** Quiz task: a typed answer checked against the accepted answers. */
import { QUIZ_DONE_LABEL, QUIZ_WRONG_LABEL } from "./lib/progress.js";
import { codeWordLength, isCorrectAnswer } from "./lib/quiz.js";
import { createPeriodicTiles, tilesAnswer } from "./periodic-tiles.js";
import { createQuizHint } from "./quiz-hint.js";
import { doneState, paragraph } from "./task-ui.js";

function answerInput() {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "quiz-input";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Ditt svar");
  input.setAttribute("enterkeyhint", "done");
  return input;
}

function letterBox(index, count) {
  const box = answerInput();
  box.className = "quiz-letter";
  box.maxLength = 1;
  box.setAttribute("aria-label", `Bokstav ${index + 1} av ${count}`);
  box.setAttribute("autocapitalize", "characters");
  return box;
}

function onLetterInput(boxes, index) {
  const box = boxes[index];
  box.value = box.value.slice(-1).toLocaleUpperCase("sv-SE");
  if (box.value && index < boxes.length - 1) boxes[index + 1].focus();
}

function onLetterKey(event, boxes, index) {
  if (event.key !== "Backspace" || boxes[index].value || index === 0) return;
  boxes[index - 1].value = "";
  boxes[index - 1].focus();
}

/** One box per letter; typing moves on to the next box and Backspace steps back. */
function letterBoxes(count) {
  const row = Object.assign(document.createElement("div"), { className: "quiz-letters" });
  const boxes = Array.from({ length: count }, (_, index) => letterBox(index, count));
  boxes.forEach((box, index) => {
    box.addEventListener("input", () => onLetterInput(boxes, index));
    box.addEventListener("keydown", (event) => onLetterKey(event, boxes, index));
  });
  row.append(...boxes);
  return row;
}

function typedAnswer(field) {
  if (field.matches("input")) return field.value;
  if (field.classList.contains("pt-row")) return tilesAnswer(field);
  return [...field.querySelectorAll("input")].map((box) => box.value).join("");
}

function retry(field) {
  if (field.matches("input")) return field.select();
  field.querySelector("input")?.focus();
}

async function submitAnswer(ctx) {
  const answer = typedAnswer(ctx.field);
  if (!answer.trim()) return;
  if (!isCorrectAnswer(answer, ctx.task.answers)) {
    ctx.status.textContent = QUIZ_WRONG_LABEL;
    retry(ctx.field);
    return;
  }
  if (ctx.button) ctx.button.disabled = true;
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    ctx.card.querySelector(".quiz-hint")?.remove();
    ctx.form.replaceWith(...solvedState(ctx.task));
  } catch {
    if (ctx.button) ctx.button.disabled = false;
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/** A solved tile quiz shows the real symbols and its picture; any quiz shows "Rätt svar!". */
function solvedState(task) {
  if (!task.tiles) return [doneState(QUIZ_DONE_LABEL)];
  const result = task.solvedImage ? { src: task.solvedImage, alt: task.solvedAlt } : null;
  return [createPeriodicTiles(task.tiles, { mode: "solved", result }), doneState(QUIZ_DONE_LABEL)];
}

/** Tiles take the answer themselves; otherwise letter boxes or a plain text field. */
function answerField(task) {
  if (task.tiles) return createPeriodicTiles(task.tiles, { mode: "input" });
  return task.letters ? letterBoxes(codeWordLength(task.answers)) : answerInput();
}

const AUTO_CHECK_DELAY_MS = 700;

/** Checks the answer a moment after the last keystroke, once every tile has something in it. */
function checkWhenFilled(ctx) {
  let timer;
  ctx.form.addEventListener("input", () => {
    clearTimeout(timer);
    ctx.status.textContent = "";
    const inputs = [...ctx.field.querySelectorAll("input")];
    if (inputs.some((input) => !input.value)) return;
    timer = setTimeout(() => submitAnswer(ctx), AUTO_CHECK_DELAY_MS);
  });
}

/**
 * Builds the answer form for a quiz task.
 *
 * Args:
 *   options: { task, key, progress, card } where card is the task card to mark as done.
 * Returns:
 *   The elements to append to the card.
 */
export function createQuiz({ task, key, progress, card }) {
  if (progress.isCompleted(key)) return solvedState(task);
  const form = Object.assign(document.createElement("form"), { className: "quiz-form" });
  const field = answerField(task);
  // Tile sums check themselves once every tile is filled, so they need no submit button.
  const button = task.tiles ? null : Object.assign(document.createElement("button"), { type: "submit", textContent: task.submitLabel ?? "Svara" });
  const status = paragraph("task-status", "");
  status.setAttribute("role", "status");
  form.append(...[field, button, status].filter(Boolean));
  const ctx = { task, key, progress, card, form, field, button, status };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(ctx);
  });
  if (task.tiles) checkWhenFilled(ctx);
  const hint = createQuizHint({ task, key, progress });
  return hint ? [hint, form] : [form];
}
