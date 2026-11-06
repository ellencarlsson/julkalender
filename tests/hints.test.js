/** Tests for hint point balance. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hintBalance, sideQuestReward } from "../lib/hints.js";

const QUESTS = [{ id: "lol" }, { id: "pokemon" }, { id: "hjortar", reward: 2 }];

test("no completed side quests means no hint points", () => {
  assert.equal(hintBalance(QUESTS, [], []), 0);
});

test("each completed side quest adds its reward (default 1)", () => {
  assert.equal(hintBalance(QUESTS, ["lol"], []), 1);
  assert.equal(hintBalance(QUESTS, ["lol", "hjortar"], []), 3);
});

test("each revealed word spends one hint point", () => {
  assert.equal(hintBalance(QUESTS, ["lol", "hjortar"], ["5-korsord|across-0-0"]), 2);
});

test("the same word or quest is only counted once", () => {
  assert.equal(hintBalance(QUESTS, ["lol", "lol"], ["5-k|a", "5-k|a"]), 0);
});

test("balance never goes below 0", () => {
  assert.equal(hintBalance(QUESTS, [], ["5-k|a", "5-k|b"]), 0);
});

test("completions of side quests that no longer exist give nothing", () => {
  assert.equal(hintBalance(QUESTS, ["removed-quest"], []), 0);
});

test("invalid rewards fall back to 1", () => {
  assert.equal(sideQuestReward({ reward: 0 }), 1);
  assert.equal(sideQuestReward({ reward: "3" }), 1);
  assert.equal(sideQuestReward({ reward: 3 }), 3);
});

test("each bought quiz hint spends one hint point, once per task", () => {
  assert.equal(hintBalance(QUESTS, ["lol", "hjortar"], [], ["2-kodord"]), 2);
  assert.equal(hintBalance(QUESTS, ["lol", "hjortar"], ["5-k|a"], ["2-kodord", "2-kodord"]), 1);
  assert.equal(hintBalance(QUESTS, [], [], ["2-kodord"]), 0);
});
