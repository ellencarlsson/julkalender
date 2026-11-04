/** Door unlock times; must match the schedule enforced in firestore.rules. */

export const CALENDAR_YEAR = 2026;
export const DOOR_COUNT = 24;
// 07:00 Europe/Stockholm in December (CET, UTC+1) is 06:00 UTC.
export const UNLOCK_HOUR_UTC = 6;

export function isValidDoor(door) {
  return Number.isInteger(door) && door >= 1 && door <= DOOR_COUNT;
}

export function doorUnlockTime(door) {
  if (!isValidDoor(door)) {
    throw new RangeError(`Door must be an integer 1-${DOOR_COUNT}, got ${door}`);
  }
  return new Date(Date.UTC(CALENDAR_YEAR, 11, door, UNLOCK_HOUR_UTC));
}

export function isDoorUnlocked(door, now) {
  return now.getTime() >= doorUnlockTime(door).getTime();
}

export function finalMessageUnlockTime() {
  return doorUnlockTime(DOOR_COUNT);
}
