/** Tests for workbench recipe checking. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyGrid, matchesRecipe, trimPattern } from "../lib/crafting.js";

const P = "plank";
const S = "stick";
const sword = [[P], [P], [S]];
const pickaxe = [[P, P, P], [null, S, null], [null, S, null]];

test("a recipe matches wherever it sits in the grid", () => {
  assert.equal(matchesRecipe([[null, P, null], [null, P, null], [null, S, null]], sword), true);
  assert.equal(matchesRecipe([[null, null, P], [null, null, P], [null, null, S]], sword), true);
  assert.equal(matchesRecipe(pickaxe, pickaxe), true);
});

test("wrong or extra ingredients do not match", () => {
  assert.equal(matchesRecipe([[null, S, null], [null, P, null], [null, P, null]], sword), false);
  assert.equal(matchesRecipe([[P, P, P], [null, S, null], [null, S, P]], pickaxe), false);
  assert.equal(matchesRecipe(emptyGrid(), sword), false);
});

test("trimPattern drops the empty rows and columns around the ingredients", () => {
  assert.deepEqual(trimPattern([[null, null, null], [null, P, P], [null, P, P]]), [[P, P], [P, P]]);
});
