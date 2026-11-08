/** A ticket picture with text printed on it: locked until its task is solved, then the unlocked text. */

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

function printLocked(print, ticket) {
  print.replaceChildren(element("span", "ticket-lock", "🔒"), element("span", "ticket-line", ticket.locked ?? "Slå in koden för att låsa upp biobiljetten"));
}

function printUnlocked(print, ticket, code) {
  print.replaceChildren(
    element("span", "ticket-heading", ticket.unlocked ?? "Presentkort på bio"),
    element("span", "ticket-code", code),
    ...(ticket.note ? [element("span", "ticket-line", ticket.note)] : []),
  );
}

/**
 * Args:
 *   task: a task with ticket { image, locked?, unlocked?, note? } and answers[0] as the code shown once solved.
 *   card: the task card; its "task-solved" event unlocks the ticket.
 *   done: whether the task is already solved.
 * Returns:
 *   The ticket element.
 */
export function ticketPicture(task, card, done) {
  const ticket = element("div", "ticket");
  const print = element("div", "ticket-print");
  print.setAttribute("aria-live", "polite");
  ticket.append(Object.assign(element("img", "ticket-image"), { src: task.ticket.image, alt: "Biobiljett" }), print);
  const unlock = () => {
    ticket.classList.add("ticket--unlocked");
    printUnlocked(print, task.ticket, task.answers[0]);
  };
  if (done) unlock();
  else {
    printLocked(print, task.ticket);
    card.addEventListener("task-solved", unlock, { once: true });
  }
  return ticket;
}
