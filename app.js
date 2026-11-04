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
import { createAdminPanel } from "./admin.js";
import { firebaseConfig } from "./firebase-config.js";
import { createShell } from "./ui.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const showAdmin = createAdminPanel(getFirestore(app));
const showShell = createShell();
const element = (id) => document.getElementById(id);

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
  showAdmin(user);
  showShell(user);
});
