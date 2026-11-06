/** Validates door and final-message JSON before it is uploaded to Firestore. */
import { DOOR_COUNT, isValidDoor } from "../lib/unlock-time.js";

const BLOCK = "#";
const SPACE = " ";
const DIRECTIONS = ["across", "down"];

const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isNonEmptyStringList = (value) => Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);

function gridCells(grid) {
  return grid.map((row) => [...row.normalize("NFC")]);
}

const isLetter = (cells, r, c) => /^\p{L}$/u.test(cells[r]?.[c] ?? "");

/** A gap is only valid inside a word: letters (or further gaps leading to letters) on both sides. */
function isInsideWord(cells, r, c) {
  const reaches = (dr, dc) => {
    let [rr, cc] = [r + dr, c + dc];
    while (cells[rr]?.[cc] === SPACE) [rr, cc] = [rr + dr, cc + dc];
    return isLetter(cells, rr, cc);
  };
  return (reaches(0, -1) && reaches(0, 1)) || (reaches(-1, 0) && reaches(1, 0));
}

function validateQuiz(task) {
  const errors = [];
  if (!isNonEmptyString(task.question)) errors.push("question must be a non-empty string");
  if (!isNonEmptyStringList(task.answers)) errors.push("answers must be a non-empty list of strings");
  return errors;
}

function validateChallenge(task) {
  return isNonEmptyString(task.description) ? [] : ["description must be a non-empty string"];
}

function validateGrid(grid) {
  if (!isNonEmptyStringList(grid)) return ["grid must be a non-empty list of rows"];
  const cells = gridCells(grid);
  const errors = [];
  if (cells.some((row) => row.length !== cells[0].length)) errors.push("grid rows must all have the same length");
  if (cells.flat().some((cell) => cell !== BLOCK && cell !== SPACE && !/^\p{L}$/u.test(cell))) {
    errors.push(`grid may only contain letters, spaces and ${BLOCK}`);
  }
  if (errors.length === 0 && cells.some((row, r) => row.some((cell, c) => cell === SPACE && !isInsideWord(cells, r, c)))) {
    errors.push("a space must sit between two letters of the same word");
  }
  return errors;
}

function validateClue(clue, index, cells) {
  const where = `clues[${index}]`;
  if (!isPlainObject(clue)) return [`${where} must be an object`];
  const errors = [];
  if (!Number.isInteger(clue.number) || clue.number < 1) errors.push(`${where}.number must be a positive integer`);
  if (!DIRECTIONS.includes(clue.direction)) errors.push(`${where}.direction must be "across" or "down"`);
  if (!isNonEmptyString(clue.text)) errors.push(`${where}.text must be a non-empty string`);
  const cell = cells[clue.row]?.[clue.col];
  if (!Number.isInteger(clue.row) || !Number.isInteger(clue.col) || cell === undefined || cell === BLOCK || cell === SPACE) {
    errors.push(`${where}: row/col must point at a letter cell in grid`);
  }
  return errors;
}

function validateCrossword(task) {
  const errors = validateGrid(task.grid);
  if (!Array.isArray(task.clues) || task.clues.length === 0) return [...errors, "clues must be a non-empty list"];
  if (errors.length > 0) return errors;
  const cells = gridCells(task.grid);
  return task.clues.flatMap((clue, index) => validateClue(clue, index, cells));
}

const IMAGE_SIDE = /^images\/[\w.-]+\.(jpe?g|png|webp|gif)$/i;

function validateSide(side, where) {
  if (!isPlainObject(side)) return [`${where} must be an object`];
  const hasText = isNonEmptyString(side.text);
  const hasImage = isNonEmptyString(side.image) && IMAGE_SIDE.test(side.image);
  if (hasText === hasImage) return [`${where} must have either text or an image like images/name.jpg`];
  return [];
}

function validateMatching(task) {
  if (!Array.isArray(task.pairs) || task.pairs.length < 2) return ["pairs must be a list of at least 2 pairs"];
  return task.pairs.flatMap((pair, index) =>
    isPlainObject(pair)
      ? [...validateSide(pair.item, `pairs[${index}].item`), ...validateSide(pair.target, `pairs[${index}].target`)]
      : [`pairs[${index}] must be an object`],
  );
}

const TASK_VALIDATORS = { quiz: validateQuiz, challenge: validateChallenge, crossword: validateCrossword, matching: validateMatching };
export const TASK_TYPES = Object.keys(TASK_VALIDATORS);

const IMAGE_PATH = /^images\/[\w.-]+\.(jpe?g|png|webp|gif)$/i;

function validateImage(task) {
  if (task.image === undefined) return task.alt === undefined ? [] : ["alt requires image"];
  const errors = IMAGE_PATH.test(task.image) ? [] : ["image must be a path like images/name.jpg"];
  if (task.alt !== undefined && !isNonEmptyString(task.alt)) errors.push("alt must be a non-empty string");
  return errors;
}

function validateTaskCommon(task) {
  const errors = [];
  if (!isNonEmptyString(task.id)) errors.push("id must be a non-empty string");
  if (task.weight !== undefined && !(Number.isFinite(task.weight) && task.weight > 0)) {
    errors.push("weight must be a positive number");
  }
  if (task.clue !== undefined && !isNonEmptyString(task.clue)) errors.push("clue must be a non-empty string");
  return [...errors, ...validateImage(task)];
}

function validateTask(task, index) {
  const where = `tasks[${index}]`;
  if (!isPlainObject(task)) return [`${where} must be an object`];
  const validator = TASK_VALIDATORS[task.type];
  const typeErrors = validator ? validator(task) : [`type must be one of: ${TASK_TYPES.join(", ")}`];
  return [...validateTaskCommon(task), ...typeErrors].map((error) => `${where}.${error}`);
}

function duplicateIdErrors(tasks) {
  const ids = tasks.map((task) => task?.id).filter(isNonEmptyString);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  return duplicates.map((id) => `task id "${id}" is used more than once`);
}

export function validateDoor(source) {
  if (!isPlainObject(source)) return ["door must be a JSON object"];
  const errors = [];
  if (!isValidDoor(source.door)) errors.push(`door must be an integer 1-${DOOR_COUNT}`);
  if (source.title !== undefined && typeof source.title !== "string") errors.push("title must be a string");
  if (!Array.isArray(source.tasks) || source.tasks.length === 0) {
    return [...errors, "tasks must be a non-empty list"];
  }
  return [...errors, ...source.tasks.flatMap(validateTask), ...duplicateIdErrors(source.tasks)];
}

export function validateFinal(source) {
  return isPlainObject(source) && isNonEmptyString(source.message) ? [] : ["message must be a non-empty string"];
}

const SIDE_QUEST_ID = /^[a-z0-9-]+$/;

function validateSideQuest(quest, index) {
  const where = `sidequests[${index}]`;
  if (!isPlainObject(quest)) return [`${where} must be an object`];
  const errors = [];
  if (!isNonEmptyString(quest.id) || !SIDE_QUEST_ID.test(quest.id)) errors.push(`${where}.id must use only a-z, 0-9 and -`);
  if (!isNonEmptyString(quest.text)) errors.push(`${where}.text must be a non-empty string`);
  if (quest.reward !== undefined && !(Number.isInteger(quest.reward) && quest.reward > 0)) {
    errors.push(`${where}.reward must be a positive whole number`);
  }
  return errors;
}

export function validateSideQuests(source) {
  if (!Array.isArray(source?.sidequests)) return ["sidequests must be a list"];
  const errors = source.sidequests.flatMap(validateSideQuest);
  const ids = source.sidequests.map((quest) => quest?.id);
  const duplicates = [...new Set(ids.filter((id, index) => id && ids.indexOf(id) !== index))];
  return [...errors, ...duplicates.map((id) => `side quest id "${id}" is used more than once`)];
}

export function toSideQuestDocument(quest, order) {
  return { id: quest.id, text: quest.text, reward: quest.reward ?? 1, order };
}

function parseEntry({ name, text }) {
  try {
    return { name, source: JSON.parse(text) };
  } catch {
    return { name, error: `${name}: not valid JSON` };
  }
}

function entryKind(source) {
  if (isPlainObject(source) && "message" in source) return "final";
  if (isPlainObject(source) && "sidequests" in source) return "sidequests";
  return "door";
}

const VALIDATORS = { final: validateFinal, sidequests: validateSideQuests, door: validateDoor };

function addEntry(content, { name, source }) {
  const kind = entryKind(source);
  const errors = VALIDATORS[kind](source).map((error) => `${name}: ${error}`);
  content.errors.push(...errors);
  if (kind === "final") content.finals.push(source);
  else if (kind === "sidequests") content.sideQuestFiles.push(source);
  else if (errors.length === 0) content.doors.push(source);
}

function batchErrors({ doors, finals, sideQuestFiles }) {
  const numbers = doors.map((source) => source.door);
  const duplicates = [...new Set(numbers.filter((number, index) => numbers.indexOf(number) !== index))];
  const errors = duplicates.map((number) => `door ${number} is in more than one file`);
  if (finals.length > 1) errors.push("more than one file contains a final message");
  if (sideQuestFiles.length > 1) errors.push("more than one file contains side quests");
  return errors;
}

/**
 * Parses and validates a batch of content files.
 *
 * Args:
 *   files: list of { name, text } with the raw file contents.
 * Returns:
 *   { errors, doors, final, sideQuests } where doors are valid door objects, final is the final-message
 *   object or null, and sideQuests is the list from a sidequests file or null when none was given.
 */
export function parseContentFiles(files) {
  const content = { errors: [], doors: [], finals: [], sideQuestFiles: [] };
  for (const entry of files.map(parseEntry)) {
    if (entry.error) content.errors.push(entry.error);
    else addEntry(content, entry);
  }
  content.errors.push(...batchErrors(content));
  const sideQuests = content.sideQuestFiles[0]?.sidequests ?? null;
  return { errors: content.errors, doors: content.doors, final: content.finals[0] ?? null, sideQuests };
}

export function toDoorDocument(source) {
  return { door: source.door, title: source.title ?? "", tasks: source.tasks };
}

export function toFinalDocument(source) {
  return { text: source.message };
}
