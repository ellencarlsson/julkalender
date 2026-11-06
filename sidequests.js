/** Reads the side quests; before December 1 the rules deny reading for everyone but the admin. */
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

export async function readSideQuests(db) {
  try {
    const snapshot = await getDocs(collection(db, "sidequests"));
    return snapshot.docs.map((doc) => doc.data()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    if (error?.code === "permission-denied") return [];
    throw error;
  }
}
