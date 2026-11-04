/** Tests for the level ring fill. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { xpRingPercent } from "../lib/level.js";

test("ring is empty at 0 XP, half at 50 and full at 100", () => {
  assert.equal(xpRingPercent(0), 0);
  assert.equal(xpRingPercent(50), 50);
  assert.equal(xpRingPercent(100), 100);
});

test("ring fill is clamped to 0-100", () => {
  assert.equal(xpRingPercent(-10), 0);
  assert.equal(xpRingPercent(250), 100);
});

test("fractional XP is rounded to a whole percent", () => {
  assert.equal(xpRingPercent(33.3), 33);
});

test("missing XP gives an empty ring", () => {
  assert.equal(xpRingPercent(undefined), 0);
  assert.equal(xpRingPercent(NaN), 0);
});
