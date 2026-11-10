/** Typing race logic: how far the player has typed correctly, times and the leaderboard. */

import { ADMIN_EMAIL } from "./admin.js";

// Ellen's race times count as hers only when she is the admin, as firestore.rules requires.
export const ELLEN_EMAIL = ADMIN_EMAIL;
const LEADERBOARD_SIZE = 5;

export function raceText(task) {
  return (task.sentences ?? []).map((sentence) => sentence.trim()).join(" ");
}

/**
 * Compares what the player typed with the text to copy.
 *
 * Returns:
 *   { correct, wrong, done }: how many leading characters are right, whether anything after them
 *   is wrong, and whether the whole text is typed exactly.
 */
export function typingProgress(target, typed) {
  let correct = 0;
  while (correct < typed.length && typed[correct] === target[correct]) correct++;
  const wrong = correct < typed.length;
  return { correct, wrong, done: !wrong && correct === target.length };
}

export function formatTime(ms) {
  return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

export function topResults(results) {
  return [...results].sort((a, b) => a.timeMs - b.timeMs).slice(0, LEADERBOARD_SIZE);
}

export function beatsEllen(timeMs, ellenMs) {
  return ellenMs != null && timeMs < ellenMs;
}

/** Same check as isAdmin() in firestore.rules. */
export function isEllen(user) {
  return user?.email === ELLEN_EMAIL && user?.emailVerified === true;
}
