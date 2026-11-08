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

/** The task's done text, signed in script at the bottom right of the card. */
export function doneState(label) {
  const done = paragraph("task-done-state task-done-signed", label);
  done.setAttribute("role", "status");
  return done;
}

/**
 * Saves a ticked or unticked checklist box; if saving fails the box goes back to how it was.
 *
 * Args:
 *   label: the checklist row, crossed out while ticked.
 *   checkbox: its checkbox, already changed by the player.
 *   save: async function called with true (ticked) or false (unticked).
 *   onSaved: optional, called with the same value once it is stored.
 */
export async function saveTick(label, checkbox, save, onSaved = () => {}) {
  const done = checkbox.checked;
  checkbox.disabled = true;
  label.parentElement.querySelector(".sq-error")?.remove();
  try {
    await save(done);
    label.classList.toggle("sq-item--done", done);
    onSaved(done);
  } catch {
    checkbox.checked = !done;
    label.after(paragraph("sq-error", "Kunde inte spara. Försök igen."));
  }
  checkbox.disabled = false;
}

/**
 * "Photo sent" checkbox for real-life challenges, drawn like the side quest checklist.
 *
 * Args:
 *   card: the card to mark as done.
 *   done: whether it is already completed.
 *   save: async function that stores the tick (true) or its removal (false).
 * Returns:
 *   The elements to append to the card.
 */
export function photoSentControls(card, done, save) {
  const label = Object.assign(document.createElement("label"), { className: `sq-item photo-sent${done ? " sq-item--done" : ""}` });
  const checkbox = Object.assign(document.createElement("input"), { type: "checkbox", className: "sq-check", checked: done });
  const text = Object.assign(document.createElement("span"), { className: "sq-text", textContent: PHOTO_SENT_LABEL });
  checkbox.addEventListener("change", () => saveTick(label, checkbox, save, (ticked) => card.classList.toggle("task--done", ticked)));
  label.append(checkbox, text);
  return [label];
}
