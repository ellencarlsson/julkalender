/** Quiz task: a typed answer checked against the accepted answers. */
import { XP_PER_LEVEL } from "./lib/level.js";
import { QUIZ_DONE_LABEL, QUIZ_WRONG_LABEL } from "./lib/progress.js";
import { codeWordLength, isCorrectAnswer, isTimeInRange } from "./lib/quiz.js";
import { createPeriodicTiles, tilesAnswer } from "./periodic-tiles.js";
import { createQuizHint } from "./quiz-hint.js";
import { paragraph } from "./task-ui.js";

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

function letterBox(index, count, digits) {
  const box = answerInput();
  box.className = "quiz-letter";
  box.maxLength = 1;
  box.setAttribute("aria-label", `${digits ? "Siffra" : "Bokstav"} ${index + 1} av ${count}`);
  box.setAttribute("autocapitalize", "characters");
  // A code of digits brings up the number keyboard on phones.
  if (digits) box.inputMode = "numeric";
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
function letterBoxes(count, digits = false) {
  const row = Object.assign(document.createElement("div"), { className: "quiz-letters" });
  const boxes = Array.from({ length: count }, (_, index) => letterBox(index, count, digits));
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
  const right = ctx.task.timeRange ? isTimeInRange(answer, ctx.task.timeRange) : isCorrectAnswer(answer, ctx.task.answers);
  if (!right) {
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
    ctx.form.replaceWith(...solvedState(ctx.task, answer), ...earnedXp(ctx.xp));
    ctx.card.dispatchEvent(new CustomEvent("task-solved", { bubbles: true }));
  } catch {
    if (ctx.button) ctx.button.disabled = false;
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/** A question that is one of several in its door shows the XP it just gave; a whole door says +100 XP itself. */
function earnedXp(xp) {
  if (!xp || xp >= XP_PER_LEVEL) return [];
  return [paragraph("task-done-state match-success quiz-xp", `+${xp} XP`)];
}

/** The answer stays on its line, with the teacher's red cursive R ("rätt") where the Rätta button was. */
function examAnswer(text) {
  const row = Object.assign(document.createElement("p"), { className: "task-done-state exam-answer" });
  const mark = Object.assign(document.createElement("span"), { className: "exam-mark", textContent: "R" });
  mark.setAttribute("aria-hidden", "true");
  row.append(Object.assign(document.createElement("span"), { className: "exam-line", textContent: text }), mark);
  return row;
}

/** Only completion is stored, so a reload shows the first accepted answer. */
function solvedAnswer(task, typed) {
  const text = typed?.trim() || task.answers[0];
  const row = examAnswer(text);
  row.setAttribute("role", "status");
  row.setAttribute("aria-label", `${QUIZ_DONE_LABEL} ${text}`);
  return row;
}

/** A picture that reveals the answer, shown once the question is solved. */
function solvedPicture(task) {
  const picture = Object.assign(document.createElement("img"), { src: task.solvedImage, alt: task.solvedAlt ?? "", className: "task-image quiz-solved-image" });
  picture.loading = "lazy";
  return picture;
}

/** A solved tile quiz shows the real symbols and its picture; any other quiz keeps the answer. */
function solvedState(task, typed) {
  if (!task.tiles) return [solvedAnswer(task, typed), ...(task.solvedImage ? [solvedPicture(task)] : [])];
  const result = task.solvedImage ? { src: task.solvedImage, alt: task.solvedAlt } : null;
  // The revealed symbols and picture are the answer, so no separate "Rätt svar!" line.
  const tiles = createPeriodicTiles(task.tiles, { mode: "solved", result });
  tiles.setAttribute("role", "status");
  tiles.setAttribute("aria-label", QUIZ_DONE_LABEL);
  return [tiles];
}

/** Tiles take the answer themselves; otherwise letter boxes or a plain text field. */
function answerField(task) {
  if (task.tiles) return createPeriodicTiles(task.tiles, { mode: "input" });
  if (task.letters) return letterBoxes(codeWordLength(task.answers), /^\d+$/.test(task.answers[0] ?? ""));
  const input = answerInput();
  input.classList.add("exam-blank");
  if (task.timeRange) input.placeholder = "t.ex. 03:15";
  return input;
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
 *   options: { task, key, progress, card, xp } where card is the task card to mark as done and
 *     xp the XP this question is worth, shown when it is answered.
 * Returns:
 *   The elements to append to the card.
 */
export function createQuiz({ task, key, progress, card, xp }) {
  if (progress.isCompleted(key)) return solvedState(task);
  const form = Object.assign(document.createElement("form"), { className: "quiz-form" });
  const field = answerField(task);
  // Tile sums check themselves once every tile is filled, so they need no submit button.
  const button = task.tiles ? null : Object.assign(document.createElement("button"), { type: "submit", textContent: task.submitLabel ?? "Svara" });
  const status = paragraph("task-status", "");
  status.setAttribute("role", "status");
  form.append(...[field, button, status].filter(Boolean));
  const ctx = { task, key, progress, card, xp, form, field, button, status };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(ctx);
  });
  if (task.tiles) checkWhenFilled(ctx);
  const hint = createQuizHint({ task, key, progress });
  return hint ? [hint, form] : [form];
}
