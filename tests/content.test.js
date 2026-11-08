/** Tests for validating content before it is uploaded from the terminal. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContentFiles, toDoorDocument, toFinalDocument, toSideQuestDocument, validateDoor, validateFinal } from "../tools/content.js";

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

const sideQuestFile = (sidequests) => file("sidequests.json", { sidequests });

test("a side quests file is parsed and validated", () => {
  const content = parseContentFiles([sideQuestFile([{ id: "lol", text: "Få stats 10/0/5" }, { id: "hjortar", text: "Hälsa", reward: 2 }])]);
  assert.deepEqual(content.errors, []);
  assert.equal(content.sideQuests.length, 2);
  assert.deepEqual(toSideQuestDocument(content.sideQuests[0], 0), { id: "lol", text: "Få stats 10/0/5", reward: 1, order: 0 });
});

test("side quests need a simple id, text and a whole-number reward", () => {
  const { errors } = parseContentFiles([sideQuestFile([{ id: "Bad Id", text: "" }, { id: "x", text: "t", reward: 1.5 }])]);
  assert.match(errors.join(), /id must use only/);
  assert.match(errors.join(), /text must be/);
  assert.match(errors.join(), /reward must be/);
});

test("duplicate side quest ids are rejected", () => {
  const { errors } = parseContentFiles([sideQuestFile([{ id: "lol", text: "a" }, { id: "lol", text: "b" }])]);
  assert.match(errors.join(), /used more than once/);
});

test("no sidequests file means sideQuests is null, so existing side quests are left alone", () => {
  assert.equal(parseContentFiles([file("door-1.json", quizDoor())]).sideQuests, null);
});

const matchingDoor = (pairs) => ({ door: 11, tasks: [{ id: "hattar", type: "matching", pairs }] });

test("a matching task with text and image sides is valid", () => {
  const pairs = [{ item: { text: "Sorteringshatten" }, target: { text: "Harry" } }, { item: { text: "Cowboyhatt" }, target: { image: "images/arthur.jpg" } }];
  assert.deepEqual(validateDoor(matchingDoor(pairs)), []);
});

test("matching needs at least two pairs, each side either text or an image", () => {
  assert.match(validateDoor(matchingDoor([{ item: { text: "a" }, target: { text: "b" } }])).join(), /at least 2 pairs/);
  const bad = [{ item: { text: "a", image: "images/x.jpg" }, target: { text: "b" } }, { item: {}, target: { image: "https://x.se/y.jpg" } }];
  assert.equal(validateDoor(matchingDoor(bad)).length, 3);
});

test("images may live in a subfolder of images/, but not outside it", () => {
  const pairs = (image) => [{ item: { image }, target: { text: "Arthur" } }, { item: { text: "b" }, target: { text: "c" } }];
  assert.deepEqual(validateDoor(matchingDoor(pairs("images/door-1/hatt-cowboy.png"))), []);
  assert.match(validateDoor(matchingDoor(pairs("images/../secret.png"))).join(), /either text or an image/);
});

test("a matching task may have a prompt heading, but not an empty one", () => {
  const pairs = [{ item: { text: "a" }, target: { text: "b" } }, { item: { text: "c" }, target: { text: "d" } }];
  const withPrompt = (prompt) => ({ door: 7, tasks: [{ id: "marksman", type: "matching", prompt, pairs }] });
  assert.deepEqual(validateDoor(withPrompt("Marksman")), []);
  assert.match(validateDoor(withPrompt("")).join(), /prompt must be/);
});

test("a code-word quiz may use letter boxes, a hint and its own submit label", () => {
  assert.deepEqual(validateDoor(quizDoor({ letters: true, hint: "Alfabetet", submitLabel: "Skicka" })), []);
  assert.match(validateDoor(quizDoor({ letters: "yes" })).join(), /letters must be/);
  assert.match(validateDoor(quizDoor({ hint: "" })).join(), /hint must be/);
});

test("a quiz may show its sum as periodic table tiles", () => {
  assert.deepEqual(validateDoor(quizDoor({ tiles: [6, 1, 8, "L", 18] })), []);
  assert.match(validateDoor(quizDoor({ tiles: [6, 119] })).join(), /tiles must be/);
  assert.match(validateDoor(quizDoor({ tiles: ["LL"] })).join(), /tiles must be/);
});

test("a tile quiz may leave out the question text, a plain quiz may not", () => {
  assert.deepEqual(validateDoor(quizDoor({ question: undefined, tiles: [6, 1] })), []);
  assert.match(validateDoor(quizDoor({ question: undefined })).join(), /question must be/);
});

test("a tile quiz may reveal a picture when solved", () => {
  assert.deepEqual(validateDoor(quizDoor({ tiles: [6], solvedImage: "images/door-2/chokladboll.webp", solvedAlt: "En chokladboll" })), []);
  assert.match(validateDoor(quizDoor({ tiles: [6], solvedImage: "https://x/y.png" })).join(), /solvedImage must be/);
});

const SUDOKU_SOLUTION = "489316752357248619612975384576824931194753826823169475741682593968531247235497168";
const SUDOKU_PUZZLE = "4.93.675...724...961.....8.57..24.31...7..8..8.3.6..7...1...5...68..1.47...4.71.8";
const sudokuDoor = (overrides = {}) => ({ door: 3, tasks: [{ id: "s", type: "sudoku", puzzle: SUDOKU_PUZZLE, solution: SUDOKU_SOLUTION, ...overrides }] });

test("a sudoku needs a valid solution that agrees with the given digits", () => {
  assert.deepEqual(validateDoor(sudokuDoor()), []);
  assert.match(validateDoor(sudokuDoor({ puzzle: "123" })).join(), /puzzle must be/);
  assert.match(validateDoor(sudokuDoor({ solution: SUDOKU_SOLUTION.replace("4", "5") })).join(), /not a valid sudoku/);
  assert.match(validateDoor(sudokuDoor({ puzzle: "5" + SUDOKU_PUZZLE.slice(1) })).join(), /must match the solution/);
});

test("a quiz may show a formula in place of a picture", () => {
  assert.deepEqual(validateDoor(quizDoor({ formula: "C₄H₆" })), []);
  assert.match(validateDoor(quizDoor({ formula: "" })).join(), /formula must be/);
});

test("exam must be true or false", () => {
  assert.deepEqual(validateDoor(quizDoor({ exam: true })), []);
  assert.match(validateDoor(quizDoor({ exam: "yes" })).join(), /exam must be/);
});

test("a typing race needs a non-empty list of sentences", () => {
  const typingDoor = (sentences) => ({ door: 4, tasks: [{ id: "t", type: "typing", sentences }] });
  assert.deepEqual(validateDoor(typingDoor(["God jul!"])), []);
  assert.match(validateDoor(typingDoor([])).join(), /sentences must be/);
  assert.match(validateDoor(typingDoor(["ok", ""])).join(), /sentences must be/);
});

test("a catch game needs its four pictures and a goal", () => {
  const images = { background: "images/door-3/kanelbulletrad.webp", bucket: "images/door-3/hink.webp", good: "images/door-3/kanelbulle.webp", bad: "images/door-3/apple.svg" };
  const catchDoor = (overrides) => ({ door: 3, tasks: [{ id: "c", type: "catch", ...images, goal: 12, ...overrides }] });
  assert.deepEqual(validateDoor(catchDoor({})), []);
  assert.match(validateDoor(catchDoor({ bad: "https://x/apple.png" })).join(), /bad must be/);
  assert.match(validateDoor(catchDoor({ goal: 0 })).join(), /goal must be/);
  assert.deepEqual(validateDoor(catchDoor({ large: ["images/door-3/mamma-mu.webp"] })), []);
  assert.match(validateDoor(catchDoor({ large: "images/door-3/mamma-mu.webp" })).join(), /large must be/);
  assert.deepEqual(validateDoor(catchDoor({ fromLevel: { "images/door-3/mamma-mu.webp": 3 } })), []);
  assert.match(validateDoor(catchDoor({ fromLevel: { "images/door-3/mamma-mu.webp": 7 } })).join(), /fromLevel must/);
  assert.deepEqual(validateDoor(catchDoor({ pickWeight: { "images/door-3/mamma-mu.webp": 3 }, speed: { "images/door-3/mamma-mu.webp": 0.7 } })), []);
  assert.match(validateDoor(catchDoor({ speed: { "images/door-3/mamma-mu.webp": 0 } })).join(), /speed must/);
  assert.deepEqual(validateDoor(catchDoor({ bad: ["images/door-3/apple.svg", "images/door-3/skruv.svg"] })), []);
  assert.match(validateDoor(catchDoor({ bad: [] })).join(), /bad must be/);
});

test("a puzzle needs a picture and 2-8 columns and rows", () => {
  const puzzleDoor = (overrides) => ({ door: 12, tasks: [{ id: "p", type: "puzzle", picture: "images/door-12/jul.webp", cols: 6, rows: 3, ...overrides }] });
  assert.deepEqual(validateDoor(puzzleDoor({})), []);
  assert.match(validateDoor(puzzleDoor({ cols: 1 })).join(), /cols and rows/);
  assert.match(validateDoor(puzzleDoor({ picture: "jul.webp" })).join(), /picture must be/);
});

test("grouping needs named groups of 2+ items, as text or pictures, sizes may differ", () => {
  const group = (name, items) => ({ name, items });
  const door = (groups) => ({ door: 15, tasks: [{ id: "g", type: "grouping", groups }] });
  const fruit = group("Frukt", [{ text: "äpple" }, { text: "päron" }]);
  assert.deepEqual(validateDoor(door([fruit, group("Djur", [{ image: "images/door-15/ko.webp", alt: "Ko" }, { text: "katt" }])])), []);
  assert.deepEqual(validateDoor(door([fruit])), []);
  assert.match(validateDoor(door([])).join(), /non-empty list of groups/);
  assert.match(validateDoor(door([fruit, group("Djur", [{ text: "ko" }])])).join(), /at least 2 items/);
  assert.deepEqual(validateDoor(door([fruit, group("Tre", [{ text: "a" }, { text: "b" }, { text: "c" }])])), []);
  assert.match(validateDoor(door([fruit, group("", [{ text: "a" }, { text: "b" }])])).join(), /must have a name/);
  assert.match(validateDoor(door([fruit, group("Djur", [{ text: "ko" }, {}])])).join(), /text or an image/);
});

test("svg images are accepted", () => {
  assert.deepEqual(validateDoor(quizDoor({ image: "images/door-22/butan.svg", alt: "Butan" })), []);
});

test("a quiz may show named example pictures", () => {
  const examples = [{ image: "images/door-22/metan.svg", name: "metan" }];
  assert.deepEqual(validateDoor(quizDoor({ examples })), []);
});

test("an example may show a molecular formula under its name", () => {
  const examples = (formula) => [{ image: "images/door-22/metan.svg", name: "metan", formula }];
  assert.deepEqual(validateDoor(quizDoor({ examples: examples("CH₄") })), []);
  assert.match(validateDoor(quizDoor({ examples: examples("") })).join(), /examples\[0\]/);
});

test("examples must be a non-empty list of image + name", () => {
  assert.match(validateDoor(quizDoor({ examples: [] })).join(), /examples must be/);
  assert.match(validateDoor(quizDoor({ examples: [{ image: "images/metan.svg" }] })).join(), /examples\[0\]/);
  assert.match(validateDoor(quizDoor({ examples: [{ image: "https://x/y.svg", name: "metan" }] })).join(), /examples\[0\]/);
});

test("examples may have a table, but only together with examples", () => {
  const examples = [{ image: "images/door-22/metan.svg", name: "metan" }];
  const table = { title: "Metanserien", headers: ["Antal kol", "Enkelbindning"], rows: [["1", "metan"]] };
  assert.deepEqual(validateDoor(quizDoor({ examples, examplesTable: table })), []);
  assert.match(validateDoor(quizDoor({ examplesTable: table })).join(), /examplesTable requires examples/);
});

test("an examples table needs a title, headers and rows as wide as the headers", () => {
  const examples = [{ image: "images/door-22/metan.svg", name: "metan" }];
  const table = (overrides) => ({ title: "M", headers: ["a", "b"], rows: [["1", "x"]], ...overrides });
  assert.match(validateDoor(quizDoor({ examples, examplesTable: table({ title: "" }) })).join(), /examplesTable.title/);
  assert.match(validateDoor(quizDoor({ examples, examplesTable: table({ headers: [] }) })).join(), /examplesTable.headers/);
  assert.match(validateDoor(quizDoor({ examples, examplesTable: table({ rows: [["1"]] }) })).join(), /examplesTable.rows\[0\]/);
});

test("a task may look like a worksheet and carry an envelope", () => {
  assert.deepEqual(validateDoor(quizDoor({ worksheet: "Matematik", envelope: ["Till eleven", "Alfabetsvägen 1–26"] })), []);
  assert.match(validateDoor(quizDoor({ worksheet: "" })).join(), /worksheet must be/);
  assert.match(validateDoor(quizDoor({ envelope: [] })).join(), /envelope must be/);
  assert.match(validateDoor(quizDoor({ envelope: ["a", "b", "c", "d", "e", "f"] })).join(), /envelope must be/);
});

test("door rewards: a code digit with its position and/or an item", () => {
  const door = (reward) => ({ ...quizDoor(), reward });
  const popcorn = { name: "Popcorn", image: "images/items/popcorn.webp" };
  assert.deepEqual(validateDoor(door({ digit: "7", position: 3, item: popcorn })), []);
  assert.deepEqual(validateDoor(door({ item: popcorn })), []);
  assert.deepEqual(validateDoor(door({ item: { name: "Popcorn", emoji: "🍿" } })), []);
  assert.equal(validateDoor(door({ item: "Popcorn" })).length, 1);
  assert.equal(validateDoor(door({ item: { name: "Popcorn", image: "popcorn.webp" } })).length, 1);
  assert.equal(validateDoor(door({ digit: "7" })).length, 1);
  assert.equal(validateDoor(door({ digit: "77", position: 3 })).length, 1);
  assert.equal(validateDoor(door({ digit: "7", position: 12 })).length, 1);
  assert.equal(validateDoor(door({})).length, 1);
  assert.deepEqual(validateDoor(door({ clue: "code-title" })), []);
  assert.equal(validateDoor(door({ clue: "code-middle" })).length, 1);
  assert.deepEqual(toDoorDocument(door({ item: popcorn })).reward, { item: popcorn });
  assert.equal("reward" in toDoorDocument(quizDoor()), false);
});

test("a worksheet may carry the student's name and a sent-letter message", () => {
  assert.deepEqual(validateDoor(quizDoor({ worksheet: "Matte", worksheetName: "Haris", envelope: ["A"], envelopeSent: "Brevet kom iväg!" })), []);
  assert.match(validateDoor(quizDoor({ worksheetName: "" })).join(), /worksheetName must be/);
});

test("a task may be a letter on the parchment with an address and a sent message", () => {
  assert.deepEqual(validateDoor(quizDoor({ letterAddress: ["Till Tomten", "Nordpolen"], letterSent: "Kom iväg!" })), []);
  assert.match(validateDoor(quizDoor({ letterAddress: [] })).join(), /letterAddress must be/);
  assert.match(validateDoor(quizDoor({ letterSent: "" })).join(), /letterSent must be/);
});

test("a door may show its tasks one per page, each with its own page title", () => {
  assert.deepEqual(validateDoor({ ...quizDoor({ pageTitle: "Recept 1" }), paged: true }), []);
  assert.match(validateDoor({ ...quizDoor(), paged: "yes" }).join(), /paged must be/);
  assert.match(validateDoor(quizDoor({ pageTitle: "" })).join(), /pageTitle must be/);
});

test("the paged flag is kept in the uploaded door document", () => {
  assert.equal(toDoorDocument({ ...quizDoor(), paged: true }).paged, true);
  assert.equal("paged" in toDoorDocument(quizDoor()), false);
});

test("ordering tasks list pictures in order and may require another task", () => {
  const item = (name) => ({ name, image: `images/p/${name}.svg` });
  const naming = { id: "namn", type: "quiz", question: "?", answers: ["a"] };
  const ordering = (extra) => ({ id: "ordning", type: "ordering", items: [item("a"), item("b")], ...extra });
  assert.deepEqual(validateDoor({ door: 6, tasks: [naming, ordering({ requires: "namn", anchor: { image: "images/p/sol.svg" } })] }), []);
  assert.equal(validateDoor({ door: 6, tasks: [ordering({ items: [item("a")] })] }).length, 1);
  assert.equal(validateDoor({ door: 6, tasks: [naming, ordering({ requires: "saknas" })] }).length, 1);
});

test("crafting tasks need pictured ingredients, a result and a pattern of their ids", () => {
  const plank = { id: "plank", name: "Plankor", image: "images/mc/plank.svg" };
  const task = (extra) => ({ id: "c", type: "crafting", ingredients: [plank], result: { name: "Bänk", image: "images/mc/bank.svg" }, pattern: [["plank", "plank"], ["plank", "plank"]], ...extra });
  assert.deepEqual(validateDoor({ door: 1, tasks: [task()] }), []);
  assert.equal(validateDoor({ door: 1, tasks: [task({ pattern: [["stick"]] })] }).length, 1);
  assert.equal(validateDoor({ door: 1, tasks: [task({ pattern: [[null]] })] }).length, 1);
  assert.equal(validateDoor({ door: 1, tasks: [task({ result: { name: "Bänk" } })] }).length, 1);
});

test("pick tasks need text cards with at least one right one", () => {
  const pick = (options) => ({ door: 1, tasks: [{ id: "p", type: "pick", question: "Vilka?", options }] });
  assert.deepEqual(validateDoor(pick([{ text: "A", correct: true }, { text: "B" }])), []);
  assert.equal(validateDoor(pick([{ text: "A" }, { text: "B" }])).length, 1);
  assert.equal(validateDoor(pick([{ text: "A", correct: true }])).length, 1);
});

test("a challenge may carry a recipe with ingredients and steps", () => {
  const bake = (recipe) => ({ door: 5, tasks: [{ id: "b", type: "challenge", description: "Baka", recipe }] });
  assert.deepEqual(validateDoor(bake({ ingredients: ["3 ägg"], steps: ["Knäck i 3 ägg."] })), []);
  assert.equal(validateDoor(bake({ ingredients: [], steps: ["x"] })).length, 1);
});

test("a quiz may show a ticket picture that unlocks with the code", () => {
  assert.deepEqual(validateDoor(quizDoor({ ticket: { image: "images/door-24/biobiljett.webp" } })), []);
  assert.equal(validateDoor(quizDoor({ ticket: { image: "biljett.webp" } })).length, 1);
});

test("a door may give the prize", () => {
  const prize = { image: "images/door-24/cinema-ticket.svg", code: "123", text: "Grattis!" };
  assert.deepEqual(validateDoor({ ...quizDoor(), reward: { prize } }), []);
  assert.equal(validateDoor({ ...quizDoor(), reward: { prize: { image: "images/x.svg" } } }).length, 1);
});

test("a text side may have a backdrop picture behind it", () => {
  const door = (item) => ({ door: 3, tasks: [{ id: "m", type: "matching", pairs: [{ item, target: { text: "a" } }, { item: { text: "c" }, target: { text: "d" } }] }] });
  assert.deepEqual(validateDoor(door({ text: "Mending", backdrop: "images/door-1/enchanted-book.svg" })), []);
  assert.equal(validateDoor(door({ text: "Mending", backdrop: "book.svg" })).length, 1);
});

test("a hotspot needs a picture, a prompt and an area inside the picture", () => {
  const hotspotDoor = (overrides) => ({ door: 8, tasks: [{ id: "h", type: "hotspot", picture: "images/door-8/hogwarts.webp", prompt: "Tryck på tornet", area: { x: 60, y: 10, width: 10, height: 30 }, ...overrides }] });
  assert.deepEqual(validateDoor(hotspotDoor({})), []);
  assert.deepEqual(validateDoor(hotspotDoor({ alt: "Hogwarts" })), []);
  assert.match(validateDoor(hotspotDoor({ picture: "hogwarts.webp" })).join(), /picture must be/);
  assert.match(validateDoor(hotspotDoor({ prompt: "" })).join(), /prompt must be/);
  assert.match(validateDoor(hotspotDoor({ area: { x: 60, y: 10 } })).join(), /area needs/);
  assert.match(validateDoor(hotspotDoor({ area: { x: 95, y: 10, width: 10, height: 30 } })).join(), /stay inside/);
  const hats = [{ x: 10, y: 10, width: 5, height: 5 }, { x: 50, y: 50, width: 10, height: 10 }];
  assert.deepEqual(validateDoor(hotspotDoor({ area: undefined, areas: hats })), []);
  assert.match(validateDoor(hotspotDoor({ area: undefined, areas: [] })).join(), /areas must be/);
  assert.deepEqual(validateDoor(hotspotDoor({ captionAt: "bottom-left" })), []);
  assert.match(validateDoor(hotspotDoor({ captionAt: "top" })).join(), /captionAt must be/);
  assert.match(validateDoor(hotspotDoor({ area: undefined, areas: [hats[0], { x: 1 }] })).join(), /areas\[1\]: area needs/);
});

test("a quiz time range needs HH:MM times with from before to", () => {
  const timeDoor = (timeRange) => ({ door: 2, tasks: [{ id: "t", type: "quiz", question: "När?", answers: ["01:30"], timeRange }] });
  assert.deepEqual(validateDoor(timeDoor({ from: "01:15", to: "01:45" })), []);
  assert.match(validateDoor(timeDoor({ from: "1:15", to: "01:45" })).join(), /timeRange must be/);
  assert.match(validateDoor(timeDoor({ from: "02:00", to: "01:00" })).join(), /timeRange must be/);
});

test("a word search needs equal rows of letters and words that are in the grid", () => {
  const door = (overrides) => ({ door: 21, tasks: [{ id: "w", type: "wordsearch", rows: ["GTAX", "XMUX"], words: ["GTA", "Mu"], ...overrides }] });
  assert.deepEqual(validateDoor(door({})), []);
  assert.match(validateDoor(door({ rows: ["GTAX", "XMU"] })).join(), /rows must be/);
  assert.match(validateDoor(door({ rows: ["GTA1", "XMUX"] })).join(), /rows must be/);
  assert.match(validateDoor(door({ words: [] })).join(), /words must be/);
  assert.match(validateDoor(door({ words: ["GTA", "Teemo"] })).join(), /"Teemo" is not in the grid/);
});

test("a pick task may have a hint", () => {
  const door = (overrides) => ({ door: 8, tasks: [{ id: "p", type: "pick", options: [{ text: "A", correct: true }, { text: "B" }], ...overrides }] });
  assert.deepEqual(validateDoor(door({ hint: "Tänk på julen." })), []);
  assert.match(validateDoor(door({ hint: "" })).join(), /hint must be/);
});

test("a matching pair hint is true or false", () => {
  const pairs = [{ item: { text: "A" }, target: { text: "1" } }, { item: { text: "B" }, target: { text: "2" } }];
  const hintDoor = (pairHint) => ({ door: 7, tasks: [{ id: "m", type: "matching", pairs, pairHint }] });
  assert.deepEqual(validateDoor(hintDoor(true)), []);
  assert.match(validateDoor(hintDoor("ja")).join(), /pairHint must be/);
});
