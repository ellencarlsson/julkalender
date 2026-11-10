/** Tests for the browser-side admin check. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADMIN_EMAIL, isAdminUser } from "../lib/admin.js";

test("only the verified admin email is the admin", () => {
  assert.equal(isAdminUser({ email: ADMIN_EMAIL, emailVerified: true }), true);
  assert.equal(isAdminUser({ email: ADMIN_EMAIL, emailVerified: false }), false);
  assert.equal(isAdminUser({ email: "haris@example.com", emailVerified: true }), false);
  assert.equal(isAdminUser(null), false);
});

test("admin email matches firestore.rules", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.ok(rules.includes(`request.auth.token.email == "${ADMIN_EMAIL}"`));
});
