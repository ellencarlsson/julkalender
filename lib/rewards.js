/** Backpack rewards: gift card code digits and items that completed doors hand out. */
import { isDoorCompleted } from "./level.js";

export const CODE_LENGTH = 11;
/** Boxes 1-6 are the first half of the code, 7-11 the second. */
export const FIRST_HALF = Math.ceil(CODE_LENGTH / 2);
/** Clues a door can give, revealing the code step by step. */
export const CLUES = ["code-start", "code-end", "code-title"];

/**
 * Collects the rewards of every completed door.
 *
 * Args:
 *   doors: [number, door] pairs for the doors loaded so far.
 *   progress: the player's progress ({ isCompleted(key) }).
 * Returns:
 *   { code, items, clues } where code has CODE_LENGTH entries (a digit, or null while still missing),
 *   items lists the collected { name, image | emoji } items in door order and clues is the Set of
 *   CLUES found.
 */
export function collectRewards(doors, progress) {
  const code = Array(CODE_LENGTH).fill(null);
  const items = [];
  const clues = new Set();
  const completed = [...doors].filter(([number, door]) => isDoorCompleted(number, door, progress)).sort(([a], [b]) => a - b);
  for (const [, door] of completed) {
    const reward = door.reward ?? {};
    if (isCodePosition(reward.position) && isDigit(reward.digit)) code[reward.position - 1] = reward.digit;
    if (isItem(reward.item)) items.push(reward.item);
    if (CLUES.includes(reward.clue)) clues.add(reward.clue);
  }
  return { code, items, clues };
}

const isText = (value) => typeof value === "string" && value.trim() !== "";
/** An item has a name and a picture: an image path or, until the pictures exist, an emoji. */
export const isItem = (value) =>
  typeof value === "object" && value !== null && isText(value.name) && (isText(value.image) || isText(value.emoji));
export const isDigit = (value) => typeof value === "string" && /^\d$/.test(value);
export const isCodePosition = (value) => Number.isInteger(value) && value >= 1 && value <= CODE_LENGTH;
