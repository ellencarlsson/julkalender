/** Draws a code-word sum as periodic table tiles: atomic number in the corner, symbol left out. */
import { elementCategory } from "./lib/periodic.js";

function elementTile(atomicNumber) {
  const tile = document.createElement("span");
  tile.className = `pt-tile pt-${elementCategory(atomicNumber)}`;
  tile.setAttribute("aria-label", `Grundämne nummer ${atomicNumber}`);
  const number = Object.assign(document.createElement("span"), { className: "pt-number", textContent: atomicNumber });
  const symbol = Object.assign(document.createElement("span"), { className: "pt-symbol", textContent: "?" });
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
 * Returns:
 *   A row of tiles joined by "+" and ending in "= ?".
 */
export function createPeriodicTiles(tiles) {
  const row = Object.assign(document.createElement("div"), { className: "pt-row" });
  tiles.forEach((tile, index) => {
    if (index > 0) row.append(operator("+"));
    row.append(typeof tile === "number" ? elementTile(tile) : letterTile(tile));
  });
  row.append(operator("= ?"));
  return row;
}
