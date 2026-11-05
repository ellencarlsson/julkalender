/** Tests for quiz answer checking. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCorrectAnswer, normalizeAnswer } from "../lib/quiz.js";

test("answers ignore case, outer spaces and repeated spaces", () => {
  assert.equal(normalizeAnswer("  Harry   POTTER \n"), "harry potter");
  assert.equal(isCorrectAnswer(" hedwig ", ["Hedwig"]), true);
  assert.equal(isCorrectAnswer("HEDWIG", ["Hedwig"]), true);
});

test("å ä ö are kept and decomposed forms match typed ones", () => {
  assert.equal(isCorrectAnswer("Gås", ["gås"]), true);
  assert.equal(isCorrectAnswer("gås", ["gås"]), true);
  assert.equal(isCorrectAnswer("gas", ["gås"]), false);
});

test("any of several accepted answers is correct", () => {
  assert.equal(isCorrectAnswer("Hedvig", ["Hedwig", "Hedvig"]), true);
  assert.equal(isCorrectAnswer("Errol", ["Hedwig", "Hedvig"]), false);
});

test("empty input or missing answers are never correct", () => {
  assert.equal(isCorrectAnswer("   ", ["Hedwig"]), false);
  assert.equal(isCorrectAnswer("", [""]), false);
  assert.equal(isCorrectAnswer("Hedwig", undefined), false);
});

test("inner characters still matter", () => {
  assert.equal(isCorrectAnswer("Hed wig", ["Hedwig"]), false);
});
