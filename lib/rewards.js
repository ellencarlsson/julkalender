/** Backpack rewards: gift card code digits and items that completed doors hand out. */
import { isDoorCompleted } from "./level.js";

export const CODE_LENGTH = 11;
/** Boxes 1-6 are the first half of the code, 7-11 the second. */
export const FIRST_HALF = Math.ceil(CODE_LENGTH / 2);
/** Clues a door can give, revealing the code step by step. */
export const CLUES = ["code-start", "code-end", "code-title"];

const CLUE_LABELS = {
  "code-title": "Hemlig kod",
  "code-start": `Kodrutor 1-${FIRST_HALF}`,
  "code-end": `Kodrutor ${FIRST_HALF + 1}-${CODE_LENGTH}`,
};

/** What a door gives for the secret code, as short lines to show when the door is done. */
export function codeRewardLines(reward) {
  const lines = [];
  if (CLUES.includes(reward?.clue)) lines.push(CLUE_LABELS[reward.clue]);
  if (isDigit(reward?.digit) && isCodePosition(reward?.position)) lines.push(`Kodsiffra ${reward.digit}`);
  return lines;
}

/**
 * Collects the rewards of every completed door.
 *
 * Args:
 *   doors: [number, door] pairs for the doors loaded so far.
 *   progress: the player's progress ({ isCompleted(key) }).
 * Returns:
 *   { code, items, clues } where code has CODE_LENGTH entries (a digit, or null while still missing),
 *   items lists the collected { name, image | emoji } items in door order and clues is the Set of
 *   CLUES found, and prize the { image, code, text } of a completed prize door (or null).
 */
export function collectRewards(doors, progress) {
  const code = Array(CODE_LENGTH).fill(null);
  const items = [];
  const clues = new Set();
  let prize = null;
  const completed = [...doors].filter(([number, door]) => isDoorCompleted(number, door, progress)).sort(([a], [b]) => a - b);
  for (const [, door] of completed) {
    const reward = door.reward ?? {};
    if (isCodePosition(reward.position) && isDigit(reward.digit)) code[reward.position - 1] = reward.digit;
    if (isItem(reward.item)) items.push(reward.item);
    if (CLUES.includes(reward.clue)) clues.add(reward.clue);
    if (isPrize(reward.prize)) prize = reward.prize;
  }
  return { code, items, clues, prize };
}

const isText = (value) => typeof value === "string" && value.trim() !== "";
/** An item has a name and a picture: an image path or, until the pictures exist, an emoji. */
export const isItem = (value) =>
  typeof value === "object" && value !== null && isText(value.name) && (isText(value.image) || isText(value.emoji));
/** The big prize (the cinema ticket): its picture, the code printed on it and what to do. */
export const isPrize = (value) =>
  typeof value === "object" && value !== null && isText(value.image) && isText(value.code) && isText(value.text);
export const isDigit = (value) => typeof value === "string" && /^\d$/.test(value);
export const isCodePosition = (value) => Number.isInteger(value) && value >= 1 && value <= CODE_LENGTH;
