/** Tests for validating content before it is uploaded from the terminal. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContentFiles, toDoorDocument, toFinalDocument, validateDoor, validateFinal } from "../tools/content.js";

const quizDoor = (overrides = {}) => ({
  door: 1,
  tasks: [{ id: "q", type: "quiz", question: "Uggla?", answers: ["Hedwig"], ...overrides }],
});
const crosswordDoor = (grid, clues) => ({ door: 3, tasks: [{ id: "c", type: "crossword", grid, clues }] });
const file = (name, source) => ({ name, text: JSON.stringify(source) });

test("valid quiz door has no errors", () => {
  assert.deepEqual(validateDoor(quizDoor()), []);
});

test("valid challenge and crossword doors have no errors", () => {
  assert.deepEqual(validateDoor({ door: 2, tasks: [{ id: "b", type: "challenge", description: "Baka" }] }), []);
  const clue = { number: 1, direction: "across", row: 0, col: 0, text: "Högtid" };
  assert.deepEqual(validateDoor(crosswordDoor(["JUL", "A#U", "GÅS"], [clue])), []);
});

test("door number outside 1-24 is rejected", () => {
  assert.match(validateDoor({ ...quizDoor(), door: 25 }).join(), /door must be/);
});

test("door without tasks is rejected", () => {
  assert.match(validateDoor({ door: 1, tasks: [] }).join(), /tasks/);
});

test("quiz without answers is rejected", () => {
  assert.match(validateDoor(quizDoor({ answers: [] })).join(), /answers/);
});

test("unknown task type is rejected", () => {
  assert.match(validateDoor(quizDoor({ type: "dance" })).join(), /type must be one of/);
});

test("duplicate task ids are rejected", () => {
  const door = quizDoor();
  door.tasks.push({ ...door.tasks[0] });
  assert.match(validateDoor(door).join(), /used more than once/);
});

test("non-positive weight is rejected", () => {
  assert.match(validateDoor(quizDoor({ weight: 0 })).join(), /weight/);
});

test("crossword with uneven rows is rejected", () => {
  assert.match(validateDoor(crosswordDoor(["AB", "C"], [])).join(), /same length/);
});

test("crossword clue on a black square is rejected", () => {
  const clue = { number: 1, direction: "across", row: 1, col: 1, text: "x" };
  assert.match(validateDoor(crosswordDoor(["AB", "C#"], [clue])).join(), /letter cell/);
});

test("final message must be non-empty", () => {
  assert.deepEqual(validateFinal({ message: "Hej" }), []);
  assert.equal(validateFinal({ message: " " }).length, 1);
});

test("answers are stored as plain text", () => {
  assert.deepEqual(toDoorDocument(quizDoor()).tasks[0].answers, ["Hedwig"]);
});

test("door document drops unknown top-level fields and defaults title", () => {
  assert.deepEqual(Object.keys(toDoorDocument({ ...quizDoor(), extra: 1 })).sort(), ["door", "tasks", "title"]);
  assert.equal(toDoorDocument(quizDoor()).title, "");
});

test("final document stores the message as text", () => {
  assert.deepEqual(toFinalDocument({ message: "Hej" }), { text: "Hej" });
});

test("parseContentFiles splits doors and final message", () => {
  const content = parseContentFiles([file("door-1.json", quizDoor()), file("final.json", { message: "Hej" })]);
  assert.deepEqual(content.errors, []);
  assert.equal(content.doors.length, 1);
  assert.deepEqual(content.final, { message: "Hej" });
});

test("parseContentFiles reports invalid JSON with the file name", () => {
  assert.deepEqual(parseContentFiles([{ name: "x.json", text: "{" }]).errors, ["x.json: not valid JSON"]);
});

test("parseContentFiles prefixes errors with the file name", () => {
  const { errors } = parseContentFiles([file("door-25.json", { ...quizDoor(), door: 25 })]);
  assert.match(errors[0], /^door-25\.json: /);
});

test("parseContentFiles rejects the same door in two files", () => {
  const { errors } = parseContentFiles([file("a.json", quizDoor()), file("b.json", quizDoor())]);
  assert.deepEqual(errors, ["door 1 is in more than one file"]);
});

test("parseContentFiles rejects two final messages", () => {
  const { errors } = parseContentFiles([file("a.json", { message: "A" }), file("b.json", { message: "B" })]);
  assert.deepEqual(errors, ["more than one file contains a final message"]);
});

test("crossword grids may contain spaces inside multi-word answers", () => {
  const clue = { number: 1, direction: "across", row: 0, col: 0, text: "Låt" };
  assert.deepEqual(validateDoor(crosswordDoor(["STUPID SONG"], [clue])), []);
});

test("a space at the edge or next to a black square is rejected", () => {
  const clue = { number: 1, direction: "across", row: 0, col: 1, text: "x" };
  assert.match(validateDoor(crosswordDoor([" AB"], [clue])).join(), /space must sit between/);
  assert.match(validateDoor(crosswordDoor(["A #B"], [{ ...clue, col: 0 }])).join(), /space must sit between/);
});

test("a clue cannot start on a space", () => {
  const clue = { number: 1, direction: "across", row: 0, col: 1, text: "x" };
  assert.match(validateDoor(crosswordDoor(["A B"], [clue])).join(), /letter cell/);
});

const challengeDoor = (overrides = {}) => ({
  door: 2,
  tasks: [{ id: "d", type: "challenge", description: "Hitta", ...overrides }],
});

test("task with an image in images/ and alt text is valid", () => {
  assert.deepEqual(validateDoor(challengeDoor({ image: "images/door-2-dexter.jpg", alt: "Dexter" })), []);
});

test("image outside images/ or with unknown extension is rejected", () => {
  assert.match(validateDoor(challengeDoor({ image: "https://example.com/x.jpg" })).join(), /image must be/);
  assert.match(validateDoor(challengeDoor({ image: "images/x.txt" })).join(), /image must be/);
});

test("alt without image is rejected", () => {
  assert.match(validateDoor(challengeDoor({ alt: "Dexter" })).join(), /alt requires image/);
});
