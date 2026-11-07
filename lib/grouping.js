/** Grouping task logic: items are known by "<group>-<item>" ids, groups by their index. */

export const itemId = (group, item) => `${group}-${item}`;
const groupOf = (id) => Number(id.split("-")[0]);

export function groupSize(groups) {
  return groups[0]?.items?.length ?? 0;
}

/**
 * Checks the player's selected items.
 *
 * Returns:
 *   { group, almost }: the found group's index (or null), and whether all but one item belong together.
 */
export function checkSelection(groups, selected) {
  const counts = new Map();
  selected.forEach((id) => counts.set(groupOf(id), (counts.get(groupOf(id)) ?? 0) + 1));
  const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const size = groupSize(groups);
  if (count === size && selected.length === size) return { group: best, almost: false };
  return { group: null, almost: count === size - 1 };
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
