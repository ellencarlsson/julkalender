/** Pick task: tap the right options among the cards (tap again to undo), then press Kolla. */
import { shuffled } from "./lib/matching.js";
import { isRightPick } from "./lib/pick.js";
import { createQuizHint } from "./quiz-hint.js";
import { CHALLENGE_DONE_LABEL } from "./lib/progress.js";
import { doneState, paragraph } from "./task-ui.js";

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

function optionCard(ctx, option, index) {
  const card = element("button", "pick-option", option.text);
  card.type = "button";
  card.setAttribute("aria-pressed", "false");
  card.addEventListener("click", () => {
    if (ctx.chosen.has(index)) ctx.chosen.delete(index);
    else ctx.chosen.add(index);
    card.setAttribute("aria-pressed", String(ctx.chosen.has(index)));
    ctx.status.textContent = "";
  });
  return card;
}

async function check(ctx) {
  if (!isRightPick(ctx.task.options, ctx.chosen)) {
    ctx.status.textContent = "Inte riktigt. Några stämmer inte, försök igen.";
    return;
  }
  ctx.status.textContent = "Sparar…";
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
    ctx.list.querySelectorAll(".pick-option").forEach((card) => (card.disabled = true));
    ctx.button.remove();
    const label = ctx.xp && ctx.xp < 100 ? `Alla rätt! +${ctx.xp} XP` : CHALLENGE_DONE_LABEL;
    const done = Object.assign(doneState(label), { className: "task-done-state task-done-signed match-success" });
    ctx.status.replaceWith(...explanation(ctx.task), done);
    ctx.card.dispatchEvent(new CustomEvent("task-solved", { bubbles: true }));
  } catch {
    ctx.status.textContent = "Kunde inte spara. Försök igen.";
  }
}

function explanation(task) {
  return task.explanation ? [paragraph("task-story pick-explanation", task.explanation)] : [];
}

/** A finished pick shows only the right options, chosen. */
function solvedList(task) {
  const list = element("div", "pick-list");
  task.options.filter((option) => option.correct).forEach((option) => {
    const card = Object.assign(element("button", "pick-option", option.text), { type: "button", disabled: true });
    card.setAttribute("aria-pressed", "true");
    list.append(card);
  });
  return list;
}

/**
 * Builds a pick task.
 *
 * Args:
 *   options: { task, key, progress, card, xp } where task.options are { text, correct } cards and
 *     the optional task.explanation is shown once the task is solved.
 * Returns:
 *   The elements to append to the card.
 */
export function createPick({ task, key, progress, card, xp }) {
  if (progress.isCompleted(key)) return [solvedList(task), ...explanation(task), doneState(CHALLENGE_DONE_LABEL)];
  const ctx = { task, key, progress, card, xp, chosen: new Set() };
  ctx.list = element("div", "pick-list");
  ctx.list.append(...shuffled(task.options.map((option, index) => optionCard(ctx, option, index)), key));
  ctx.button = Object.assign(element("button", "pick-check", "Kolla"), { type: "button" });
  ctx.button.addEventListener("click", () => check(ctx));
  ctx.status = paragraph("task-status", "");
  ctx.status.setAttribute("role", "status");
  const hint = createQuizHint({ task, key, progress });
  const instruction = paragraph("task-instruction", task.instruction ?? "Tryck på alla som stämmer och sedan på Kolla.");
  return [...(hint ? [hint] : []), instruction, ctx.list, ctx.button, ctx.status];
}
