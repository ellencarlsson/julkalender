/** Validates door and final-message JSON before it is uploaded to Firestore. */
import { DOOR_COUNT, isValidDoor } from "../lib/unlock-time.js";
import { CLUES, CODE_LENGTH, isCodePosition, isDigit } from "../lib/rewards.js";
import { isValidSolution, parseGrid } from "../lib/sudoku.js";

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

const isTile = (tile) => (Number.isInteger(tile) && tile >= 1 && tile <= 118) || (typeof tile === "string" && /^\p{L}$/u.test(tile));
const validTiles = (tiles) => Array.isArray(tiles) && tiles.length > 0 && tiles.every(isTile);

/** Pre-answered pictures shown above a quiz, so the player can work out the pattern. */
function exampleErrors(examples) {
  if (!Array.isArray(examples) || examples.length === 0) return ["examples must be a non-empty list"];
  return examples.flatMap((example, index) =>
    isPlainObject(example) && isNonEmptyString(example.name) && IMAGE_PATH.test(example.image ?? "") &&
    (example.formula === undefined || isNonEmptyString(example.formula))
      ? []
      : [`examples[${index}] must have a name, an image like images/name.svg and optionally a non-empty formula`],
  );
}

const isStringList = (value) => Array.isArray(value) && value.every((cell) => typeof cell === "string");

function exampleTableErrors(task) {
  if (task.examples === undefined) return ["examplesTable requires examples"];
  const { title, headers, rows } = isPlainObject(task.examplesTable) ? task.examplesTable : {};
  const errors = isNonEmptyString(title) ? [] : ["examplesTable.title must be a non-empty string"];
  if (!isNonEmptyStringList(headers)) return [...errors, "examplesTable.headers must be a non-empty list of strings"];
  if (!Array.isArray(rows) || rows.length === 0) return [...errors, "examplesTable.rows must be a non-empty list"];
  const badRows = rows.flatMap((row, index) => (isStringList(row) && row.length === headers.length ? [] : [index]));
  return [...errors, ...badRows.map((index) => `examplesTable.rows[${index}] must be ${headers.length} strings`)];
}

function validateQuiz(task) {
  const errors = [];
  // A tile sum is the question itself, so the question text may be left out then.
  if (!isNonEmptyString(task.question) && !(task.tiles && task.question === undefined)) {
    errors.push("question must be a non-empty string");
  }
  if (!isNonEmptyStringList(task.answers)) errors.push("answers must be a non-empty list of strings");
  if (task.letters !== undefined && typeof task.letters !== "boolean") errors.push("letters must be true or false");
  if (task.exam !== undefined && typeof task.exam !== "boolean") errors.push("exam must be true or false");
  if (task.tiles !== undefined && !validTiles(task.tiles)) errors.push("tiles must be a list of atomic numbers 1-118 or single letters");
  if (task.solvedImage !== undefined && !IMAGE_PATH.test(task.solvedImage)) errors.push("solvedImage must be a path like images/name.jpg");
  if (task.examples !== undefined) errors.push(...exampleErrors(task.examples));
  if (task.examplesTable !== undefined) errors.push(...exampleTableErrors(task));
  for (const field of ["hint", "submitLabel", "solvedAlt", "formula"]) {
    if (task[field] !== undefined && !isNonEmptyString(task[field])) errors.push(`${field} must be a non-empty string`);
  }
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

function validateSide(side, where) {
  if (!isPlainObject(side)) return [`${where} must be an object`];
  const hasText = isNonEmptyString(side.text);
  const hasImage = isNonEmptyString(side.image) && IMAGE_PATH.test(side.image);
  if (hasText === hasImage) return [`${where} must have either text or an image like images/name.jpg`];
  return [];
}

function validateMatching(task) {
  if (!Array.isArray(task.pairs) || task.pairs.length < 2) return ["pairs must be a list of at least 2 pairs"];
  const promptErrors = task.prompt === undefined || isNonEmptyString(task.prompt) ? [] : ["prompt must be a non-empty string"];
  return promptErrors.concat(pairErrors(task.pairs));
}

function validateCrafting(task) {
  const isPicture = (item) => isPlainObject(item) && isNonEmptyString(item.name) && IMAGE_PATH.test(item.image ?? "");
  const errors = [];
  const ingredients = Array.isArray(task.ingredients) ? task.ingredients : [];
  if (ingredients.length === 0 || !ingredients.every((item) => isPicture(item) && isNonEmptyString(item.id))) {
    errors.push('ingredients must be a list of { "id": "...", "name": "...", "image": "images/..." }');
  }
  if (!isPicture(task.result)) errors.push('result must be { "name": "...", "image": "images/..." }');
  const ids = new Set(ingredients.map((item) => item?.id));
  const rows = Array.isArray(task.pattern) ? task.pattern : [];
  const validRow = (row) => Array.isArray(row) && row.length <= 3 && row.every((cell) => cell === null || ids.has(cell));
  if (rows.length === 0 || rows.length > 3 || !rows.every(validRow) || !rows.flat().some((cell) => cell !== null)) {
    errors.push("pattern must be up to 3 rows of up to 3 ingredient ids (null for an empty cell)");
  }
  return errors;
}

function validatePick(task) {
  const options = Array.isArray(task.options) ? task.options : [];
  const valid = options.length >= 2 && options.every((option) => isPlainObject(option) && isNonEmptyString(option.text));
  const errors = valid ? [] : ['options must be at least 2 { "text": "...", "correct": true } cards'];
  if (valid && !options.some((option) => option.correct === true)) errors.push("at least one option must have correct: true");
  if (task.question !== undefined && !isNonEmptyString(task.question)) errors.push("question must be a non-empty string");
  return errors;
}

function validateOrdering(task) {
  const isPicture = (item) => isPlainObject(item) && isNonEmptyString(item.name) && IMAGE_PATH.test(item.image ?? "");
  const errors = [];
  if (!Array.isArray(task.items) || task.items.length < 2 || !task.items.every(isPicture)) {
    errors.push('items must be at least 2 { "name": "...", "image": "images/..." } in the right order');
  }
  if (task.anchor !== undefined && !(isPlainObject(task.anchor) && IMAGE_PATH.test(task.anchor.image ?? ""))) {
    errors.push('anchor must be { "image": "images/...", "alt": "..." }');
  }
  return errors;
}

function pairErrors(pairs) {
  return pairs.flatMap((pair, index) =>
    isPlainObject(pair)
      ? [...validateSide(pair.item, `pairs[${index}].item`), ...validateSide(pair.target, `pairs[${index}].target`)]
      : [`pairs[${index}] must be an object`],
  );
}

const SUDOKU_PUZZLE = /^[1-9.]{81}$/;
const SUDOKU_SOLUTION = /^[1-9]{81}$/;

/** The solution must be a valid grid and every given digit must agree with it. */
function validateSudoku(task) {
  if (!SUDOKU_PUZZLE.test(task.puzzle ?? "")) return ["puzzle must be 81 characters of 1-9 or ."];
  if (!SUDOKU_SOLUTION.test(task.solution ?? "")) return ["solution must be 81 digits 1-9"];
  if (!isValidSolution(parseGrid(task.solution))) return ["solution is not a valid sudoku"];
  const clash = [...task.puzzle].some((char, index) => char !== "." && char !== task.solution[index]);
  return clash ? ["puzzle digits must match the solution"] : [];
}

function validateTyping(task) {
  return isNonEmptyStringList(task.sentences) ? [] : ["sentences must be a non-empty list of sentences"];
}

const TASK_VALIDATORS = {
  quiz: validateQuiz,
  challenge: validateChallenge,
  crossword: validateCrossword,
  matching: validateMatching,
  sudoku: validateSudoku,
  ordering: validateOrdering,
  crafting: validateCrafting,
  pick: validatePick,
  typing: validateTyping,
};
export const TASK_TYPES = Object.keys(TASK_VALIDATORS);

// Subfolders are allowed (images/door-1/x.png), parent references are not.
const IMAGE_PATH = /^images\/(?!.*\.\.)[\w./-]+\.(jpe?g|png|webp|gif|svg)$/i;

function validateImage(task) {
  if (task.image === undefined) return task.alt === undefined ? [] : ["alt requires image"];
  const errors = IMAGE_PATH.test(task.image) ? [] : ["image must be a path like images/name.jpg"];
  if (task.alt !== undefined && !isNonEmptyString(task.alt)) errors.push("alt must be a non-empty string");
  return errors;
}

/** Optional school-assignment touches any task may have. */
function validateWorksheet(task) {
  const errors = [];
  for (const field of ["worksheet", "worksheetName", "envelopeSent", "letterSent"]) {
    if (task[field] !== undefined && !isNonEmptyString(task[field])) errors.push(`${field} must be a non-empty string`);
  }
  const lines = task.envelope;
  if (lines !== undefined && !(isNonEmptyStringList(lines) && lines.length <= 5)) errors.push("envelope must be 1-5 address lines");
  const address = task.letterAddress;
  if (address !== undefined && !(isNonEmptyStringList(address) && address.length <= 5)) errors.push("letterAddress must be 1-5 lines");
  return errors;
}

function validateTaskCommon(task) {
  const errors = [...validateWorksheet(task)];
  if (task.pageTitle !== undefined && !isNonEmptyString(task.pageTitle)) errors.push("pageTitle must be a non-empty string");
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

/** A task may wait for another task in the same door ("requires": its id) before it can be played. */
function requiresErrors(tasks) {
  const ids = new Set(tasks.map((task) => task?.id));
  return tasks
    .filter((task) => task?.requires !== undefined && !(isNonEmptyString(task.requires) && ids.has(task.requires) && task.requires !== task.id))
    .map((task) => `task "${task.id}" requires must be the id of another task in this door`);
}

function rewardErrors(reward) {
  if (reward === undefined) return [];
  if (!isPlainObject(reward)) return ["reward must be an object"];
  const errors = [];
  const hasDigit = reward.digit !== undefined || reward.position !== undefined;
  if (hasDigit && !(isDigit(reward.digit) && isCodePosition(reward.position))) {
    errors.push(`reward needs both digit ("0"-"9") and position (1-${CODE_LENGTH})`);
  }
  const item = reward.item;
  const hasPicture = isPlainObject(item) && (IMAGE_PATH.test(item.image ?? "") || isNonEmptyString(item.emoji));
  if (item !== undefined && !(hasPicture && isNonEmptyString(item.name))) {
    errors.push('reward.item must be { "name": "...", "image": "images/..." } or { "name": "...", "emoji": "🍿" }');
  }
  if (reward.clue !== undefined && !CLUES.includes(reward.clue)) errors.push(`reward.clue must be one of ${CLUES.join(", ")}`);
  if (!hasDigit && reward.item === undefined && reward.clue === undefined) errors.push("reward must have a digit, an item or a clue");
  return errors;
}

export function validateDoor(source) {
  if (!isPlainObject(source)) return ["door must be a JSON object"];
  const errors = [];
  if (!isValidDoor(source.door)) errors.push(`door must be an integer 1-${DOOR_COUNT}`);
  if (source.title !== undefined && typeof source.title !== "string") errors.push("title must be a string");
  if (source.paged !== undefined && typeof source.paged !== "boolean") errors.push("paged must be true or false");
  if (!Array.isArray(source.tasks) || source.tasks.length === 0) {
    return [...errors, "tasks must be a non-empty list"];
  }
  return [...errors, ...rewardErrors(source.reward), ...source.tasks.flatMap(validateTask), ...duplicateIdErrors(source.tasks), ...requiresErrors(source.tasks)];
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
  const document = { door: source.door, title: source.title ?? "", tasks: source.tasks };
  if (source.paged) document.paged = true;
  return source.reward ? { ...document, reward: source.reward } : document;
}

export function toFinalDocument(source) {
  return { text: source.message };
}
