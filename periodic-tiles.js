/** Draws a code-word sum as periodic table tiles: atomic number in the corner, symbol typed by the player. */
import { elementCategory, formatSymbol } from "./lib/periodic.js";

function symbolInput(atomicNumber) {
  const input = Object.assign(document.createElement("input"), { type: "text", className: "pt-input", maxLength: 2 });
  input.placeholder = "?";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("autocapitalize", "characters");
  input.setAttribute("aria-label", `Beteckning för grundämne nummer ${atomicNumber}`);
  input.addEventListener("input", () => (input.value = formatSymbol(input.value)));
  return input;
}

function elementTile(atomicNumber, editable) {
  const tile = document.createElement("span");
  tile.className = `pt-tile pt-${elementCategory(atomicNumber)}`;
  const number = Object.assign(document.createElement("span"), { className: "pt-number", textContent: atomicNumber });
  const symbol = editable
    ? symbolInput(atomicNumber)
    : Object.assign(document.createElement("span"), { className: "pt-symbol", textContent: "?" });
  tile.append(number, symbol);
  return tile;
}

function letterTile(letter) {
  const tile = document.createElement("span");
  tile.className = "pt-tile pt-letter";
  tile.append(Object.assign(document.createElement("span"), { className: "pt-symbol", textContent: letter }));
  return tile;
}

const operator = (text) => Object.assign(document.createElement("span"), { className: "pt-operator", textContent: text });

/**
 * Builds the tile row for a quiz with `tiles`.
 *
 * Args:
 *   tiles: atomic numbers and plain letters, e.g. [6, 1, "L", 18].
 *   options: { editable } — when true each element tile gets an input for its symbol.
 * Returns:
 *   A row of tiles joined by "+" and ending in "= ?".
 */
export function createPeriodicTiles(tiles, { editable = false } = {}) {
  const row = Object.assign(document.createElement("div"), { className: "pt-row" });
  tiles.forEach((tile, index) => {
    if (index > 0) row.append(operator("+"));
    row.append(typeof tile === "number" ? elementTile(tile, editable) : letterTile(tile));
  });
  row.append(operator("= ?"));
  return row;
}

/** The answer read from the tiles in order: typed symbols and the fixed letters. */
export function tilesAnswer(row) {
  return [...row.querySelectorAll(".pt-tile")]
    .map((tile) => tile.querySelector("input")?.value ?? tile.querySelector(".pt-symbol")?.textContent ?? "")
    .join("");
}
