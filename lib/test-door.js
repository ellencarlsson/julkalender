/** TEST_LOCKED_DOOR: temporary door that is always locked, even for the admin. Remove before the calendar is given away. */
import { isValidDoor } from "./unlock-time.js";

export const TEST_LOCKED_DOOR = 25;
export const TEST_LOCKED_DOOR_LABEL = "Testlucka – alltid låst";

/** Real doors 1-24 plus the test door; used where a door number may be shown or opened. */
export function isShownDoor(door) {
  return isValidDoor(door) || door === TEST_LOCKED_DOOR;
}
