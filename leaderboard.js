/** Typing race attempts in leaderboards/{door}/results, one document per finished attempt. */
import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { isEllen } from "./lib/typing.js";

/**
 * Leaderboard access for the signed-in user.
 *
 * Returns:
 *   { uid, name, isEllen, load(door), save(door, timeMs) }; load gives [{ id, uid, name, timeMs, ellen }].
 */
export function createLeaderboard(db, user) {
  const results = (door) => collection(db, "leaderboards", String(door), "results");
  const name = user.displayName || "Anonym";
  return {
    uid: user.uid,
    name,
    isEllen: isEllen(user),
    async load(door) {
      const snapshot = await getDocs(results(door));
      return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    },
    async save(door, timeMs) {
      await addDoc(results(door), { uid: user.uid, name, timeMs, ellen: isEllen(user), createdAt: serverTimestamp() });
    },
  };
}
