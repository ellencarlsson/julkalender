/** Who counts as admin; the same email is enforced in firestore.rules. */

export const ADMIN_EMAIL = "carlssonellen@live.se";

export function isAdmin(user) {
  return Boolean(user?.emailVerified) && user.email === ADMIN_EMAIL;
}
