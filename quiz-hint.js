/** "Använd ledtråd" for quiz tasks: one chokladboll (hint point) reveals the task's hint text for good. */
import { quizHintKey } from "./lib/quiz.js";
import { chokladbollIcon, paragraph } from "./task-ui.js";

const HINT_MESSAGES = {
  ask: "Vill du använda en ledtråd? Det kostar 1 chokladboll.",
  noPoints: "Du har ätit upp alla chokladbollar 😭 Klara fler sidequests för att samla fler.",
  failed: "Kunde inte använda ledtråden. Försök igen.",
};

const hintText = (task) => paragraph("quiz-hint-text", `Ledtråd: ${task.hint}`);

function smallButton(text, className, onClick) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: `small ${className}`, textContent: text });
  button.addEventListener("click", onClick);
  return button;
}

/** Shows content in the pop-up under the chokladboll, or closes it when given nothing. */
function showPopover(ctx, ...children) {
  ctx.panel.replaceChildren(...children);
  ctx.panel.hidden = children.length === 0;
}

async function spendHint(ctx) {
  ctx.panel.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    await ctx.progress.useHint(ctx.hintKey);
    ctx.revealed = true;
    showPopover(ctx, hintText(ctx.task));
  } catch {
    showPopover(ctx, paragraph("", HINT_MESSAGES.failed));
  }
}

function askToSpend(ctx) {
  showPopover(
    ctx,
    paragraph("", HINT_MESSAGES.ask),
    smallButton("Ja", "hint-yes", () => spendHint(ctx)),
    smallButton("Nej", "hint-no", () => showPopover(ctx)),
  );
}

/** The chokladboll toggles the pop-up; a hint already paid for just shows its text again. */
function onHintIcon(ctx) {
  if (!ctx.panel.hidden) return showPopover(ctx);
  if (ctx.revealed) return showPopover(ctx, hintText(ctx.task));
  if ((ctx.progress.hintBalance?.() ?? 0) < 1) return showPopover(ctx, paragraph("", HINT_MESSAGES.noPoints));
  askToSpend(ctx);
}

function hintIcon(ctx) {
  const button = smallButton("", "quiz-hint-icon", () => onHintIcon(ctx));
  button.append(chokladbollIcon());
  button.setAttribute("aria-label", ctx.revealed ? "Visa ledtråden" : "Använd ledtråd (kostar 1 chokladboll)");
  button.title = ctx.revealed ? "Visa ledtråden" : "Använd ledtråd";
  return button;
}

/**
 * Builds the hint area of a quiz task: the chokladboll button and its pop-up.
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
  const ctx = { task, progress, hintKey, revealed: Boolean(progress.isWordRevealed?.(hintKey)) };
  ctx.panel = Object.assign(document.createElement("div"), { className: "quiz-hint-panel hint-popover", hidden: true });
  ctx.panel.setAttribute("role", "status");
  box.append(hintIcon(ctx), ctx.panel);
  return box;
}
