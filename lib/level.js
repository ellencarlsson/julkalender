/** XP and level math: each door is worth 100 XP, split between its tasks by weight. */
import { wordId } from "./crossword.js";
import { taskKey, wordKey } from "./progress.js";
import { DOOR_COUNT } from "./unlock-time.js";

export const XP_PER_LEVEL = 100;
export const MAX_LEVEL = DOOR_COUNT;

const taskWeight = (task) => (Number.isFinite(task?.weight) && task.weight > 0 ? task.weight : 1);
const sum = (values) => values.reduce((total, value) => total + value, 0);

/** Percent of the ring to fill for XP earned within the current level, clamped to 0-100. */
export function xpRingPercent(xpInLevel) {
  if (!Number.isFinite(xpInLevel)) return 0;
  const percent = (xpInLevel / XP_PER_LEVEL) * 100;
  return Math.round(Math.min(100, Math.max(0, percent)));
}

/** Share of a task that is done: 1 when completed, or the fraction of correct words in a crossword. */
function taskDoneShare(number, task, progress) {
  const key = taskKey(number, task.id);
  if (progress.isCompleted(key)) return 1;
  if (task.type !== "crossword" || !Array.isArray(task.clues) || task.clues.length === 0) return 0;
  const correct = task.clues.filter((clue) => progress.isWordCorrect?.(wordKey(key, wordId(clue))));
  return correct.length / task.clues.length;
}

/**
 * XP earned in one door; computed per door so a fully completed door is exactly 100 XP.
 *
 * Args:
 *   number: the door number.
 *   door: the door document with its tasks.
 *   progress: { isCompleted(taskKey), isWordCorrect(wordKey) }.
 */
export function doorXp(number, door, progress) {
  const tasks = Array.isArray(door?.tasks) ? door.tasks : [];
  const totalWeight = sum(tasks.map(taskWeight));
  if (totalWeight === 0) return 0;
  const doneWeight = sum(tasks.map((task) => taskWeight(task) * taskDoneShare(number, task, progress)));
  return (XP_PER_LEVEL * doneWeight) / totalWeight;
}

/**
 * Sums XP over all known doors.
 *
 * Args:
 *   doors: list of [doorNumber, doorDocument] pairs.
 *   progress: { isCompleted(taskKey), isWordCorrect(wordKey) }.
 */
export function totalXp(doors, progress) {
  return sum(doors.map(([number, door]) => doorXp(number, door, progress)));
}

/** Level and XP toward the next level; the ring is shown full once the last level is reached. */
export function levelFromXp(total) {
  const xp = Math.round(Math.max(0, Number.isFinite(total) ? total : 0) * 100) / 100;
  const level = Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL));
  const xpInLevel = level === MAX_LEVEL ? XP_PER_LEVEL : xp - level * XP_PER_LEVEL;
  return { level, xpInLevel };
}

/** A door is completed only when every one of its tasks is; partly done doors still count as open. */
export function isDoorCompleted(number, door, progress) {
  const tasks = Array.isArray(door?.tasks) ? door.tasks : [];
  return tasks.length > 0 && tasks.every((task) => progress.isCompleted(taskKey(number, task.id)));
}

/** XP one task is worth inside its door (its weighted share of the door's 100 XP), rounded for display. */
export function taskXp(task, tasks) {
  const totalWeight = sum((tasks ?? []).map(taskWeight));
  return totalWeight === 0 ? 0 : Math.round((XP_PER_LEVEL * taskWeight(task)) / totalWeight);
}
