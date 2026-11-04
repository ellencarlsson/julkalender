/** Tests for content validation, hashing and Firestore document preparation. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  crosswordLayout,
  crosswordSolution,
  hashAnswer,
  normalizeAnswer,
  parseContentFiles,
  prepareDoor,
  prepareFinal,
  validateDoor,
  validateFinal,
} from "../lib/content.js";

const SAMPLE_DIR = new URL("../sample-content/", import.meta.url);
const readSample = (name) => ({ name, text: readFileSync(new URL(name, SAMPLE_DIR), "utf8") });
const quizDoor = (overrides = {}) => ({
  door: 1,
  tasks: [{ id: "q", type: "quiz", question: "Uggla?", answers: ["Hedwig"], ...overrides }],
});

test("normalizeAnswer trims, lowercases and collapses whitespace", () => {
  assert.equal(normalizeAnswer("  Harry   POTTER \n"), "harry potter");
});

test("normalizeAnswer keeps å ä ö and unifies decomposed forms", () => {
  assert.equal(normalizeAnswer("GÅS"), "gås");
  assert.equal(normalizeAnswer("ä"), "ä");
});

test("hashAnswer ignores case and spacing", async () => {
  assert.equal(await hashAnswer("1-q", " Hedwig "), await hashAnswer("1-q", "hedwig"));
});

test("hashAnswer differs between tasks for the same answer", async () => {
  assert.notEqual(await hashAnswer("1-q", "hedwig"), await hashAnswer("2-q", "hedwig"));
});

test("hashAnswer is a 64-char hex SHA-256", async () => {
  assert.match(await hashAnswer("1-q", "hedwig"), /^[0-9a-f]{64}$/);
});

test("crossword solution and layout", () => {
  assert.equal(crosswordSolution(["JUL", "A#U", "GÅS"]), "jul/a#u/gås");
  assert.deepEqual(crosswordLayout(["JUL", "A#U", "GÅS"]), ["...", ".#.", "..."]);
});

test("valid quiz door has no errors", () => {
  assert.deepEqual(validateDoor(quizDoor()), []);
});

test("door number outside 1-24 is rejected", () => {
  assert.equal(validateDoor({ ...quizDoor(), door: 25 }).length, 1);
});

test("quiz without answers is rejected", () => {
  assert.match(validateDoor(quizDoor({ answers: [] })).join(), /answers/);
});

test("unknown task type is rejected", () => {
  assert.match(validateDoor(quizDoor({ type: "dance" })).join(), /type/);
});

test("duplicate task ids are rejected", () => {
  const door = quizDoor();
  door.tasks.push({ ...door.tasks[0] });
  assert.match(validateDoor(door).join(), /flera gånger/);
});

test("non-positive weight is rejected", () => {
  assert.match(validateDoor(quizDoor({ weight: 0 })).join(), /weight/);
});

test("crossword with uneven rows is rejected", () => {
  const door = { door: 3, tasks: [{ id: "c", type: "crossword", grid: ["AB", "C"], clues: [] }] };
  assert.match(validateDoor(door).join(), /lika långa/);
});

test("crossword clue on a block cell is rejected", () => {
  const clue = { number: 1, direction: "across", row: 1, col: 1, text: "x" };
  const door = { door: 3, tasks: [{ id: "c", type: "crossword", grid: ["AB", "C#"], clues: [clue] }] };
  assert.match(validateDoor(door).join(), /bokstavsruta/);
});

test("final message must be non-empty", () => {
  assert.deepEqual(validateFinal({ message: "Hej" }), []);
  assert.equal(validateFinal({ message: " " }).length, 1);
});

test("prepared quiz door contains hashes but never the plain answers", async () => {
  const prepared = await prepareDoor(quizDoor({ answers: ["Hedwig", "Hedvig"] }));
  const json = JSON.stringify(prepared);
  assert.doesNotMatch(json.toLowerCase(), /hedwig|hedvig/);
  assert.deepEqual(prepared.tasks[0].answerHashes, [await hashAnswer("1-q", "hedwig"), await hashAnswer("1-q", "hedvig")]);
});

test("prepared task ids are prefixed with the door and default weight is 1", async () => {
  const prepared = await prepareDoor(quizDoor());
  assert.equal(prepared.tasks[0].id, "1-q");
  assert.equal(prepared.tasks[0].weight, 1);
});

test("prepared crossword hides the letters", async () => {
  const [sample] = parseContentFiles([readSample("door-3.json")]).doors;
  const crossword = (await prepareDoor(sample)).tasks[0];
  assert.deepEqual(crossword.layout, ["...", ".#.", "..."]);
  assert.equal(crossword.solutionHash, await hashAnswer("3-korsord", "jul/a#u/gås"));
  assert.equal("grid" in crossword, false);
});

test("prepared documents contain no undefined values (Firestore rejects them)", async () => {
  const { doors } = parseContentFiles(readdirSync(SAMPLE_DIR).map(readSample));
  for (const door of doors) {
    const prepared = await prepareDoor(door);
    assert.deepEqual(JSON.parse(JSON.stringify(prepared)), prepared);
  }
});

test("prepareFinal stores the message as text", () => {
  assert.deepEqual(prepareFinal({ message: "Hej" }), { text: "Hej" });
});

test("all sample content files are valid", () => {
  const content = parseContentFiles(readdirSync(SAMPLE_DIR).map(readSample));
  assert.deepEqual(content.errors, []);
  assert.deepEqual(content.doors.map((door) => door.door).sort(), [1, 2, 3]);
  assert.notEqual(content.final, null);
});

test("samples cover every task type and at least one clue", () => {
  const { doors } = parseContentFiles(readdirSync(SAMPLE_DIR).map(readSample));
  const tasks = doors.flatMap((door) => door.tasks);
  assert.deepEqual([...new Set(tasks.map((task) => task.type))].sort(), ["challenge", "crossword", "quiz"]);
  assert.ok(tasks.some((task) => task.clue));
});

test("parseContentFiles reports invalid JSON with the file name", () => {
  assert.deepEqual(parseContentFiles([{ name: "x.json", text: "{" }]).errors, ["x.json: inte giltig JSON"]);
});

test("parseContentFiles rejects the same door in two files", () => {
  const text = JSON.stringify(quizDoor());
  const { errors } = parseContentFiles([{ name: "a.json", text }, { name: "b.json", text }]);
  assert.deepEqual(errors, ["lucka 1 finns i flera filer"]);
});

test("parseContentFiles rejects two final messages", () => {
  const text = JSON.stringify({ message: "Hej" });
  const { errors } = parseContentFiles([{ name: "a.json", text }, { name: "b.json", text }]);
  assert.deepEqual(errors, ["flera filer innehåller ett slutmeddelande"]);
});
