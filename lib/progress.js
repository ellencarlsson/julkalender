/** Progress keys and parsing for the users/{uid} document. */

export const PHOTO_INSTRUCTION = "Skicka en bild till spelledaren och tryck sedan på knappen.";
export const PHOTO_SENT_LABEL = "📸 Jag har skickat bilden till spelledaren!";
export const CHALLENGE_DONE_LABEL = "✅ Klart!";

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
