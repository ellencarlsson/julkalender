/** Keeps the header level ring in sync with loaded doors and completed tasks. */
import { DOOR_STATE } from "./lib/door-state.js";
import { markDoorCompleted } from "./door-view.js";
import { MAX_LEVEL, isDoorCompleted, levelFromXp, totalXp } from "./lib/level.js";
import { DOOR_COUNT } from "./lib/unlock-time.js";
import { showLevel, showLevelUp } from "./ui.js";

/**
 * Args:
 *   onMaxLevel: called once per sign-in when the player reaches the last level.
 */
export function createLevelTracker({ onMaxLevel = () => {} } = {}) {
  const doors = new Map();
  let progress = null;
  let shownLevel = 0;
  let reachedMax = false;

  function markCompletedDoors() {
    for (let number = 1; number <= DOOR_COUNT; number++) {
      markDoorCompleted(number, Boolean(progress) && isDoorCompleted(number, doors.get(number), progress));
    }
  }

  /** Celebrates only after a task is completed, never when data merely finishes loading. */
  function refresh({ celebrate = false } = {}) {
    markCompletedDoors();
    if (!progress) return;
    const { level, xpInLevel } = levelFromXp(totalXp([...doors.entries()], progress));
    if (celebrate && level > shownLevel) showLevelUp(level);
    shownLevel = level;
    showLevel(level, xpInLevel);
    if (level === MAX_LEVEL && !reachedMax) onMaxLevel();
    reachedMax = level === MAX_LEVEL;
  }

  function setDoor(number, result) {
    if (result.state === DOOR_STATE.OPEN) doors.set(number, result.door);
    else if (result.state !== DOOR_STATE.ERROR) doors.delete(number);
  }

  return {
    refresh,
    setDoor(number, result) {
      setDoor(number, result);
      refresh();
    },
    setAllDoors(results) {
      results.forEach((result, index) => setDoor(index + 1, result));
      refresh();
    },
    setProgress(loaded) {
      progress = loaded;
      refresh();
    },
    reset() {
      doors.clear();
      progress = null;
      shownLevel = 0;
      reachedMax = false;
      showLevel(0, 0);
      markCompletedDoors();
    },
  };
}
