/** Catch game logic in field percentages: x across the width, y down the height (0 = top). */

export const BUCKET_WIDTH = 18;
const OPENING_SHARE = 0.42;
// The tree's crown across the picture, so items start among the leaves.
const CROWN_LEFT = 14;
const CROWN_WIDTH = 72;

/**
 * Level 1 is gentle; each level falls faster, spawns quicker and drops more things to avoid. Within
 * a level the speed and spawn rate stay the same the whole time. spawn is seconds between items.
 */
const LEVELS = [
  { badChance: 0.15, speed: 50, spawn: 0.95 },
  { badChance: 0.24, speed: 62, spawn: 0.8 },
  { badChance: 0.32, speed: 74, spawn: 0.7 },
  { badChance: 0.4, speed: 86, spawn: 0.6 },
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

/** Fall speed in percent of the field height per second. */
export function fallSpeed(level = 1) {
  return levelSettings(level).speed;
}

/** The finished levels are saved as one row next to the crossword and sudoku saves. */
export function encodeLevels(done) {
  return [String(done)];
}

export function levelsDone(rows) {
  const done = Number.parseInt(Array.isArray(rows) ? rows[0] : "", 10);
  return Number.isInteger(done) ? Math.min(LEVEL_COUNT, Math.max(0, done)) : 0;
}

/**
 * The things to avoid on one level.
 *
 * Args:
 *   bad: one picture or a list of pictures.
 *   fromLevel: optional map from picture to the first level it falls on; others fall on every level.
 *   level: the level being played.
 */
export function badPicturesFor(bad, fromLevel, level) {
  return [bad].flat().filter((src) => (fromLevel?.[src] ?? 1) <= level);
}

/**
 * Picks one picture, each as likely as its weight (1 when not listed).
 *
 * Args:
 *   random: function returning a number in [0, 1).
 *   pictures: the pictures to choose from.
 *   weights: optional map from picture to its weight.
 */
export function pickWeighted(random, pictures, weights) {
  const weightOf = (src) => weights?.[src] ?? 1;
  let left = random() * pictures.reduce((total, src) => total + weightOf(src), 0);
  return pictures.find((src) => (left -= weightOf(src)) < 0) ?? pictures.at(-1);
}
