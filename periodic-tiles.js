/** Draws a code-word sum as periodic table tiles: atomic number in the corner, symbol typed by the player. */
import { elementCategory, elementMass, elementSymbol, formatSymbol } from "./lib/periodic.js";

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

/** mode: "input" to type the symbol, "solved" to show it, anything else shows "?". */
function elementTile(atomicNumber, mode) {
  const tile = document.createElement("span");
  tile.className = `pt-tile pt-${elementCategory(atomicNumber)}${mode === "solved" ? " pt-solved" : ""}`;
  const number = Object.assign(document.createElement("span"), { className: "pt-number", textContent: atomicNumber });
  const text = mode === "solved" ? elementSymbol(atomicNumber) : "?";
  const symbol = mode === "input" ? symbolInput(atomicNumber) : Object.assign(document.createElement("span"), { className: "pt-symbol", textContent: text });
  const mass = Object.assign(document.createElement("span"), { className: "pt-mass", textContent: elementMass(atomicNumber) ?? "" });
  tile.append(number, symbol, mass);
  return tile;
}

/** "=" followed by a large "?" for the answer still to find. */
function unknownResult() {
  const result = Object.assign(document.createElement("span"), { className: "pt-result" });
  result.append(operator("="), Object.assign(document.createElement("span"), { className: "pt-unknown", textContent: "?" }));
  return result;
}

function resultPicture({ src, alt }) {
  const result = Object.assign(document.createElement("span"), { className: "pt-result" });
  result.append(operator("="), Object.assign(document.createElement("img"), { src, alt: alt ?? "", className: "pt-result-image" }));
  return result;
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
 *   options: { mode, result } — mode "input" gives each element tile a symbol field, "solved"
 *     shows the real symbols; result { src, alt } replaces the final "?" with a picture when solved.
 * Returns:
 *   A row of tiles joined by "+" and ending in "= ?" or "=" and the picture.
 */
export function createPeriodicTiles(tiles, { mode = "hidden", result = null } = {}) {
  const row = Object.assign(document.createElement("div"), { className: "pt-row" });
  row.style.setProperty("--tile-count", tiles.length);
  tiles.forEach((tile, index) => {
    if (index > 0) row.append(operator("+"));
    row.append(typeof tile === "number" ? elementTile(tile, mode) : letterTile(tile));
  });
  row.append(mode === "solved" && result ? resultPicture(result) : unknownResult());
  return row;
}

/** The answer read from the tiles in order: typed symbols and the fixed letters. */
export function tilesAnswer(row) {
  return [...row.querySelectorAll(".pt-tile")]
    .map((tile) => tile.querySelector("input")?.value ?? tile.querySelector(".pt-symbol")?.textContent ?? "")
    .join("");
}
