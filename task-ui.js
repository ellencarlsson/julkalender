/** Small building blocks shared by the task views. */
import { PHOTO_SENT_LABEL } from "./lib/progress.js";

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

/** The task's done text, signed in script at the bottom right of the card. */
export function doneState(label) {
  const done = paragraph("task-done-state task-done-signed", label);
  done.setAttribute("role", "status");
  return done;
}

async function completeWithPhoto(card, label, checkbox, save) {
  checkbox.disabled = true;
  label.parentElement.querySelector(".sq-error")?.remove();
  try {
    await save();
    card.classList.add("task--done");
    label.classList.add("sq-item--done");
  } catch {
    checkbox.checked = false;
    checkbox.disabled = false;
    label.after(paragraph("sq-error", "Kunde inte spara. Försök igen."));
  }
}

/**
 * "Photo sent" checkbox for real-life challenges, drawn like the side quest checklist.
 *
 * Args:
 *   card: the card to mark as done.
 *   done: whether it is already completed.
 *   save: async function that stores the completion.
 * Returns:
 *   The elements to append to the card.
 */
export function photoSentControls(card, done, save) {
  const label = Object.assign(document.createElement("label"), { className: `sq-item photo-sent${done ? " sq-item--done" : ""}` });
  const checkbox = Object.assign(document.createElement("input"), { type: "checkbox", className: "sq-check", checked: done, disabled: done });
  const text = Object.assign(document.createElement("span"), { className: "sq-text", textContent: PHOTO_SENT_LABEL });
  checkbox.addEventListener("change", () => checkbox.checked && completeWithPhoto(card, label, checkbox, save));
  label.append(checkbox, text);
  return [label];
}
