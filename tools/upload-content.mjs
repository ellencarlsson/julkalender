/** Uploads door JSON files and the final message to Firestore: node tools/upload-content.mjs content/*.json */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { getFirestore } from "firebase-admin/firestore";
import { parseContentFiles, toDoorDocument, toFinalDocument } from "./content.js";
import { initAdmin } from "./firebase-admin.js";

function readFiles(paths) {
  return paths.map((path) => ({ name: basename(path), text: readFileSync(path, "utf8") }));
}

/** One batch so a failed upload never leaves half the doors updated. */
async function writeContent(db, { doors, final }) {
  const batch = db.batch();
  for (const source of doors) batch.set(db.doc(`doors/${source.door}`), toDoorDocument(source));
  if (final) batch.set(db.doc("final/message"), toFinalDocument(final));
  await batch.commit();
}

function summary({ doors, final }) {
  const parts = doors.map((source) => source.door).sort((a, b) => a - b).map((door) => `door ${door}`);
  if (final) parts.push("final message");
  return `Uploaded: ${parts.join(", ")}.`;
}

async function main(paths) {
  if (paths.length === 0) throw new Error("Usage: node tools/upload-content.mjs <file.json> [...]");
  const content = parseContentFiles(readFiles(paths));
  if (content.errors.length > 0) throw new Error(["Nothing uploaded:", ...content.errors].join("\n  "));
  await writeContent(getFirestore(initAdmin()), content);
  console.log(summary(content));
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
