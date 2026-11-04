/** Validates readable door content and turns it into Firestore documents with hashed answers. */
import { DOOR_COUNT, isValidDoor } from "./unlock-time.js";

const BLOCK = "#";
const DIRECTIONS = ["across", "down"];

const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isNonEmptyStringList = (value) => Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);

export function normalizeAnswer(answer) {
  // NFC so a decomposed "ä" (a + combining dots) matches a typed one.
  return answer.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Salted with the task id so equal answers in different tasks get different hashes. */
export async function hashAnswer(taskId, answer) {
  const bytes = new TextEncoder().encode(`${taskId}:${normalizeAnswer(answer)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function gridCells(grid) {
  return grid.map((row) => [...row.normalize("NFC")]);
}

/** Whole-grid string that gets hashed; per-cell hashes of single letters would be trivial to brute-force. */
export function crosswordSolution(grid) {
  return normalizeAnswer(gridCells(grid).map((cells) => cells.join("")).join("/"));
}

export function crosswordLayout(grid) {
  return gridCells(grid).map((cells) => cells.map((cell) => (cell === BLOCK ? BLOCK : ".")).join(""));
}

function validateQuiz(task) {
  const errors = [];
  if (!isNonEmptyString(task.question)) errors.push("question måste vara en icke-tom text");
  if (!isNonEmptyStringList(task.answers)) errors.push("answers måste vara en icke-tom lista med texter");
  return errors;
}

function validateChallenge(task) {
  return isNonEmptyString(task.description) ? [] : ["description måste vara en icke-tom text"];
}

function validateGrid(grid) {
  if (!isNonEmptyStringList(grid)) return ["grid måste vara en icke-tom lista med rader"];
  const cells = gridCells(grid);
  const errors = [];
  if (cells.some((row) => row.length !== cells[0].length)) errors.push("grid: alla rader måste vara lika långa");
  if (cells.flat().some((cell) => cell !== BLOCK && !/^\p{L}$/u.test(cell))) {
    errors.push(`grid får bara innehålla bokstäver och ${BLOCK}`);
  }
  if (cells.flat().every((cell) => cell === BLOCK)) errors.push("grid måste innehålla minst en bokstav");
  return errors;
}

function validateClue(clue, index, cells) {
  const where = `clues[${index}]`;
  if (!isPlainObject(clue)) return [`${where} måste vara ett objekt`];
  const errors = [];
  if (!Number.isInteger(clue.number) || clue.number < 1) errors.push(`${where}.number måste vara ett positivt heltal`);
  if (!DIRECTIONS.includes(clue.direction)) errors.push(`${where}.direction måste vara "across" eller "down"`);
  if (!isNonEmptyString(clue.text)) errors.push(`${where}.text måste vara en icke-tom text`);
  const cell = cells[clue.row]?.[clue.col];
  if (!Number.isInteger(clue.row) || !Number.isInteger(clue.col) || cell === undefined || cell === BLOCK) {
    errors.push(`${where}: row/col måste peka på en bokstavsruta i grid`);
  }
  return errors;
}

function validateCrossword(task) {
  const errors = validateGrid(task.grid);
  if (!Array.isArray(task.clues) || task.clues.length === 0) return [...errors, "clues måste vara en icke-tom lista"];
  if (errors.length > 0) return errors;
  const cells = gridCells(task.grid);
  return task.clues.flatMap((clue, index) => validateClue(clue, index, cells));
}

const TASK_VALIDATORS = { quiz: validateQuiz, challenge: validateChallenge, crossword: validateCrossword };
export const TASK_TYPES = Object.keys(TASK_VALIDATORS);

function validateTaskCommon(task) {
  const errors = [];
  if (!isNonEmptyString(task.id)) errors.push("id måste vara en icke-tom text");
  if (task.weight !== undefined && !(Number.isFinite(task.weight) && task.weight > 0)) {
    errors.push("weight måste vara ett positivt tal");
  }
  if (task.clue !== undefined && !isNonEmptyString(task.clue)) errors.push("clue måste vara en icke-tom text");
  return errors;
}

function validateTask(task, index) {
  const where = `tasks[${index}]`;
  if (!isPlainObject(task)) return [`${where} måste vara ett objekt`];
  const validator = TASK_VALIDATORS[task.type];
  const typeErrors = validator ? validator(task) : [`type måste vara en av: ${TASK_TYPES.join(", ")}`];
  return [...validateTaskCommon(task), ...typeErrors].map((error) => `${where}.${error}`);
}

function duplicateIdErrors(tasks) {
  const ids = tasks.map((task) => task?.id).filter(isNonEmptyString);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  return duplicates.map((id) => `uppgifts-id "${id}" används flera gånger`);
}

export function validateDoor(source) {
  if (!isPlainObject(source)) return ["luckan måste vara ett JSON-objekt"];
  const errors = [];
  if (!isValidDoor(source.door)) errors.push(`door måste vara ett heltal 1-${DOOR_COUNT}`);
  if (source.title !== undefined && typeof source.title !== "string") errors.push("title måste vara en text");
  if (!Array.isArray(source.tasks) || source.tasks.length === 0) {
    return [...errors, "tasks måste vara en icke-tom lista"];
  }
  return [...errors, ...source.tasks.flatMap(validateTask), ...duplicateIdErrors(source.tasks)];
}

export function validateFinal(source) {
  if (!isPlainObject(source) || !isNonEmptyString(source.message)) return ["message måste vara en icke-tom text"];
  return [];
}

function pickClue({ number, direction, row, col, text }) {
  return { number, direction, row, col, text };
}

const TASK_PREPARERS = {
  quiz: async (task, id) => ({
    question: task.question,
    answerHashes: [...new Set(await Promise.all(task.answers.map((answer) => hashAnswer(id, answer))))],
  }),
  challenge: async (task) => ({ description: task.description }),
  crossword: async (task, id) => ({
    layout: crosswordLayout(task.grid),
    clues: task.clues.map(pickClue),
    solutionHash: await hashAnswer(id, crosswordSolution(task.grid)),
  }),
};

/** Stored id is prefixed with the door number so completed-task ids are unique across doors. */
async function prepareTask(task, door) {
  const id = `${door}-${task.id}`;
  const common = { id, type: task.type, weight: task.weight ?? 1, ...(task.clue ? { clue: task.clue } : {}) };
  return { ...common, ...(await TASK_PREPARERS[task.type](task, id)) };
}

/** Builds the Firestore door document; only listed fields are copied, so plain answers never leave the device. */
export async function prepareDoor(source) {
  const tasks = await Promise.all(source.tasks.map((task) => prepareTask(task, source.door)));
  return { door: source.door, title: source.title ?? "", tasks };
}

export function prepareFinal(source) {
  return { text: source.message };
}

function parseEntry({ name, text }) {
  try {
    return { name, source: JSON.parse(text) };
  } catch {
    return { name, error: `${name}: inte giltig JSON` };
  }
}

function addEntry(content, { name, source }) {
  const isFinal = isPlainObject(source) && "message" in source;
  const errors = (isFinal ? validateFinal(source) : validateDoor(source)).map((error) => `${name}: ${error}`);
  content.errors.push(...errors);
  if (isFinal) content.finals.push(source);
  else if (errors.length === 0) content.doors.push(source);
}

function batchErrors({ doors, finals }) {
  const numbers = doors.map((source) => source.door);
  const duplicates = [...new Set(numbers.filter((number, index) => numbers.indexOf(number) !== index))];
  const errors = duplicates.map((number) => `lucka ${number} finns i flera filer`);
  return finals.length > 1 ? [...errors, "flera filer innehåller ett slutmeddelande"] : errors;
}

/**
 * Parses and validates a batch of uploaded files.
 *
 * Args:
 *   files: list of { name, text } with the raw file contents.
 * Returns:
 *   { errors, doors, final } where doors are valid door sources and final is the final-message source or null.
 */
export function parseContentFiles(files) {
  const content = { errors: [], doors: [], finals: [] };
  for (const entry of files.map(parseEntry)) {
    if (entry.error) content.errors.push(entry.error);
    else addEntry(content, entry);
  }
  content.errors.push(...batchErrors(content));
  return { errors: content.errors, doors: content.doors, final: content.finals[0] ?? null };
}
