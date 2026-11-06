/** "Använd ledtråd" for quiz tasks: one hint point reveals the task's hint text for good. */
import { quizHintKey } from "./lib/quiz.js";
import { paragraph } from "./task-ui.js";

const HINT_MESSAGES = {
  ask: "Vill du använda en ledtråd? Det kostar 1 ledtrådspoäng.",
  noPoints: "Du har inga ledtrådspoäng. Klara ett sidouppdrag för att få fler.",
  failed: "Kunde inte använda ledtråden. Försök igen.",
};

const hintText = (task) => paragraph("quiz-hint-text", `💡 Ledtråd: ${task.hint}`);

function smallButton(text, onClick) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: "small", textContent: text });
  button.addEventListener("click", onClick);
  return button;
}

async function spendHint(box, task, progress, key) {
  box.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    await progress.useHint(key);
    box.replaceChildren(hintText(task));
  } catch {
    box.replaceChildren(paragraph("task-status", HINT_MESSAGES.failed), askButton(box, task, progress, key));
  }
}

function confirmHint(box, task, progress, key) {
  if ((progress.hintBalance?.() ?? 0) < 1) {
    box.replaceChildren(paragraph("task-status", HINT_MESSAGES.noPoints), askButton(box, task, progress, key));
    return;
  }
  const confirm = Object.assign(document.createElement("div"), { className: "quiz-hint-confirm" });
  confirm.append(
    paragraph("", HINT_MESSAGES.ask),
    smallButton("Ja", () => spendHint(box, task, progress, key)),
    smallButton("Nej", () => box.replaceChildren(askButton(box, task, progress, key))),
  );
  box.replaceChildren(confirm);
}

function askButton(box, task, progress, key) {
  return smallButton("💡 Använd ledtråd", () => confirmHint(box, task, progress, key));
}

/**
 * Builds the hint area of a quiz task.
 *
 * Args:
 *   options: { task, key, progress } where key is the task key.
 * Returns:
 *   The hint element, or null when the task has no hint.
 */
export function createQuizHint({ task, key, progress }) {
  if (!task.hint) return null;
  const box = Object.assign(document.createElement("div"), { className: "quiz-hint" });
  const hintKey = quizHintKey(key);
  box.append(progress.isWordRevealed?.(hintKey) ? hintText(task) : askButton(box, task, progress, hintKey));
  return box;
}
