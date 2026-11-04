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
