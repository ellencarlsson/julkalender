/** "Använd ledtråd" for quiz tasks: one chokladboll (hint point) reveals the task's hint text for good. */
import { quizHintKey } from "./lib/quiz.js";
import { chokladbollIcon, paragraph } from "./task-ui.js";

const HINT_MESSAGES = {
  ask: "Vill du använda en ledtråd? Det kostar 1 chokladboll.",
  noPoints: "Du har ätit upp alla chokladbollar 😭 Klara fler sidequests för att få fler.",
  failed: "Kunde inte använda ledtråden. Försök igen.",
};

const hintText = (task) => paragraph("quiz-hint-text", `Ledtråd: ${task.hint}`);

function smallButton(text, onClick) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: "small", textContent: text });
  button.addEventListener("click", onClick);
  return button;
}

async function spendHint(ctx) {
  ctx.panel.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    await ctx.progress.useHint(ctx.hintKey);
    showHintText(ctx);
  } catch {
    ctx.panel.replaceChildren(paragraph("task-status", HINT_MESSAGES.failed));
  }
}

function showHintText(ctx) {
  ctx.revealed = true;
  ctx.panel.replaceChildren(hintText(ctx.task));
}

function confirmHint(ctx) {
  if (ctx.revealed) return;
  if ((ctx.progress.hintBalance?.() ?? 0) < 1) return ctx.panel.replaceChildren(paragraph("task-status", HINT_MESSAGES.noPoints));
  const confirm = Object.assign(document.createElement("div"), { className: "quiz-hint-confirm" });
  confirm.append(
    paragraph("", HINT_MESSAGES.ask),
    smallButton("Ja", () => spendHint(ctx)),
    smallButton("Nej", () => ctx.panel.replaceChildren()),
  );
  ctx.panel.replaceChildren(confirm);
}

// The icon never leaves the corner; questions and the hint text go in the panel below it.
function hintIcon(ctx) {
  const button = smallButton("", () => confirmHint(ctx));
  button.append(chokladbollIcon());
  button.classList.add("quiz-hint-icon");
  button.setAttribute("aria-label", "Använd ledtråd (kostar 1 chokladboll)");
  button.title = "Använd ledtråd";
  return button;
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
  const ctx = { task, progress, hintKey: quizHintKey(key), revealed: false };
  ctx.panel = Object.assign(document.createElement("div"), { className: "quiz-hint-panel" });
  if (progress.isWordRevealed?.(ctx.hintKey)) showHintText(ctx);
  box.append(hintIcon(ctx), ctx.panel);
  return box;
}
