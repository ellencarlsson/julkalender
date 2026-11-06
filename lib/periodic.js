/** Periodic table categories, used to colour element tiles like a real periodic table. */

const GROUPS = {
  "alkali-metal": [3, 11, 19, 37, 55, 87],
  "alkaline-earth-metal": [4, 12, 20, 38, 56, 88],
  "noble-gas": [2, 10, 18, 36, 54, 86, 118],
  halogen: [9, 17, 35, 53, 85, 117],
  metalloid: [5, 14, 32, 33, 51, 52],
  "reactive-nonmetal": [1, 6, 7, 8, 15, 16, 34],
  "post-transition-metal": [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116],
};

export const MAX_ATOMIC_NUMBER = 118;

/**
 * Category of an element, e.g. "alkali-metal".
 *
 * Args:
 *   atomicNumber: whole number 1-118.
 * Returns:
 *   The category name, or null for numbers outside the table.
 */
export function elementCategory(atomicNumber) {
  if (!Number.isInteger(atomicNumber) || atomicNumber < 1 || atomicNumber > MAX_ATOMIC_NUMBER) return null;
  if (atomicNumber >= 57 && atomicNumber <= 71) return "lanthanide";
  if (atomicNumber >= 89 && atomicNumber <= 103) return "actinide";
  const group = Object.entries(GROUPS).find(([, numbers]) => numbers.includes(atomicNumber));
  return group ? group[0] : "transition-metal";
}

/** Writes a typed element symbol the way the table does: "la" → "La", "c" → "C". */
export function formatSymbol(text) {
  const letters = String(text ?? "").replace(/[^\p{L}]/gu, "").slice(0, 2);
  return letters.charAt(0).toLocaleUpperCase("sv-SE") + letters.slice(1).toLocaleLowerCase("sv-SE");
}
