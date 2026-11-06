/** Keeps the shown hint point balance in sync with the side quests and the player's progress. */
import { hintBalance } from "./lib/hints.js";
import { showHintPoints } from "./ui.js";

export function createHintTracker() {
  let sideQuests = [];
  let progress = null;
  const balance = () =>
    progress ? hintBalance(sideQuests, progress.completedSideQuestIds(), progress.revealedWordKeys(), progress.usedHintKeys()) : 0;
  const refresh = () => showHintPoints(balance());
  return {
    balance,
    refresh,
    sideQuests: () => sideQuests,
    setSideQuests(loaded) {
      sideQuests = loaded;
      refresh();
    },
    setProgress(loaded) {
      progress = loaded;
      refresh();
    },
    reset() {
      sideQuests = [];
      progress = null;
      refresh();
    },
  };
}
