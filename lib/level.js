/** XP and level math: each door is worth 100 XP, split between its tasks by weight. */
import { taskKey } from "./progress.js";
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

/** Computed per door so a fully completed door is exactly 100 XP, never 99.99 from rounding. */
export function doorXp(number, door, isCompleted) {
  const tasks = Array.isArray(door?.tasks) ? door.tasks : [];
  const totalWeight = sum(tasks.map(taskWeight));
  if (totalWeight === 0) return 0;
  const doneWeight = sum(tasks.filter((task) => isCompleted(taskKey(number, task.id))).map(taskWeight));
  return (XP_PER_LEVEL * doneWeight) / totalWeight;
}

/**
 * Sums XP over all known doors.
 *
 * Args:
 *   doors: list of [doorNumber, doorDocument] pairs.
 *   isCompleted: function(taskKey) -> boolean.
 */
export function totalXp(doors, isCompleted) {
  return sum(doors.map(([number, door]) => doorXp(number, door, isCompleted)));
}

/** Level and XP toward the next level; the ring is shown full once the last level is reached. */
export function levelFromXp(total) {
  const xp = Math.round(Math.max(0, Number.isFinite(total) ? total : 0) * 100) / 100;
  const level = Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL));
  const xpInLevel = level === MAX_LEVEL ? XP_PER_LEVEL : xp - level * XP_PER_LEVEL;
  return { level, xpInLevel };
}
