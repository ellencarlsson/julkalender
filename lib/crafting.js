/** Crafting logic: a 3×3 workbench grid compared with a recipe pattern, wherever it is placed. */

export const GRID = 3;

/** Drops empty rows and columns around the ingredients, so a recipe can sit anywhere in the grid. */
export function trimPattern(rows) {
  const filled = (cell) => cell !== null && cell !== undefined && cell !== "";
  const kept = rows.filter((row) => row.some(filled));
  const columns = [...Array(Math.max(0, ...kept.map((row) => row.length))).keys()].filter((col) => kept.some((row) => filled(row[col])));
  return kept.map((row) => columns.map((col) => (filled(row[col]) ? row[col] : null)));
}

/**
 * Checks a workbench grid against a recipe.
 *
 * Args:
 *   grid: GRID rows of GRID item ids (null for empty cells).
 *   pattern: the recipe rows, any size up to GRID×GRID, null for empty cells.
 * Returns:
 *   true when the ingredients form the recipe's shape, shifted anywhere in the grid.
 */
export function matchesRecipe(grid, pattern) {
  return JSON.stringify(trimPattern(grid)) === JSON.stringify(trimPattern(pattern));
}

export const emptyGrid = () => Array.from({ length: GRID }, () => Array(GRID).fill(null));
