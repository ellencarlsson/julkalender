/** Tests for code-word quiz helpers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { codeWordLength, isCorrectAnswer, quizHintKey } from "../lib/quiz.js";

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
