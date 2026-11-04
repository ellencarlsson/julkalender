/** Keeps the header level ring in sync with loaded doors and completed tasks. */
import { DOOR_STATE } from "./lib/door-state.js";
import { levelFromXp, totalXp } from "./lib/level.js";
import { showLevel, showLevelUp } from "./ui.js";

export function createLevelTracker() {
  const doors = new Map();
  let progress = null;
  let shownLevel = 0;

  /** Celebrates only after a task is completed, never when data merely finishes loading. */
  function refresh({ celebrate = false } = {}) {
    if (!progress) return;
    const { level, xpInLevel } = levelFromXp(totalXp([...doors.entries()], progress));
    if (celebrate && level > shownLevel) showLevelUp(level);
    shownLevel = level;
    showLevel(level, xpInLevel);
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
      showLevel(0, 0);
    },
  };
}
