/** Ordering task logic: items placed into numbered slots, checked against their listed order. */

/**
 * Splits a full set of slots into right and wrong placements.
 *
 * Args:
 *   slots: item indices per slot (null for an empty slot); item i belongs in slot i.
 * Returns:
 *   { right, wrong } as lists of slot numbers.
 */
export function checkOrder(slots) {
  const right = [];
  const wrong = [];
  slots.forEach((item, slot) => {
    if (item === null) return;
    (item === slot ? right : wrong).push(slot);
  });
  return { right, wrong };
}

export const isOrdered = (slots) => slots.every((item, slot) => item === slot);
