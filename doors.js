/** Reads door documents from Firestore. */
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { readDoorState } from "./lib/door-state.js";
import { DOOR_COUNT } from "./lib/unlock-time.js";

export function createDoorReader(db) {
  const readDoor = (number) =>
    readDoorState(async () => {
      const snapshot = await getDoc(doc(db, "doors", String(number)));
      return snapshot.exists() ? snapshot.data() : null;
    });
  const readAllDoors = () => Promise.all(Array.from({ length: DOOR_COUNT }, (_, index) => readDoor(index + 1)));
  return { readDoor, readAllDoors };
}
