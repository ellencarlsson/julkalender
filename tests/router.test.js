/** Tests for hash routing between the app's views. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { doorHash, parseRoute } from "../lib/router.js";

test("empty hash shows the door overview", () => {
  assert.deepEqual(parseRoute(""), { view: "overview" });
  assert.deepEqual(parseRoute("#/"), { view: "overview" });
});

test("door hash opens that door", () => {
  assert.deepEqual(parseRoute("#/door/1"), { view: "door", door: 1 });
  assert.deepEqual(parseRoute("#/door/24"), { view: "door", door: 24 });
});

test("invalid door numbers fall back to the overview", () => {
  for (const hash of ["#/door/0", "#/door/26", "#/door/abc", "#/door/", "#/door/01", "#/door/1.0", "#/door"]) {
    assert.deepEqual(parseRoute(hash), { view: "overview" }, hash);
  }
});

test("temporary test door 25 can be opened", () => {
  assert.deepEqual(parseRoute("#/door/25"), { view: "door", door: 25 });
});

test("backpack route", () => {
  assert.deepEqual(parseRoute("#/backpack"), { view: "backpack" });
});

test("unknown or overlong hashes fall back to the overview", () => {
  for (const hash of ["#/nope", "#/admin", "#/backpack/x", "#/door/1/extra", "#something"]) {
    assert.deepEqual(parseRoute(hash), { view: "overview" }, hash);
  }
});

test("doorHash round-trips through parseRoute", () => {
  for (let door = 1; door <= 24; door++) {
    assert.deepEqual(parseRoute(doorHash(door)), { view: "door", door });
  }
});

test("side quests route", () => {
  assert.deepEqual(parseRoute("#/sidequests"), { view: "sidequests" });
  assert.deepEqual(parseRoute("#/sidequests/x"), { view: "overview" });
});
