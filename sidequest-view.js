/** Side quests panel: each quest with its hint point reward and a "photo sent" button. */
import { sideQuestReward } from "./lib/hints.js";
import { paragraph, photoSentControls } from "./task-ui.js";

const element = (id) => document.getElementById(id);

function rewardText(quest) {
  const points = sideQuestReward(quest);
  return `+${points} ledtrådspoäng`;
}

function questCard(quest, progress) {
  const card = document.createElement("article");
  card.className = "task sidequest";
  const done = progress.isSideQuestCompleted(quest.id);
  if (done) card.classList.add("task--done");
  card.append(paragraph("", quest.text), paragraph("sidequest-reward", rewardText(quest)));
  card.append(...photoSentControls(card, done, () => progress.completeSideQuest(quest.id)));
  return card;
}

/**
 * Shows the side quests, or a short message when there are none (yet).
 *
 * Args:
 *   quests: side quests from Firestore, already sorted.
 *   progress: the player's progress, or null while it is loading.
 */
export function renderSideQuests(quests, progress) {
  const list = element("sidequest-list");
  if (!progress) return list.replaceChildren(paragraph("", "Laddar…"));
  if (quests.length === 0) return list.replaceChildren(paragraph("", "Sidouppdragen dyker upp 1 december."));
  list.replaceChildren(...quests.map((quest) => questCard(quest, progress)));
}
