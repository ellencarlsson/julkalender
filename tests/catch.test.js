/** Tests for the catch game: landing in the bucket, bucket bounds, spawning and speed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUCKET_WIDTH, LEVEL_COUNT, clampBucket, crossesRim, encodeLevels, fallSpeed, isOverBucket, levelSettings, levelsDone, pickKind, spawnX } from "../lib/catch.js";

test("an item lands only in the frame it passes the bucket rim", () => {
  assert.equal(crossesRim(78, 82, 80), true);
  assert.equal(crossesRim(80, 84, 80), false);
  assert.equal(crossesRim(70, 75, 80), false);
});

test("an item is caught only above the bucket opening", () => {
  assert.equal(isOverBucket(50, 50), true);
  assert.equal(isOverBucket(50 + BUCKET_WIDTH * 0.4, 50), true);
  assert.equal(isOverBucket(50 + BUCKET_WIDTH, 50), false);
});

test("the bucket stays inside the field", () => {
  assert.equal(clampBucket(-20), BUCKET_WIDTH / 2);
  assert.equal(clampBucket(150), 100 - BUCKET_WIDTH / 2);
  assert.equal(clampBucket(40), 40);
});

test("apples come with the given chance, buns otherwise", () => {
  assert.equal(pickKind(() => 0.1, 0.3), "bad");
  assert.equal(pickKind(() => 0.5, 0.3), "good");
});

test("items start inside the tree's crown", () => {
  assert.ok(spawnX(() => 0) > 0 && spawnX(() => 0.999) < 100);
});

test("a level falls at its own fixed speed and spawn rate", () => {
  assert.equal(fallSpeed(2), levelSettings(2).speed);
  assert.equal(typeof levelSettings(2).spawn, "number");
});

test("every level is harder than the one before", () => {
  for (let level = 2; level <= LEVEL_COUNT; level++) {
    const [easier, harder] = [levelSettings(level - 1), levelSettings(level)];
    assert.ok(harder.badChance > easier.badChance);
    assert.ok(fallSpeed(level) > fallSpeed(level - 1));
    assert.ok(harder.spawn < easier.spawn);
  }
});

test("levels outside 1-4 use the nearest real level", () => {
  assert.deepEqual(levelSettings(0), levelSettings(1));
  assert.deepEqual(levelSettings(9), levelSettings(LEVEL_COUNT));
});

test("the finished levels round-trip through the saved row", () => {
  assert.equal(levelsDone(encodeLevels(2)), 2);
  assert.equal(levelsDone(null), 0);
  assert.equal(levelsDone(["9"]), LEVEL_COUNT);
  assert.equal(levelsDone(["x"]), 0);
});
