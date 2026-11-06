/** Shows a door's task cards one block at a time, with < > buttons to browse between them. */

/** A door is paged when it is made of several matching tasks, like one round per champion class. */
export function isPagedDoor(tasks) {
  return tasks.length > 1 && tasks.every((task) => task.type === "matching");
}

function arrowButton(text, label) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: "block-arrow", textContent: text });
  button.setAttribute("aria-label", label);
  return button;
}

/**
 * Wraps task cards in a pager that shows one card at a time.
 *
 * Args:
 *   cards: the task card elements, in door order.
 *   titles: one heading per card, shown between the arrows.
 * Returns:
 *   The pager element.
 */
export function blockPager(cards, titles) {
  const [prev, next] = [arrowButton("<", "Föregående block"), arrowButton(">", "Nästa block")];
  const title = Object.assign(document.createElement("p"), { className: "block-title" });
  title.setAttribute("aria-live", "polite");
  const nav = Object.assign(document.createElement("div"), { className: "block-nav" });
  nav.append(prev, title, next);
  let index = 0;
  const show = (to) => {
    index = to;
    cards.forEach((card, i) => (card.hidden = i !== index));
    title.textContent = `${titles[index]} (${index + 1}/${cards.length})`;
    prev.disabled = index === 0;
    next.disabled = index === cards.length - 1;
  };
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  show(0);
  const pager = Object.assign(document.createElement("div"), { className: "block-pager" });
  pager.append(nav, ...cards);
  return pager;
}
