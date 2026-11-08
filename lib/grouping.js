/** Grouping task logic: items are known by "<group>-<item>" ids, groups by their index. */

export const itemId = (group, item) => `${group}-${item}`;
const groupOf = (id) => Number(id.split("-")[0]);

const groupIds = (groups, group) => groups[group].items.map((_, item) => itemId(group, item));

/** How many items are in one of the sets but not the other. */
function difference(a, b) {
  return [...a].filter((id) => !b.has(id)).length + [...b].filter((id) => !a.has(id)).length;
}

/**
 * Checks the items in one box against every group; groups may have different sizes.
 *
 * Returns:
 *   { group, almost }: the group the box holds exactly (or null), and whether it is one item away from
 *   a group (one missing, one extra or one swapped).
 */
export function checkSelection(groups, selected) {
  const chosen = new Set(selected);
  const ids = groups.map((_, group) => new Set(groupIds(groups, group)));
  const exact = ids.findIndex((group) => chosen.size > 0 && difference(chosen, group) === 0);
  if (exact >= 0) return { group: exact, almost: false };
  // One missing or extra differs by 1; one swapped differs by 2 with the same number of items.
  const oneAway = (group) => difference(chosen, group) === 1 || (difference(chosen, group) === 2 && chosen.size === group.size);
  return { group: null, almost: chosen.size > 0 && ids.some(oneAway) };
}

/** Every item with its id and group, in random order. */
export function shuffledItems(groups, random = Math.random) {
  const items = groups.flatMap((group, g) => group.items.map((item, i) => ({ ...item, id: itemId(g, i), group: g })));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Found groups are saved as one row next to the crossword saves, in the order they were found. */
export function encodeFound(found) {
  return [found.join(",")];
}

export function decodeFound(rows, groupCount) {
  if (!Array.isArray(rows) || typeof rows[0] !== "string" || rows[0] === "") return [];
  const numbers = rows[0].split(",").map(Number).filter((group) => Number.isInteger(group) && group >= 0 && group < groupCount);
  return [...new Set(numbers)];
}
