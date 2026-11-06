/** Side quests list: a handwritten checklist where ticking a quest completes it for its hint points. */
import { sideQuestReward } from "./lib/hints.js";
import { paragraph } from "./task-ui.js";

const element = (id) => document.getElementById(id);

const rewardText = (quest) => `+${sideQuestReward(quest)} 💡`;

async function completeQuest(item, checkbox, quest, progress) {
  checkbox.disabled = true;
  item.querySelector(".sq-error")?.remove();
  try {
    await progress.completeSideQuest(quest.id);
    item.classList.add("sq-item--done");
  } catch {
    checkbox.checked = false;
    checkbox.disabled = false;
    item.append(paragraph("sq-error", "Kunde inte spara. Försök igen."));
  }
}

function questItem(quest, progress) {
  const done = progress.isSideQuestCompleted(quest.id);
  const item = document.createElement("li");
  const label = Object.assign(document.createElement("label"), { className: `sq-item${done ? " sq-item--done" : ""}` });
  const checkbox = Object.assign(document.createElement("input"), { type: "checkbox", className: "sq-check", checked: done, disabled: done });
  const text = Object.assign(document.createElement("span"), { className: "sq-text", textContent: quest.text });
  const reward = Object.assign(document.createElement("span"), { className: "sq-reward", textContent: rewardText(quest) });
  reward.setAttribute("aria-label", `${sideQuestReward(quest)} ledtrådspoäng`);
  checkbox.addEventListener("change", () => checkbox.checked && completeQuest(label, checkbox, quest, progress));
  label.append(checkbox, text, reward);
  item.append(label);
  return item;
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
  const checklist = Object.assign(document.createElement("ul"), { className: "sq-list" });
  checklist.append(...quests.map((quest) => questItem(quest, progress)));
  list.replaceChildren(checklist);
}
