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
  for (const hash of ["#/door/0", "#/door/25", "#/door/abc", "#/door/", "#/door/01", "#/door/1.0", "#/door"]) {
    assert.deepEqual(parseRoute(hash), { view: "overview" }, hash);
  }
});

test("backpack and admin routes", () => {
  assert.deepEqual(parseRoute("#/backpack"), { view: "backpack" });
  assert.deepEqual(parseRoute("#/admin"), { view: "admin" });
});

test("unknown or overlong hashes fall back to the overview", () => {
  for (const hash of ["#/nope", "#/backpack/x", "#/door/1/extra", "#something"]) {
    assert.deepEqual(parseRoute(hash), { view: "overview" }, hash);
  }
});

test("doorHash round-trips through parseRoute", () => {
  for (let door = 1; door <= 24; door++) {
    assert.deepEqual(parseRoute(doorHash(door)), { view: "door", door });
  }
});
