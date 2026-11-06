/** Tests for the typing race: progress through the text, timing, leaderboard and passing. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatsEllen, formatTime, isEllen, raceText, topResults, typingProgress } from "../lib/typing.js";

test("the race text is the sentences joined by single spaces", () => {
  assert.equal(raceText({ sentences: ["Hej tomten.", " God jul! "] }), "Hej tomten. God jul!");
});

test("progress counts the correct start and flags the first mistake", () => {
  assert.deepEqual(typingProgress("God jul", "God"), { correct: 3, wrong: false, done: false });
  assert.deepEqual(typingProgress("God jul", "Gox"), { correct: 2, wrong: true, done: false });
  assert.deepEqual(typingProgress("God jul", "God jul"), { correct: 7, wrong: false, done: true });
  assert.deepEqual(typingProgress("God jul", "God jul!"), { correct: 7, wrong: true, done: false });
});

test("times are shown in seconds with one decimal and a Swedish comma", () => {
  assert.equal(formatTime(12345), "12,3 s");
  assert.equal(formatTime(900), "0,9 s");
});

test("the leaderboard shows the five fastest, fastest first", () => {
  const results = [700, 300, 900, 100, 500, 200].map((timeMs, i) => ({ name: `P${i}`, timeMs }));
  assert.deepEqual(topResults(results).map((r) => r.timeMs), [100, 200, 300, 500, 700]);
});

test("a time passes only when it beats Ellen's best", () => {
  assert.equal(beatsEllen(9000, 10000), true);
  assert.equal(beatsEllen(10000, 10000), false);
  assert.equal(beatsEllen(9000, null), false);
});

test("Ellen is recognised by her verified email", () => {
  assert.equal(isEllen({ email: "carlssonellen@live.se", emailVerified: true }), true);
  assert.equal(isEllen({ email: "carlssonellen@live.se", emailVerified: false }), false);
  assert.equal(isEllen({ email: "someone@example.com", emailVerified: true }), false);
});
