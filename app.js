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
import { markDoor, showDoorContent, showDoorLoading, showDoorXp } from "./door-view.js";
import { doorXp } from "./lib/level.js";
import { discardPendingCrossword } from "./crossword-view.js";
import { renderBackpack } from "./backpack-view.js";
import { createDoorReader } from "./doors.js";
import { hideFinalMessage, readFinalMessage, showFinalMessage } from "./final-message.js";
import { firebaseConfig } from "./firebase-config.js";
import { createHintTracker } from "./hint-tracker.js";
import { createLevelTracker } from "./level-tracker.js";
import { DOOR_STATE } from "./lib/door-state.js";
import { collectRewards } from "./lib/rewards.js";
import { parseRoute } from "./lib/router.js";
import { TEST_LOCKED_DOOR } from "./lib/test-door.js";
import { calendarTaskKeys, doorResetPlan } from "./lib/test-reset.js";
import { testButton } from "./test-tools.js";
import { loadProgress } from "./progress.js";
import { createLeaderboard } from "./leaderboard.js";
import { renderSideQuests } from "./sidequest-view.js";
import { readSideQuests } from "./sidequests.js";
import { createShell, hideLevelUp } from "./ui.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const doors = createDoorReader(db);
let progressReady = null;
const levels = createLevelTracker({
  onMaxLevel: () => readFinalMessage(db).then(showFinalMessage),
  onChange: (loadedDoors, progress) => {
    renderBackpack(progress && collectRewards(loadedDoors, progress));
    updateOpenDoorXp(loadedDoors, progress);
  },
});
const hints = createHintTracker();
const showShell = createShell({ onDoorOpen: openDoor, onSideQuestsOpen: openSideQuests });
const element = (id) => document.getElementById(id);

let loadedProgress = null;

function showSideQuestsIfOpen() {
  if (parseRoute(location.hash).view === "sidequests") openSideQuests();
}

function openSideQuests() {
  renderSideQuests(hints.sideQuests(), loadedProgress && withLevelUpdates(loadedProgress), resetSideQuests);
}

/** TEST_RESET_SIDEQUESTS: clears the signed-in user's own ticked side quests and shows the list fresh. */
async function resetSideQuests() {
  await loadedProgress.resetSideQuests();
  hints.refresh();
  openSideQuests();
}

/** Keeps the open door's XP beside its title in step with every task, word or digit completed. */
function updateOpenDoorXp(loadedDoors, progress) {
  const number = parseRoute(location.hash).door;
  const door = new Map(loadedDoors).get(number);
  if (progress && door) showDoorXp(doorXp(number, door, progress));
}

/** Starts loading progress; the no-op catch only silences "unhandled rejection" until a door awaits it. */
function startProgressLoad(uid) {
  const loading = loadProgress(db, uid);
  loading.then((progress) => {
    loadedProgress = progress;
    levels.setProgress(progress);
    hints.setProgress(progress);
    showSideQuestsIfOpen();
  }, () => {});
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
    async uncomplete(key) {
      await progress.uncomplete(key);
      levels.refresh();
    },
    async markWordsCorrect(keys) {
      await progress.markWordsCorrect(keys);
      levels.refresh({ celebrate: true });
    },
    // A saved sudoku can finish a digit, which is worth XP of its own.
    async saveCrossword(key, rows) {
      await progress.saveCrossword(key, rows);
      levels.refresh({ celebrate: true });
    },
    hintBalance: () => hints.balance(),
    async revealWord(key) {
      await progress.revealWord(key);
      hints.refresh();
      levels.refresh({ celebrate: true });
    },
    async useHint(key) {
      await progress.useHint(key);
      hints.refresh();
    },
    async completeSideQuest(id) {
      await progress.completeSideQuest(id);
      hints.refresh();
    },
    async uncompleteSideQuest(id) {
      await progress.uncompleteSideQuest(id);
      hints.refresh();
    },
  };
}

/** Shows the new level, hints and backpack after a test tool changed progress behind the views' backs. */
function refreshAfterTestTool() {
  hideLevelUp();
  levels.refresh();
  hints.refresh();
}

/** TEST_RESET_DOOR / TEST_COMPLETE_DOOR: clear or finish the signed-in user's own progress in one door. */
function doorTestTools(number, door, progress) {
  const tasks = doorResetPlan(number, door, []);
  const thenReopen = (change) => async () => {
    await change();
    refreshAfterTestTool();
    openDoor(number);
  };
  return {
    onReset: thenReopen(() => {
      tasks.crosswords.forEach(discardPendingCrossword);
      return progress.resetDoor(number, door);
    }),
    onComplete: thenReopen(() => progress.completeTasks(tasks.tasks)),
  };
}

/** TEST_RESET_CALENDAR: clears the signed-in user's progress in every door (side quests are kept). */
async function resetCalendar() {
  const [results, progress] = await Promise.all([doors.readAllDoors(), progressReady]);
  calendarTaskKeys(results).forEach(discardPendingCrossword);
  await progress.resetCalendar();
  refreshAfterTestTool();
}

/** TEST_COMPLETE_CALENDAR: marks every task in every readable door as done. */
async function completeCalendar() {
  const [results, progress] = await Promise.all([doors.readAllDoors(), progressReady]);
  await progress.completeTasks(calendarTaskKeys(results));
  refreshAfterTestTool();
}

function showCalendarTestTools() {
  element("calendar-tools").replaceChildren(
    testButton("Rensa hela kalendern", "Rensa din progress i alla luckor? Sidequests sparas. Bara för testning.", resetCalendar),
    testButton("Klara hela kalendern", "Klara alla uppgifter i alla luckor? Bara för testning.", completeCalendar),
  );
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
    const testTools = result.door && doorTestTools(number, result.door, progress);
    if (parseRoute(location.hash).door === number) showDoorContent(number, result, { ...withLevelUpdates(progress), leaderboard: createLeaderboard(db, user) }, testTools);
  } catch {
    progressReady = startProgressLoad(user.uid);
    if (parseRoute(location.hash).door === number) showDoorContent(number, { state: DOOR_STATE.ERROR });
  }
}

async function loadDoorStates() {
  const [results, testDoor] = await Promise.all([doors.readAllDoors(), doors.readDoor(TEST_LOCKED_DOOR)]);
  results.forEach((result, index) => markDoor(index + 1, result.state));
  markDoor(TEST_LOCKED_DOOR, testDoor.state);
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
  hideFinalMessage();
  levels.reset();
  hints.reset();
  loadedProgress = null;
  progressReady = user ? startProgressLoad(user.uid) : null;
  showShell();
  if (user) loadDoorStates();
  element("calendar-tools").replaceChildren();
  if (user) showCalendarTestTools();
  if (user) readSideQuests(db).then((quests) => {
    hints.setSideQuests(quests);
    showSideQuestsIfOpen();
  }, () => {});
});

// Lets the load-error fallback in index.html know the app started; errors after this point are not load failures.
document.documentElement.dataset.appReady = "true";
