/** Picture puzzle logic: order[place] is the piece shown at that place; piece i belongs at place i. */

export function isSolved(order) {
  return order.every((piece, place) => piece === place);
}

/**
 * A random order of the pieces that is never the solved one.
 *
 * Args:
 *   count: number of pieces.
 *   random: function returning [0, 1), injectable for tests.
 */
export function shuffledOrder(count, random = Math.random) {
  const order = Array.from({ length: count }, (_, index) => index);
  do {
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (count > 1 && isSolved(order));
  return order;
}

export function swapPieces(order, a, b) {
  const next = [...order];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Saved as one row next to the crossword saves, like "3,0,2,1". */
export function encodeOrder(order) {
  return [order.join(",")];
}

export function decodeOrder(rows, count) {
  if (!Array.isArray(rows) || typeof rows[0] !== "string") return null;
  const order = rows[0].split(",").map(Number);
  const complete = order.length === count && new Set(order).size === count && order.every((piece) => Number.isInteger(piece) && piece >= 0 && piece < count);
  return complete ? order : null;
}
