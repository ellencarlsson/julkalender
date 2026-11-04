/** TEST_RESET_DOOR: temporary "Rensa lucka" tool for the admin while testing. Remove before the calendar is given away. */
import { taskKey } from "./progress.js";

export const ADMIN_EMAIL = "carlssonellen@live.se";

export function canResetDoors(user) {
  return Boolean(user?.emailVerified) && user.email === ADMIN_EMAIL;
}

/**
 * Lists what to delete to replay one door.
 *
 * Args:
 *   number: the door number.
 *   door: the door document with its tasks.
 *   correctWords: iterable of saved correct-word keys ("<taskKey>|<wordId>").
 * Returns:
 *   { tasks, crosswords, words } with task keys, crossword task keys and word keys of this door.
 */
export function doorResetPlan(number, door, correctWords) {
  const tasks = (door?.tasks ?? []).map((task) => taskKey(number, task.id));
  const crosswords = (door?.tasks ?? []).filter((task) => task.type === "crossword").map((task) => taskKey(number, task.id));
  const words = [...correctWords].filter((word) => tasks.some((key) => word.startsWith(`${key}|`)));
  return { tasks, crosswords, words };
}
