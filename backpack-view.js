/** Backpack view: the gift card code boxes and the items collected from completed doors. */
import { CLUES, CODE_LENGTH, FIRST_HALF } from "./lib/rewards.js";

const element = (id) => document.getElementById(id);
const REWARD_ITEM = "backpack-item--reward";

function codeBox(digit, index) {
  const half = index < FIRST_HALF ? "code-box--start" : "code-box--end";
  const box = Object.assign(document.createElement("li"), { className: `code-box ${half}${digit ? "" : " code-box--missing"}` });
  box.textContent = digit ?? "?";
  return box;
}

function itemPicture({ image, emoji }) {
  if (image) return Object.assign(document.createElement("img"), { src: image, alt: "" });
  const picture = Object.assign(document.createElement("span"), { className: "backpack-item-emoji", textContent: emoji });
  picture.setAttribute("aria-hidden", "true");
  return picture;
}

function itemTile(item) {
  const { name } = item;
  const tile = Object.assign(document.createElement("li"), { className: `backpack-item ${REWARD_ITEM}` });
  const picture = itemPicture(item);
  tile.append(picture, Object.assign(document.createElement("span"), { className: "backpack-item-name", textContent: name }));
  if (item.note) tile.append(Object.assign(document.createElement("span"), { className: "backpack-item-note", textContent: item.note }));
  // A wide picture (like the cinema ticket) gets a wider tile.
  if (item.wide) tile.classList.add("backpack-item--wide");
  return tile;
}

/**
 * Shows the collected rewards; the chokladboll tile is static in the page and stays first.
 *
 * Args:
 *   rewards: { code, items } from collectRewards, or null while progress is loading.
 */
export function renderBackpack(rewards) {
  const { code, items, clues } = rewards ?? { code: Array(CODE_LENGTH).fill(null), items: [], clues: new Set() };
  // Which parts of the code show is styled from these flags on the section.
  CLUES.forEach((clue) => element("view-backpack").classList.toggle(`has-${clue}`, clues.has(clue)));
  element("code-boxes").replaceChildren(...code.map(codeBox));
  element("code-boxes").setAttribute("aria-label", `Hemlig kod: ${code.filter(Boolean).length} av ${CODE_LENGTH} siffror hittade`);
  const list = element("backpack-items");
  list.querySelectorAll(`.${REWARD_ITEM}`).forEach((tile) => tile.remove());
  list.append(...items.map(itemTile));
}
