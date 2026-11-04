/** Tests for classifying door reads into locked/open states. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOOR_STATE, doorLabel, readDoorState } from "../lib/door-state.js";

const deny = async () => {
  throw Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
};

test("permission denied means the door is locked", async () => {
  assert.deepEqual(await readDoorState(deny), { state: DOOR_STATE.LOCKED });
});

test("a readable door with content is open and carries its data", async () => {
  const door = { door: 1, tasks: [] };
  assert.deepEqual(await readDoorState(async () => door), { state: DOOR_STATE.OPEN, door });
});

test("a readable door without a document is open but empty", async () => {
  assert.deepEqual(await readDoorState(async () => null), { state: DOOR_STATE.EMPTY });
});

test("other failures are errors, not locked", async () => {
  const offline = async () => {
    throw Object.assign(new Error("offline"), { code: "unavailable" });
  };
  assert.deepEqual(await readDoorState(offline), { state: DOOR_STATE.ERROR });
  assert.deepEqual(await readDoorState(async () => { throw new Error("boom"); }), { state: DOOR_STATE.ERROR });
});

test("door labels describe the state for screen readers", () => {
  assert.equal(doorLabel(5, DOOR_STATE.LOCKED), "Lucka 5, låst");
  assert.equal(doorLabel(5, DOOR_STATE.OPEN), "Lucka 5, öppen");
  assert.equal(doorLabel(5, DOOR_STATE.EMPTY), "Lucka 5, öppen");
  assert.equal(doorLabel(5, undefined), "Lucka 5");
});

test("door state never looks at the device clock", () => {
  const source = readFileSync(new URL("../lib/door-state.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Date|unlock-time/);
});
