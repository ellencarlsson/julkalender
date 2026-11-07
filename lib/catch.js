/** Catch game logic in field percentages: x across the width, y down the height (0 = top). */

export const BUCKET_WIDTH = 18;
const OPENING_SHARE = 0.42;
// The tree's crown across the picture, so items start among the leaves.
const CROWN_LEFT = 14;
const CROWN_WIDTH = 72;

/** Level 1 is gentle; each level falls faster, spawns quicker and drops more things to avoid. */
const LEVELS = [
  { badChance: 0.15, speed: 40, step: 2, spawn: [1.1, 0.8] },
  { badChance: 0.24, speed: 50, step: 2.5, spawn: [0.95, 0.65] },
  { badChance: 0.32, speed: 60, step: 3, spawn: [0.85, 0.55] },
  { badChance: 0.4, speed: 70, step: 3.5, spawn: [0.75, 0.45] },
];
export const LEVEL_COUNT = LEVELS.length;

/** True in the one frame an item moves from above the rim to on or below it. */
export function crossesRim(previousY, y, rimY) {
  return previousY < rimY && y >= rimY;
}

/** The opening is a little narrower than the bucket picture, so edge touches do not count. */
export function isOverBucket(x, bucketX) {
  return Math.abs(x - bucketX) <= BUCKET_WIDTH * OPENING_SHARE;
}

export function clampBucket(x) {
  return Math.min(100 - BUCKET_WIDTH / 2, Math.max(BUCKET_WIDTH / 2, x));
}

export function pickKind(random, badChance) {
  return random() < badChance ? "bad" : "good";
}

export function spawnX(random) {
  return CROWN_LEFT + random() * CROWN_WIDTH;
}

export function levelSettings(level) {
  return LEVELS[Math.min(LEVEL_COUNT, Math.max(1, level)) - 1];
}

/** Fall speed in percent of the field height per second; it rises a little with every bun caught. */
export function fallSpeed(caught, level = 1) {
  const { speed, step } = levelSettings(level);
  return speed + caught * step;
}

/** The finished levels are saved as one row next to the crossword and sudoku saves. */
export function encodeLevels(done) {
  return [String(done)];
}

export function levelsDone(rows) {
  const done = Number.parseInt(Array.isArray(rows) ? rows[0] : "", 10);
  return Number.isInteger(done) ? Math.min(LEVEL_COUNT, Math.max(0, done)) : 0;
}
