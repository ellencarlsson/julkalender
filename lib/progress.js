/** Progress keys and parsing for the users/{uid} document. */

export const HONOR_PLEDGE = "Jag lovar på heder och samvete att jag har gjort det";

/** Task ids are only unique within a door, so stored keys include the door number. */
export function taskKey(door, taskId) {
  return `${door}-${taskId}`;
}

export function completedTaskSet(data) {
  const tasks = Array.isArray(data?.completedTasks) ? data.completedTasks : [];
  return new Set(tasks.filter((task) => typeof task === "string"));
}

/** Partially filled crosswords keyed by task key; anything malformed is ignored. */
export function savedCrosswords(data) {
  const saved = data?.crosswords;
  if (typeof saved !== "object" || saved === null || Array.isArray(saved)) return new Map();
  const valid = Object.entries(saved).filter(([, rows]) => Array.isArray(rows) && rows.every((row) => typeof row === "string"));
  return new Map(valid);
}

/** Correct crossword words are stored per task, so XP for a word is only ever awarded once. */
export function wordKey(taskKey, wordId) {
  return `${taskKey}|${wordId}`;
}

export function correctWordSet(data) {
  const words = Array.isArray(data?.correctWords) ? data.correctWords : [];
  return new Set(words.filter((word) => typeof word === "string"));
}
