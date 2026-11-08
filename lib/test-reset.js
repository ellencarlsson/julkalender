/** TEST_RESET_DOOR: temporary "Rensa lucka" tool for testing. Remove before the calendar is given away. */
import { taskKey } from "./progress.js";

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
  // Sudokus, catch game levels, puzzles, found groups, found hotspots and found words are saved in the same map as crosswords, so they are cleared the same way.
  const saved = (task) => ["crossword", "sudoku", "catch", "puzzle", "grouping", "hotspot", "wordsearch"].includes(task.type);
  const crosswords = (door?.tasks ?? []).filter(saved).map((task) => taskKey(number, task.id));
  const words = [...correctWords].filter((word) => tasks.some((key) => word.startsWith(`${key}|`)));
  return { tasks, crosswords, words };
}

/**
 * TEST_COMPLETE: every task key in the calendar, for the "Klara hela kalendern" tool.
 *
 * Args:
 *   doorResults: list of { door } in door order, as read for doors 1-24.
 */
export function calendarTaskKeys(doorResults) {
  return doorResults.flatMap((result, index) => doorResetPlan(index + 1, result?.door, []).tasks);
}
