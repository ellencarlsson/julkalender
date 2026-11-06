/** Small building blocks shared by the task views. */
import { CHALLENGE_DONE_LABEL, PHOTO_INSTRUCTION, PHOTO_SENT_LABEL } from "./lib/progress.js";

/** The chokladboll picture used for hint points (collected from side quests, spent on hints). */
export function chokladbollIcon() {
  const icon = Object.assign(document.createElement("img"), { src: "./images/theme/chokladboll.webp", alt: "", className: "cb-icon" });
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

export function chokladbollar(count) {
  return `${count} ${count === 1 ? "chokladboll" : "chokladbollar"}`;
}

export function paragraph(className, text) {
  return Object.assign(document.createElement("p"), { className, textContent: text });
}

/** Theme-colored square checkmark; an emoji would look different on every device. */
export function checkIcon() {
  const icon = document.createElement("span");
  icon.className = "check-icon";
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

export function doneState(label) {
  const done = paragraph("task-done-state", ` ${label}`);
  done.prepend(checkIcon());
  done.setAttribute("role", "status");
  return done;
}

async function completeWithPhoto(card, button, status, save) {
  button.disabled = true;
  status.textContent = "Sparar…";
  try {
    await save();
    card.classList.add("task--done");
    card.querySelector(".task-instruction")?.remove();
    status.remove();
    button.replaceWith(doneState(CHALLENGE_DONE_LABEL));
  } catch {
    button.disabled = false;
    status.textContent = "Kunde inte spara. Försök igen.";
  }
}

/**
 * "Photo sent" button for real-life challenges and side quests.
 *
 * Args:
 *   card: the card to mark as done.
 *   done: whether it is already completed.
 *   save: async function that stores the completion.
 * Returns:
 *   The elements to append to the card.
 */
export function photoSentControls(card, done, save) {
  if (done) return [doneState(CHALLENGE_DONE_LABEL)];
  const button = Object.assign(document.createElement("button"), { type: "button", className: "photo-sent" });
  button.textContent = PHOTO_SENT_LABEL;
  const status = paragraph("task-status", "");
  status.setAttribute("role", "status");
  button.addEventListener("click", () => completeWithPhoto(card, button, status, save));
  return [paragraph("task-instruction", PHOTO_INSTRUCTION), button, status];
}
