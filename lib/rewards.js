/** Backpack rewards: gift card code digits and items that completed doors hand out. */
import { isDoorCompleted } from "./level.js";

export const CODE_LENGTH = 11;

/**
 * Collects the rewards of every completed door.
 *
 * Args:
 *   doors: [number, door] pairs for the doors loaded so far.
 *   progress: the player's progress ({ isCompleted(key) }).
 * Returns:
 *   { code, items } where code has CODE_LENGTH entries (a digit, or null while still missing)
 *   and items lists the collected item names in door order.
 */
export function collectRewards(doors, progress) {
  const code = Array(CODE_LENGTH).fill(null);
  const items = [];
  const completed = [...doors].filter(([number, door]) => isDoorCompleted(number, door, progress)).sort(([a], [b]) => a - b);
  for (const [, door] of completed) {
    const reward = door.reward ?? {};
    if (isCodePosition(reward.position) && isDigit(reward.digit)) code[reward.position - 1] = reward.digit;
    if (typeof reward.item === "string" && reward.item.trim()) items.push(reward.item);
  }
  return { code, items };
}

export const isDigit = (value) => typeof value === "string" && /^\d$/.test(value);
export const isCodePosition = (value) => Number.isInteger(value) && value >= 1 && value <= CODE_LENGTH;
