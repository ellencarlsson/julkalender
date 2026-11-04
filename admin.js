/** Admin-only tools: reset own progress. */
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { isAdmin } from "./lib/admin.js";

const element = (id) => document.getElementById(id);
const showStatus = (text) => (element("admin-status").textContent = text);

async function resetProgress(db, user) {
  if (!user || !confirm("Nollställa all din progress? Det går inte att ångra.")) return;
  try {
    await deleteDoc(doc(db, "users", user.uid));
    showStatus("Din progress är nollställd.");
  } catch (error) {
    showStatus(`Kunde inte nollställa: ${error.message}`);
  }
}

/** Wires the admin buttons once and returns a function to call on every auth change. */
export function createAdminPanel(db) {
  let currentUser = null;
  element("reset-button").addEventListener("click", () => resetProgress(db, currentUser));
  return (user) => {
    currentUser = user;
    element("admin-link").hidden = !isAdmin(user);
  };
}
