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
import { completedSideQuestSet, completedTaskSet, correctWordSet, revealedWordSet, savedCrosswords, usedHintSet } from "./lib/progress.js";
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

function hintMethods(ref, completedSideQuests, revealedWords, correctWords, usedHints) {
  return {
    isHintUsed: (key) => usedHints.has(key),
    usedHintKeys: () => [...usedHints],
    async useHint(key) {
      await addToList(ref, "usedHints", [key]);
      usedHints.add(key);
    },
    isSideQuestCompleted: (id) => completedSideQuests.has(id),
    async completeSideQuest(id) {
      await addToList(ref, "completedSideQuests", [id]);
      completedSideQuests.add(id);
    },
    completedSideQuestIds: () => [...completedSideQuests],
    revealedWordKeys: () => [...revealedWords],
    isWordRevealed: (key) => revealedWords.has(key),
    /** A revealed word costs one hint point and counts as a correct word for XP. */
    async revealWord(key) {
      await setDoc(ref, { revealedWords: arrayUnion(key), correctWords: arrayUnion(key) }, { merge: true });
      revealedWords.add(key);
      correctWords.add(key);
    },
  };
}

/** TEST_RESET_DOOR: deletes one door's progress for the signed-in user. */
function resetMethod(ref, completed, crosswords, correctWords, revealed, usedHints) {
  return async function resetDoor(number, door) {
    const plan = doorResetPlan(number, door, correctWords);
    // Words revealed in this door are refunded too, so the door can be replayed with the same hints.
    const refunded = doorResetPlan(number, door, revealed).words;
    const crosswordFields = plan.crosswords.flatMap((key) => [new FieldPath("crosswords", key), deleteField()]);
    try {
      await updateDoc(ref, "completedTasks", arrayRemove(...plan.tasks), "correctWords", arrayRemove(...plan.words),
        "revealedWords", arrayRemove(...refunded), "usedHints", arrayRemove(...plan.tasks), ...crosswordFields);
    } catch (error) {
      if (error?.code !== "not-found") throw error;
    }
    plan.tasks.forEach((key) => completed.delete(key));
    plan.words.forEach((key) => correctWords.delete(key));
    plan.crosswords.forEach((key) => crosswords.delete(key));
    refunded.forEach((key) => revealed.delete(key));
    plan.tasks.forEach((key) => usedHints.delete(key));
  };
}

export async function loadProgress(db, uid) {
  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.exists() ? snapshot.data() : null;
  const [completed, crosswords, correctWords] = [completedTaskSet(data), savedCrosswords(data), correctWordSet(data)];
  const [sideQuests, revealed, usedHints] = [completedSideQuestSet(data), revealedWordSet(data), usedHintSet(data)];
  return {
    ...taskMethods(ref, completed),
    ...crosswordMethods(ref, crosswords, correctWords),
    ...hintMethods(ref, sideQuests, revealed, correctWords, usedHints),
    resetDoor: resetMethod(ref, completed, crosswords, correctWords, revealed, usedHints),
  };
}
