/** Tests for picture hotspot hit testing. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { areaAt, hotspotAreas, isInArea, tapPercent } from "../lib/hotspot.js";

const tower = { x: 60, y: 10, width: 10, height: 30 };

test("a tap inside the area is a hit, edges included", () => {
  assert.equal(isInArea({ x: 65, y: 20 }, tower), true);
  assert.equal(isInArea({ x: 60, y: 10 }, tower), true);
  assert.equal(isInArea({ x: 70, y: 40 }, tower), true);
});

test("a tap outside the area is a miss", () => {
  assert.equal(isInArea({ x: 59.9, y: 20 }, tower), false);
  assert.equal(isInArea({ x: 65, y: 41 }, tower), false);
  assert.equal(isInArea({ x: 10, y: 90 }, tower), false);
});

test("the same spot on a small and a big picture gives the same percent", () => {
  const small = tapPercent(130, 60, { left: 100, top: 50, width: 200, height: 100 });
  const big = tapPercent(160, 70, { left: 100, top: 50, width: 400, height: 200 });
  assert.deepEqual(small, { x: 15, y: 10 });
  assert.deepEqual(big, small);
  assert.equal(isInArea(small, { x: 10, y: 5, width: 10, height: 10 }), true);
});

test("a task with one area or a list of areas gives the areas to find", () => {
  assert.deepEqual(hotspotAreas({ area: tower }), [tower]);
  assert.deepEqual(hotspotAreas({ areas: [tower, tower] }), [tower, tower]);
});

test("a tap finds the area it lands in, or -1 for a miss", () => {
  const hats = [{ x: 10, y: 10, width: 5, height: 5 }, { x: 50, y: 50, width: 10, height: 10 }];
  assert.equal(areaAt({ x: 55, y: 55 }, hats), 1);
  assert.equal(areaAt({ x: 12, y: 12 }, hats), 0);
  assert.equal(areaAt({ x: 30, y: 30 }, hats), -1);
});
