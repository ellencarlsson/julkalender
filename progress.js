/** Loads and saves the signed-in user's progress in users/{uid}. */
import { arrayUnion, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { completedTaskSet, savedCrosswords } from "./lib/progress.js";

export async function loadProgress(db, uid) {
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.exists() ? snapshot.data() : null;
  const completed = completedTaskSet(data);
  const crosswords = savedCrosswords(data);
  return {
    isCompleted: (key) => completed.has(key),
    async complete(key) {
      // arrayUnion + merge so completing on two devices at once never drops a task.
      await setDoc(ref, { completedTasks: arrayUnion(key) }, { merge: true });
      completed.add(key);
    },
    crosswordEntries: (key) => crosswords.get(key) ?? null,
    async saveCrossword(key, rows) {
      // merge replaces only this crossword inside the map, leaving other crosswords intact.
      await setDoc(ref, { crosswords: { [key]: rows } }, { merge: true });
      crosswords.set(key, rows);
    },
  };
}
