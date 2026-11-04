/** Google sign-in and page setup for the advent calendar. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { markDoor, showDoorContent, showDoorLoading } from "./door-view.js";
import { createDoorReader } from "./doors.js";
import { firebaseConfig } from "./firebase-config.js";
import { parseRoute } from "./lib/router.js";
import { createShell } from "./ui.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const doors = createDoorReader(getFirestore(app));
const showShell = createShell({ onDoorOpen: openDoor });
const element = (id) => document.getElementById(id);

/** Re-reads the door on every open so a door that unlocked since page load shows up. */
async function openDoor(number) {
  if (!auth.currentUser) return;
  showDoorLoading();
  const result = await doors.readDoor(number);
  markDoor(number, result.state);
  if (parseRoute(location.hash).door === number) showDoorContent(result);
}

async function loadDoorStates() {
  const results = await doors.readAllDoors();
  results.forEach((result, index) => markDoor(index + 1, result.state));
}

function showUser(user) {
  element("signed-out").hidden = Boolean(user);
  element("signed-in").hidden = !user;
  element("user-name").textContent = user?.displayName ?? "";
}

function showError(message) {
  const errorElement = element("auth-error");
  errorElement.textContent = message;
  errorElement.hidden = !message;
}

async function signIn() {
  showError("");
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    if (error.code !== "auth/popup-closed-by-user") {
      showError("Inloggningen misslyckades. Försök igen.");
    }
  }
}

element("sign-in-button").addEventListener("click", signIn);
element("sign-out-button").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, (user) => {
  showUser(user);
  showShell();
  if (user) loadDoorStates();
});
