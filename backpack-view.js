/** Backpack view: the gift card code boxes and the items collected from completed doors. */
import { CODE_LENGTH } from "./lib/rewards.js";

const element = (id) => document.getElementById(id);

function codeBox(digit) {
  const box = Object.assign(document.createElement("li"), { className: `code-box${digit ? "" : " code-box--missing"}` });
  box.textContent = digit ?? "?";
  return box;
}

/**
 * Shows the collected rewards.
 *
 * Args:
 *   rewards: { code, items } from collectRewards, or null while progress is loading.
 */
export function renderBackpack(rewards) {
  const { code, items } = rewards ?? { code: Array(CODE_LENGTH).fill(null), items: [] };
  element("code-boxes").replaceChildren(...code.map(codeBox));
  element("code-boxes").setAttribute("aria-label", `Hemlig kod: ${code.filter(Boolean).length} av ${CODE_LENGTH} siffror hittade`);
  element("backpack-items").replaceChildren(...items.map((item) => Object.assign(document.createElement("li"), { textContent: item })));
  element("backpack-empty").hidden = items.length > 0;
}
