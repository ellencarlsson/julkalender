/** Who counts as the admin in the browser; must match isAdmin() in firestore.rules. */

export const ADMIN_EMAIL = "carlssonellen@live.sse";

export function isAdminUser(user) {
  return Boolean(user && user.email === ADMIN_EMAIL && user.emailVerified);
}
