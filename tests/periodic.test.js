/** Tests for the periodic table category lookup. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { elementCategory, elementMass, elementSymbol, formatSymbol } from "../lib/periodic.js";

test("the CHOKLADBOLLAR elements get their real periodic table categories", () => {
  assert.equal(elementCategory(6), "reactive-nonmetal");
  assert.equal(elementCategory(1), "reactive-nonmetal");
  assert.equal(elementCategory(8), "reactive-nonmetal");
  assert.equal(elementCategory(19), "alkali-metal");
  assert.equal(elementCategory(57), "lanthanide");
  assert.equal(elementCategory(105), "transition-metal");
  assert.equal(elementCategory(18), "noble-gas");
});

test("other categories and numbers outside the table", () => {
  assert.equal(elementCategory(26), "transition-metal");
  assert.equal(elementCategory(92), "actinide");
  assert.equal(elementCategory(17), "halogen");
  assert.equal(elementCategory(0), null);
  assert.equal(elementCategory(119), null);
  assert.equal(elementCategory(2.5), null);
});

test("typed symbols are written like in the periodic table", () => {
  assert.equal(formatSymbol("la"), "La");
  assert.equal(formatSymbol("DB"), "Db");
  assert.equal(formatSymbol("c"), "C");
  assert.equal(formatSymbol("a1r"), "Ar");
  assert.equal(formatSymbol(""), "");
});

test("element symbols spell CHOKLADBOLLAR with the two L letters", () => {
  const symbols = [6, 1, 8, 19, 57, 105, 8].map(elementSymbol);
  assert.deepEqual(symbols, ["C", "H", "O", "K", "La", "Db", "O"]);
  assert.equal([...symbols, "L", "L", elementSymbol(18)].join("").toUpperCase(), "CHOKLADBOLLAR");
  assert.equal(elementSymbol(118), "Og");
  assert.equal(elementSymbol(0), null);
  assert.equal(elementSymbol(119), null);
});

test("tiles show the atomic weight for every element in the CHOKLADBOLLAR sum", () => {
  assert.deepEqual([6, 1, 8, 19, 57, 105, 18].map(elementMass), ["12.011", "1.008", "15.999", "39.098", "138.91", "[268]", "39.948"]);
  assert.equal(elementMass(118), null);
});
