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

const SYMBOLS = (
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr " +
  "Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb " +
  "Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf " +
  "Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split(" ");

/** Chemical symbol of an element, e.g. 57 → "La"; null outside the table. */
export function elementSymbol(atomicNumber) {
  return SYMBOLS[atomicNumber - 1] ?? null;
}

// Standard atomic weights (IUPAC, rounded) for the elements likely to appear in puzzles.
const MASSES = {
  1: "1.008", 2: "4.0026", 3: "6.94", 4: "9.0122", 5: "10.81", 6: "12.011", 7: "14.007", 8: "15.999",
  9: "18.998", 10: "20.180", 11: "22.990", 12: "24.305", 13: "26.982", 14: "28.085", 15: "30.974",
  16: "32.06", 17: "35.45", 18: "39.948", 19: "39.098", 20: "40.078", 21: "44.956", 22: "47.867",
  23: "50.942", 24: "51.996", 25: "54.938", 26: "55.845", 27: "58.933", 28: "58.693", 29: "63.546",
  30: "65.38", 31: "69.723", 32: "72.630", 33: "74.922", 34: "78.971", 35: "79.904", 36: "83.798",
  47: "107.87", 53: "126.90", 57: "138.91", 79: "196.97", 80: "200.59", 82: "207.2", 92: "238.03",
  105: "[268]",
};

/** Atomic weight as printed on a periodic table tile, e.g. 6 → "12.011"; null when not listed. */
export function elementMass(atomicNumber) {
  return MASSES[atomicNumber] ?? null;
}
