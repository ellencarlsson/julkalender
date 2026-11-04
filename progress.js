/** Loads and saves the signed-in user's progress in users/{uid}. */
import { arrayUnion, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { completedTaskSet, correctWordSet, savedCrosswords } from "./lib/progress.js";

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
      // merge replaces only this crossword inside the map, leaving other crosswords intact.
      await setDoc(ref, { crosswords: { [key]: rows } }, { merge: true });
      crosswords.set(key, rows);
    },
    isWordCorrect: (key) => correctWords.has(key),
    async markWordsCorrect(keys) {
      await addToList(ref, "correctWords", keys);
      keys.forEach((key) => correctWords.add(key));
    },
  };
}

export async function loadProgress(db, uid) {
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.exists() ? snapshot.data() : null;
  return {
    ...taskMethods(ref, completedTaskSet(data)),
    ...crosswordMethods(ref, savedCrosswords(data), correctWordSet(data)),
  };
}
