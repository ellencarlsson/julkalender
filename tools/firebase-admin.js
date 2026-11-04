/** Firebase Admin setup for the terminal tools; bypasses security rules, so it must stay off the website. */
import { existsSync, readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";

export const PROJECT_ID = "julkalender-db633";
const KEY_FILE = new URL("./service-account.json", import.meta.url);

export function initAdmin() {
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? PROJECT_ID });
  if (!existsSync(KEY_FILE)) {
    throw new Error(
      "Missing tools/service-account.json. Download it from Firebase console → Project settings → " +
        "Service accounts → Generate new private key, and save it as tools/service-account.json.",
    );
  }
  return initializeApp({ credential: cert(JSON.parse(readFileSync(KEY_FILE, "utf8"))) });
}
