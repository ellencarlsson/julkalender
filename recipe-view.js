/** Recipe card for baking challenges: ingredients on the left, the steps ("Gör så här") on the right. */

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

function column(title, listTag, lines) {
  const section = element("section", "recipe-column");
  const list = element(listTag, "recipe-list");
  list.append(...lines.map((line) => element("li", "", line)));
  section.append(element("h3", "recipe-title", title), list);
  return section;
}

/**
 * Args:
 *   recipe: { ingredients: [text], steps: [text] }.
 * Returns:
 *   The recipe card element.
 */
export function recipeCard({ ingredients, steps }) {
  const card = element("div", "recipe-card");
  card.append(column("Ingredienser", "ul", ingredients), column("Gör så här", "ol", steps));
  return card;
}
