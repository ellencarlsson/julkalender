/** Turns a door read into a state; Firestore rules (server time) decide locked vs open, never the device clock. */

export const DOOR_STATE = { OPEN: "open", EMPTY: "empty", LOCKED: "locked", ERROR: "error" };

const STATE_LABELS = {
  [DOOR_STATE.OPEN]: "öppen",
  [DOOR_STATE.EMPTY]: "öppen",
  [DOOR_STATE.LOCKED]: "låst",
  [DOOR_STATE.ERROR]: "kunde inte laddas",
};

/**
 * Reads one door and classifies the outcome.
 *
 * Args:
 *   readDoor: async function returning the door data, or null when no document exists.
 * Returns:
 *   { state, door? } where door is only set for an open door with content.
 */
export async function readDoorState(readDoor) {
  try {
    const door = await readDoor();
    return door ? { state: DOOR_STATE.OPEN, door } : { state: DOOR_STATE.EMPTY };
  } catch (error) {
    return { state: error?.code === "permission-denied" ? DOOR_STATE.LOCKED : DOOR_STATE.ERROR };
  }
}

export function doorLabel(number, state, completed = false) {
  if (completed) return `Lucka ${number}, klar`;
  return STATE_LABELS[state] ? `Lucka ${number}, ${STATE_LABELS[state]}` : `Lucka ${number}`;
}
