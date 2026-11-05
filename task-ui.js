/** Small building blocks shared by the task views. */

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
