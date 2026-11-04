/** Deletes one user's progress: node tools/reset-progress.mjs <email-or-uid> */
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "./firebase-admin.js";

async function resolveUid(app, emailOrUid) {
  if (!emailOrUid.includes("@")) return emailOrUid;
  return (await getAuth(app).getUserByEmail(emailOrUid)).uid;
}

async function main([emailOrUid]) {
  if (!emailOrUid) throw new Error("Usage: node tools/reset-progress.mjs <email-or-uid>");
  const app = initAdmin();
  const uid = await resolveUid(app, emailOrUid);
  const progress = getFirestore(app).doc(`users/${uid}`);
  const existed = (await progress.get()).exists;
  await progress.delete();
  console.log(existed ? `Progress reset for ${emailOrUid} (${uid}).` : `No progress found for ${emailOrUid} (${uid}).`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
