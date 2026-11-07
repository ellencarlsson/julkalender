/** Removes one door's content from Firestore, so it shows as not ready yet: node tools/remove-door.mjs <number> */
import { getFirestore } from "firebase-admin/firestore";
import { isValidDoor } from "../lib/unlock-time.js";
import { initAdmin } from "./firebase-admin.js";

async function main([arg]) {
  const number = Number(arg);
  if (!isValidDoor(number)) throw new Error("Usage: node tools/remove-door.mjs <door number 1-24>");
  const door = getFirestore(initAdmin()).doc(`doors/${number}`);
  const existed = (await door.get()).exists;
  await door.delete();
  console.log(existed ? `Removed: door ${number}.` : `Door ${number} had no content.`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
