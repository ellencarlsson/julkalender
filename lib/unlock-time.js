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

const SWEDISH_DAY_MONTH = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", day: "numeric", month: "long" });
const SWEDISH_TIME = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" });

/** Display text only; whether a door is open is decided by Firestore, not by this. */
export function unlockLabel(door) {
  const time = doorUnlockTime(door);
  return `Öppnas ${SWEDISH_DAY_MONTH.format(time)} kl. ${SWEDISH_TIME.format(time)}`;
}
