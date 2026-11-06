/** Backpack view: the gift card code boxes and the items collected from completed doors. */
import { CODE_LENGTH } from "./lib/rewards.js";

const element = (id) => document.getElementById(id);
const REWARD_ITEM = "backpack-item--reward";

function codeBox(digit) {
  const box = Object.assign(document.createElement("li"), { className: `code-box${digit ? "" : " code-box--missing"}` });
  box.textContent = digit ?? "?";
  return box;
}

function itemTile({ name, image }) {
  const tile = Object.assign(document.createElement("li"), { className: `backpack-item ${REWARD_ITEM}` });
  const picture = Object.assign(document.createElement("img"), { src: image, alt: "" });
  tile.append(picture, Object.assign(document.createElement("span"), { className: "backpack-item-name", textContent: name }));
  return tile;
}

/**
 * Shows the collected rewards; the chokladboll tile is static in the page and stays first.
 *
 * Args:
 *   rewards: { code, items } from collectRewards, or null while progress is loading.
 */
export function renderBackpack(rewards) {
  const { code, items } = rewards ?? { code: Array(CODE_LENGTH).fill(null), items: [] };
  element("code-boxes").replaceChildren(...code.map(codeBox));
  element("code-boxes").setAttribute("aria-label", `Hemlig kod: ${code.filter(Boolean).length} av ${CODE_LENGTH} siffror hittade`);
  const list = element("backpack-items");
  list.querySelectorAll(`.${REWARD_ITEM}`).forEach((tile) => tile.remove());
  list.append(...items.map(itemTile));
}
