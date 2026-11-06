/** Typing race results in leaderboards/{door}/results/{uid}, readable by every signed-in player. */
import { collection, doc, getDocs, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { isEllen } from "./lib/typing.js";

/**
 * Leaderboard access for the signed-in user.
 *
 * Returns:
 *   { uid, name, isEllen, load(door), save(door, timeMs) }; load gives [{ uid, name, timeMs, ellen }].
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
      return snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() }));
    },
    async save(door, timeMs) {
      const entry = { name, timeMs, ellen: isEllen(user), updatedAt: serverTimestamp() };
      await setDoc(doc(results(door), user.uid), entry);
    },
  };
}
