/** Shows a door's task cards one block at a time, with < > buttons to browse between them. */

/** A door is paged when it is made of several matching tasks, like one round per champion class. */
export function isPagedDoor(tasks) {
  return tasks.length > 1 && tasks.every((task) => task.type === "matching");
}

const AUTO_NEXT_MS = 1800;

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
 *   titles: one heading per card, shown between the arrows with the counter; "" shows only the counter.
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
    const count = `${index + 1}/${cards.length}`;
    title.textContent = titles[index] ? `${titles[index]} (${count})` : count;
    prev.disabled = index === 0;
    next.disabled = index === cards.length - 1;
  };
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  show(0);
  const pager = Object.assign(document.createElement("div"), { className: "block-pager" });
  // After a block is solved, give the player a moment to see the result, then show the next block.
  pager.addEventListener("task-solved", () => {
    if (index < cards.length - 1) setTimeout(() => show(index + 1), AUTO_NEXT_MS);
  });
  pager.append(nav, ...cards);
  return pager;
}
