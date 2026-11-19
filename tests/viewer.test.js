/** Tests for the read-only viewer accounts in firestore.rules. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const block = (start) => rules.slice(rules.indexOf(start), rules.indexOf("\n    }", rules.indexOf(start)));

test("Ida is a verified viewer", () => {
  const viewer = block("function isViewer()");
  assert.ok(viewer.includes('"idaa.ryberg@gmail.com"'));
  assert.ok(viewer.includes("email_verified == true"));
});

test("viewers can read all doors and side quests but never write", () => {
  for (const match of ["match /doors/{door}", "match /sidequests/{quest}"]) {
    const rule = block(match);
    assert.match(rule, /allow read: if[^;]*isViewer\(\)/);
    assert.doesNotMatch(rule, /allow write: if[^;]*isViewer\(\)/);
  }
});
