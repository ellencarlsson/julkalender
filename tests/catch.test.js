/** Tests for the catch game: landing in the bucket, bucket bounds, spawning and speed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUCKET_WIDTH, clampBucket, crossesRim, fallSpeed, isOverBucket, pickKind, spawnX } from "../lib/catch.js";

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

test("items start inside the tree's crown and fall faster as buns are caught", () => {
  assert.ok(spawnX(() => 0) > 0 && spawnX(() => 0.999) < 100);
  assert.ok(fallSpeed(10) > fallSpeed(0));
});
