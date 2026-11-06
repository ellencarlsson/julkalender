/** Matching task logic: items are paired with targets; a pair is right when it is the same pair index. */

/** Each side keeps its pair index so checking a pair never depends on how the board was shuffled. */
export function matchingBoard(pairs) {
  const items = pairs.map((pair, index) => ({ ...pair.item, pair: index }));
  const targets = pairs.map((pair, index) => ({ ...pair.target, pair: index }));
  return { items, targets };
}

export function isCorrectPair(itemPair, targetPair) {
  return Number.isInteger(itemPair) && itemPair === targetPair;
}

export function isMatchingSolved(pairs, matched) {
  const done = new Set(matched);
  return pairs.length > 0 && pairs.every((_, index) => done.has(index));
}

/** Deterministic shuffle (by seed) so the order differs from the content file but is the same on every load. */
export function shuffled(list, seed) {
  const result = [...list];
  let state = [...String(seed)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Checks the player's pairs all at once, so single pairs never reveal whether they are right.
 *
 * Args:
 *   links: Map from item pair index to the target pair index the player chose.
 *   pairCount: how many pairs the task has.
 * Returns:
 *   "incomplete" until every item has a partner, then "right" or "wrong".
 */
export function checkLinks(links, pairCount) {
  if (links.size < pairCount) return "incomplete";
  return [...links].every(([item, target]) => isCorrectPair(item, target)) ? "right" : "wrong";
}

/** Smallest badge number not in use, so a changed pair gets its number back. */
export function nextBadge(used) {
  let badge = 1;
  while (used.has(badge)) badge += 1;
  return badge;
}
