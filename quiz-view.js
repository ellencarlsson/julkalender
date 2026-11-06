/** Quiz task: a typed answer checked against the accepted answers. */
import { QUIZ_DONE_LABEL, QUIZ_WRONG_LABEL } from "./lib/progress.js";
import { isCorrectAnswer } from "./lib/quiz.js";
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

async function submitAnswer(ctx) {
  if (!ctx.input.value.trim()) return;
  if (!isCorrectAnswer(ctx.input.value, ctx.task.answers)) {
    ctx.status.textContent = QUIZ_WRONG_LABEL;
    ctx.input.select();
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

const NO_HINT_POINTS = "Du har inga ledtrådspoäng. Klara ett sidouppdrag för att få fler.";

function hintText(task) {
  return paragraph("quiz-hint", `Ledtråd: ${task.hint}`);
}

async function buyHint(ctx, button) {
  if ((ctx.progress.hintBalance?.() ?? 0) < 1) return (ctx.hintStatus.textContent = NO_HINT_POINTS);
  button.disabled = true;
  try {
    await ctx.progress.useHint(ctx.key);
    button.replaceWith(hintText(ctx.task));
    ctx.hintStatus.textContent = "";
  } catch {
    button.disabled = false;
    ctx.hintStatus.textContent = "Kunde inte använda ledtråden. Försök igen.";
  }
}

/** A bought hint stays visible; otherwise a button offers it for one hint point. */
function hintControls(ctx) {
  if (!ctx.task.hint) return [];
  if (ctx.progress.isHintUsed?.(ctx.key)) return [hintText(ctx.task)];
  if (ctx.progress.isCompleted(ctx.key)) return [];
  const button = Object.assign(document.createElement("button"), { type: "button", className: "small quiz-hint-button" });
  button.textContent = "Använd ledtråd (1 💡)";
  ctx.hintStatus = paragraph("task-status", "");
  ctx.hintStatus.setAttribute("role", "status");
  button.addEventListener("click", () => buyHint(ctx, button));
  return [button, ctx.hintStatus];
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
  const hints = hintControls({ task, key, progress });
  if (progress.isCompleted(key)) return [...hints, doneState(QUIZ_DONE_LABEL)];
  const form = Object.assign(document.createElement("form"), { className: "quiz-form" });
  const input = answerInput();
  const button = Object.assign(document.createElement("button"), { type: "submit", textContent: "Svara" });
  const status = paragraph("task-status", "");
  status.setAttribute("role", "status");
  form.append(input, button, status);
  const ctx = { task, key, progress, card, form, input, button, status };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(ctx);
  });
  return [...hints, form];
}
