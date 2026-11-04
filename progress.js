/** Loads and saves the signed-in user's progress in users/{uid}. */
import { arrayUnion, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { completedTaskSet } from "./lib/progress.js";

export async function loadProgress(db, uid) {
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);
  const completed = completedTaskSet(snapshot.exists() ? snapshot.data() : null);
  return {
    isCompleted: (key) => completed.has(key),
    async complete(key) {
      // arrayUnion + merge so completing on two devices at once never drops a task.
      await setDoc(ref, { completedTasks: arrayUnion(key) }, { merge: true });
      completed.add(key);
    },
  };
}
