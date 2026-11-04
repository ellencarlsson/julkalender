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
import { createLevelTracker } from "./level-tracker.js";
import { DOOR_STATE } from "./lib/door-state.js";
import { parseRoute } from "./lib/router.js";
import { loadProgress } from "./progress.js";
import { createShell } from "./ui.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const doors = createDoorReader(db);
let progressReady = null;
const levels = createLevelTracker();
const showShell = createShell({ onDoorOpen: openDoor });
const element = (id) => document.getElementById(id);

/** Starts loading progress; the no-op catch only silences "unhandled rejection" until a door awaits it. */
function startProgressLoad(uid) {
  const loading = loadProgress(db, uid);
  loading.then(levels.setProgress, () => {});
  return loading;
}

/** Wraps progress so completing a task updates the level ring and can celebrate a level-up. */
function withLevelUpdates(progress) {
  return {
    ...progress,
    async complete(key) {
      await progress.complete(key);
      levels.refresh({ celebrate: true });
    },
  };
}

/** Re-reads the door on every open so a door that unlocked since page load shows up. */
async function openDoor(number) {
  const user = auth.currentUser;
  if (!user || !progressReady) return;
  showDoorLoading();
  try {
    const [result, progress] = await Promise.all([doors.readDoor(number), progressReady]);
    markDoor(number, result.state);
    levels.setDoor(number, result);
    if (parseRoute(location.hash).door === number) showDoorContent(number, result, withLevelUpdates(progress));
  } catch {
    progressReady = startProgressLoad(user.uid);
    if (parseRoute(location.hash).door === number) showDoorContent(number, { state: DOOR_STATE.ERROR });
  }
}

async function loadDoorStates() {
  const results = await doors.readAllDoors();
  results.forEach((result, index) => markDoor(index + 1, result.state));
  levels.setAllDoors(results);
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
  levels.reset();
  progressReady = user ? startProgressLoad(user.uid) : null;
  showShell();
  if (user) loadDoorStates();
});
