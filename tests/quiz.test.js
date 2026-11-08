/** Tests for quiz answer checking and code-word quiz helpers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { codeWordLength, isCorrectAnswer, isTimeInRange, normalizeAnswer, parseTime, quizHintKey } from "../lib/quiz.js";

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

test("code word length counts letters of the first answer, ignoring case and spaces", () => {
  assert.equal(codeWordLength(["DRACULA"]), 7);
  assert.equal(codeWordLength(["Chokladbollar"]), 13);
  assert.equal(codeWordLength(["Stupid Song"]), 10);
  assert.equal(codeWordLength([]), 0);
});

test("letters joined from boxes are checked like a typed answer", () => {
  assert.equal(isCorrectAnswer(["d", "r", "a", "c", "u", "l", "a"].join(""), ["DRACULA"]), true);
  assert.equal(isCorrectAnswer("DRACULO", ["DRACULA"]), false);
});

test("the quiz hint key belongs to its task, so resetting the door refunds it", () => {
  assert.equal(quizHintKey("8/ekvation"), "8/ekvation|hint");
  assert.ok(quizHintKey("8/ekvation").startsWith("8/ekvation|"));
});

test("times can be typed with colon, dot, comma, no separator or as whole hours", () => {
  assert.equal(parseTime("1:30"), 90);
  assert.equal(parseTime("01.30"), 90);
  assert.equal(parseTime("1,30"), 90);
  assert.equal(parseTime("0130"), 90);
  assert.equal(parseTime("2"), 120);
  assert.equal(parseTime("25:00"), null);
  assert.equal(parseTime("halv två"), null);
});

test("a time answer is right anywhere inside its range", () => {
  const range = { from: "01:15", to: "01:45" };
  assert.equal(isTimeInRange("1:15", range), true);
  assert.equal(isTimeInRange("01:30", range), true);
  assert.equal(isTimeInRange("1.45", range), true);
  assert.equal(isTimeInRange("1:10", range), false);
  assert.equal(isTimeInRange("2", range), false);
  assert.equal(isTimeInRange("", range), false);
});
