/** Loads and saves the signed-in user's progress in users/{uid}. */
import {
  FieldPath,
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { completedTaskSet, correctWordSet, savedCrosswords } from "./lib/progress.js";
import { doorResetPlan } from "./lib/test-reset.js";

// arrayUnion + merge so saving from two devices at once never drops an entry.
const addToList = (ref, field, items) => setDoc(ref, { [field]: arrayUnion(...items) }, { merge: true });

function taskMethods(ref, completed) {
  return {
    isCompleted: (key) => completed.has(key),
    async complete(key) {
      await addToList(ref, "completedTasks", [key]);
      completed.add(key);
    },
  };
}

function crosswordMethods(ref, crosswords, correctWords) {
  return {
    crosswordEntries: (key) => crosswords.get(key) ?? null,
    async saveCrossword(key, rows) {
      // Cached first so a crossword re-rendered while the write is in flight shows the latest letters.
      crosswords.set(key, rows);
      // merge replaces only this crossword inside the map, leaving other crosswords intact.
      await setDoc(ref, { crosswords: { [key]: rows } }, { merge: true });
    },
    isWordCorrect: (key) => correctWords.has(key),
    async markWordsCorrect(keys) {
      await addToList(ref, "correctWords", keys);
      keys.forEach((key) => correctWords.add(key));
    },
  };
}

/** TEST_RESET_DOOR: deletes one door's progress for the signed-in user. */
function resetMethod(ref, completed, crosswords, correctWords) {
  return async function resetDoor(number, door) {
    const plan = doorResetPlan(number, door, correctWords);
    const crosswordFields = plan.crosswords.flatMap((key) => [new FieldPath("crosswords", key), deleteField()]);
    try {
      await updateDoc(ref, "completedTasks", arrayRemove(...plan.tasks), "correctWords", arrayRemove(...plan.words), ...crosswordFields);
    } catch (error) {
      if (error?.code !== "not-found") throw error;
    }
    plan.tasks.forEach((key) => completed.delete(key));
    plan.words.forEach((key) => correctWords.delete(key));
    plan.crosswords.forEach((key) => crosswords.delete(key));
  };
}

export async function loadProgress(db, uid) {
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.exists() ? snapshot.data() : null;
  const [completed, crosswords, correctWords] = [completedTaskSet(data), savedCrosswords(data), correctWordSet(data)];
  return {
    ...taskMethods(ref, completed),
    ...crosswordMethods(ref, crosswords, correctWords),
    resetDoor: resetMethod(ref, completed, crosswords, correctWords),
  };
}
