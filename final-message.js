/** The final message from Ellen, shown above the door grid once level 24 is reached. */
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const element = (id) => document.getElementById(id);

/** Returns the message text, or null when it is missing or not readable yet (before Dec 24). */
export async function readFinalMessage(db) {
  try {
    const snapshot = await getDoc(doc(db, "final", "message"));
    return snapshot.exists() ? snapshot.data().text ?? null : null;
  } catch {
    return null;
  }
}

export function showFinalMessage(text) {
  element("final-message-text").textContent = text ?? "";
  element("final-message").hidden = !text;
}

export function hideFinalMessage() {
  showFinalMessage(null);
}
