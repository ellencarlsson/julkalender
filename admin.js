/** Admin-only tools: upload door content and reset own progress. */
import { deleteDoc, doc, writeBatch } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { isAdmin } from "./lib/admin.js";
import { parseContentFiles, prepareDoor, prepareFinal } from "./lib/content.js";

const element = (id) => document.getElementById(id);
const showStatus = (text) => (element("admin-status").textContent = text);

function readFiles(fileList) {
  return Promise.all([...fileList].map(async (file) => ({ name: file.name, text: await file.text() })));
}

/** One batch so a failed upload never leaves half the doors updated. */
async function writeContent(db, { doors, final }) {
  const batch = writeBatch(db);
  for (const source of doors) {
    batch.set(doc(db, "doors", String(source.door)), await prepareDoor(source));
  }
  if (final) batch.set(doc(db, "final", "message"), prepareFinal(final));
  await batch.commit();
}

function uploadSummary({ doors, final }) {
  const parts = doors.map((source) => source.door).sort((a, b) => a - b).map((number) => `lucka ${number}`);
  if (final) parts.push("slutmeddelandet");
  return `Uppladdat: ${parts.join(", ")}.`;
}

async function uploadContent(db) {
  const { files } = element("content-files");
  if (files.length === 0) return showStatus("Välj en eller flera JSON-filer först.");
  const content = parseContentFiles(await readFiles(files));
  if (content.errors.length > 0) return showStatus(["Inget laddades upp:", ...content.errors].join("\n"));
  showStatus("Laddar upp…");
  try {
    await writeContent(db, content);
    showStatus(uploadSummary(content));
  } catch (error) {
    showStatus(`Uppladdningen misslyckades: ${error.message}`);
  }
}

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
  element("upload-button").addEventListener("click", () => uploadContent(db));
  element("reset-button").addEventListener("click", () => resetProgress(db, currentUser));
  return (user) => {
    currentUser = user;
    element("admin-link").hidden = !isAdmin(user);
  };
}
