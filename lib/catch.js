/** Catch game logic in field percentages: x across the width, y down the height (0 = top). */

export const BUCKET_WIDTH = 18;
const OPENING_SHARE = 0.42;
const CROWN_LEFT = 12;
const CROWN_WIDTH = 76;
const BASE_SPEED = 32;
const SPEED_STEP = 2.5;

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

/** Fall speed in percent of the field height per second. */
export function fallSpeed(caught) {
  return BASE_SPEED + caught * SPEED_STEP;
}
