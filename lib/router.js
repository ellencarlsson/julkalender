/** Maps location.hash to a view of the signed-in app. */
import { isValidDoor } from "./unlock-time.js";

export const VIEWS = ["overview", "door", "backpack", "admin"];
const OVERVIEW = { view: "overview" };

function parseDoor(param) {
  const door = Number(param);
  // String round-trip rejects forms like "01" or "1.0" so each door has one URL.
  return isValidDoor(door) && String(door) === param ? { view: "door", door } : OVERVIEW;
}

export function parseRoute(hash) {
  const [name, param, ...rest] = hash.replace(/^#\/?/, "").split("/");
  if (rest.length > 0) return OVERVIEW;
  if (name === "door") return parseDoor(param);
  if ((name === "backpack" || name === "admin") && param === undefined) return { view: name };
  return OVERVIEW;
}

export function doorHash(door) {
  return `#/door/${door}`;
}
