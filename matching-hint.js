/** "Använd ledtråd" for matching tasks: choose a card, then one chokladboll pairs it with its right partner. */
import { chokladbollIcon, paragraph } from "./task-ui.js";

const MESSAGES = {
  choose: "Tryck först på en karaktär och sedan på chokladbollen, så paras den ihop rätt.",
  ask: "Vill du att den paras ihop rätt? Det kostar 1 chokladboll.",
  noPoints: "Du har ätit upp alla chokladbollar 😭 Klara fler sidequests för att samla fler.",
  failed: "Kunde inte använda ledtråden. Försök igen.",
};

/** One saved hint per pair, stored with the other used hints. */
export const pairHintKey = (taskKey, pair) => `${taskKey}|pair|${pair}`;

function smallButton(text, className, onClick) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: `small ${className}`, textContent: text });
  button.addEventListener("click", onClick);
  return button;
}

function showPopover(hint, ...children) {
  hint.panel.replaceChildren(...children);
  hint.panel.hidden = children.length === 0;
}

async function spend(hint, pair) {
  hint.panel.querySelectorAll("button").forEach((button) => (button.disabled = true));
  try {
    await hint.progress.useHint(pairHintKey(hint.key, pair));
    showPopover(hint);
    hint.onReveal(pair);
  } catch {
    showPopover(hint, paragraph("", MESSAGES.failed));
  }
}

function onIcon(hint) {
  if (!hint.panel.hidden) return showPopover(hint);
  const pair = hint.selectedPair();
  if (pair === null) return showPopover(hint, paragraph("", MESSAGES.choose));
  if ((hint.progress.hintBalance?.() ?? 0) < 1) return showPopover(hint, paragraph("", MESSAGES.noPoints));
  showPopover(
    hint,
    paragraph("", MESSAGES.ask),
    smallButton("Ja", "hint-yes", () => spend(hint, pair)),
    smallButton("Nej", "hint-no", () => showPopover(hint)),
  );
}

/**
 * Builds the chokladboll button and pop-up of a matching task.
 *
 * Args:
 *   options: { key, progress, selectedPair, onReveal } where selectedPair() gives the pair of the chosen
 *   card (or null) and onReveal(pair) joins that pair once the chokladboll is spent.
 * Returns:
 *   The hint element, styled like the quiz hint.
 */
export function createMatchingHint({ key, progress, selectedPair, onReveal }) {
  const box = Object.assign(document.createElement("div"), { className: "quiz-hint" });
  const hint = { key, progress, selectedPair, onReveal };
  hint.panel = Object.assign(document.createElement("div"), { className: "quiz-hint-panel hint-popover", hidden: true });
  hint.panel.setAttribute("role", "status");
  const icon = smallButton("", "quiz-hint-icon", () => onIcon(hint));
  icon.append(chokladbollIcon());
  icon.setAttribute("aria-label", "Använd ledtråd (kostar 1 chokladboll)");
  icon.title = "Använd ledtråd";
  box.append(icon, hint.panel);
  return box;
}
