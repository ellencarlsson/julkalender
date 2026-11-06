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
  ctx.button.disabled = true;
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    ctx.form.replaceWith(doneState(QUIZ_DONE_LABEL));
  } catch {
    ctx.button.disabled = false;
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/** Tiles take the answer themselves; otherwise letter boxes or a plain text field. */
function answerField(task) {
  if (task.tiles) return createPeriodicTiles(task.tiles, { editable: true });
  return task.letters ? letterBoxes(codeWordLength(task.answers)) : answerInput();
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
  if (progress.isCompleted(key)) {
    return task.tiles ? [createPeriodicTiles(task.tiles), doneState(QUIZ_DONE_LABEL)] : [doneState(QUIZ_DONE_LABEL)];
  }
  const form = Object.assign(document.createElement("form"), { className: "quiz-form" });
  const field = answerField(task);
  const button = Object.assign(document.createElement("button"), { type: "submit", textContent: task.submitLabel ?? "Svara" });
  const status = paragraph("task-status", "");
  status.setAttribute("role", "status");
  form.append(field, button, status);
  const ctx = { task, key, progress, card, form, field, button, status };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(ctx);
  });
  const hint = createQuizHint({ task, key, progress });
  return hint ? [hint, form] : [form];
}
