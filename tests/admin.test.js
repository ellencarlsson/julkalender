/** Tests for the admin check and its sync with firestore.rules. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADMIN_EMAIL, isAdmin } from "../lib/admin.js";

test("verified admin email is admin", () => {
  assert.equal(isAdmin({ email: ADMIN_EMAIL, emailVerified: true }), true);
});

test("unverified admin email is not admin", () => {
  assert.equal(isAdmin({ email: ADMIN_EMAIL, emailVerified: false }), false);
});

test("other emails and signed-out users are not admin", () => {
  assert.equal(isAdmin({ email: "friend@example.com", emailVerified: true }), false);
  assert.equal(isAdmin(null), false);
});

test("firestore.rules uses the same admin email", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.ok(rules.includes(`request.auth.token.email == "${ADMIN_EMAIL}"`));
});
