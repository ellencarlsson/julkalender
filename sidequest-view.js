/** Side quests list: a handwritten checklist where ticking a quest earns its chokladbollar (hint points) and unticking takes them back. */
import { sideQuestReward } from "./lib/hints.js";
import { unlockLabel } from "./lib/unlock-time.js";
import { chokladbollar, chokladbollIcon, paragraph, saveTick } from "./task-ui.js";

const element = (id) => document.getElementById(id);

function questItem(quest, progress) {
  const done = progress.isSideQuestCompleted(quest.id);
  const item = document.createElement("li");
  const label = Object.assign(document.createElement("label"), { className: `sq-item${done ? " sq-item--done" : ""}` });
  const checkbox = Object.assign(document.createElement("input"), { type: "checkbox", className: "sq-check", checked: done });
  const text = Object.assign(document.createElement("span"), { className: "sq-text", textContent: quest.text });
  const reward = Object.assign(document.createElement("span"), { className: "sq-reward", textContent: `+${sideQuestReward(quest)}` });
  reward.append(chokladbollIcon());
  reward.setAttribute("aria-label", chokladbollar(sideQuestReward(quest)));
  checkbox.addEventListener("change", () =>
    saveTick(label, checkbox, (ticked) => (ticked ? progress.completeSideQuest(quest.id) : progress.uncompleteSideQuest(quest.id))));
  label.append(checkbox, text, reward);
  item.append(label);
  return item;
}

/** TEST_RESET_SIDEQUESTS: button below the list that clears the player's own ticked side quests. */
function resetButton(onReset) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: "reset-door small" });
  button.textContent = "Rensa sidequests";
  button.addEventListener("click", async () => {
    if (!confirm("Rensa dina avbockade sidequests? Bara för testning.")) return;
    button.disabled = true;
    try {
      await onReset();
    } catch {
      button.disabled = false;
      button.textContent = "Kunde inte rensa. Försök igen.";
    }
  });
  return button;
}

/** Side quests open together with door 1, so before then they read like a locked door. */
function lockedMessage() {
  return [paragraph("locked-title", "Sidequests är låsta"), paragraph("", unlockLabel(1)), paragraph("", "Kom tillbaka då för att öppna dem!")];
}

/**
 * Shows the side quests, or a locked message before they open.
 *
 * Args:
 *   quests: side quests from Firestore, already sorted.
 *   progress: the player's progress, or null while it is loading.
 *   onReset: TEST_RESET_SIDEQUESTS callback for the "Rensa sidequests" button.
 */
export function renderSideQuests(quests, progress, onReset) {
  const list = element("sidequest-list");
  element("sidequest-tools").replaceChildren(...(progress && onReset ? [resetButton(onReset)] : []));
  if (!progress) return list.replaceChildren(paragraph("", "Laddar…"));
  if (quests.length === 0) return list.replaceChildren(...lockedMessage());
  const checklist = Object.assign(document.createElement("ul"), { className: "sq-list" });
  checklist.append(...quests.map((quest) => questItem(quest, progress)));
  list.replaceChildren(checklist);
}
