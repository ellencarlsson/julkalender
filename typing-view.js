/**
 * Typing race: copy the sentences as fast as possible. The clock starts on the first keystroke and
 * stops when the text is exactly right. The task is passed by beating Ellen's best time.
 */
import { beatsEllen, formatTime, raceText, topResults, typingProgress } from "./lib/typing.js";
import { paragraph } from "./task-ui.js";

const TICK_MS = 100;
const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

/** Typed-correct part, the first wrong character, and the rest still to type. */
function renderTarget(ctx, { correct, wrong }) {
  const { target } = ctx;
  const parts = [element("span", "typing-correct", target.slice(0, correct))];
  if (wrong && correct < target.length) parts.push(element("span", "typing-wrong", target[correct]));
  parts.push(element("span", "", target.slice(correct + (wrong ? 1 : 0))));
  ctx.targetView.replaceChildren(...parts);
}

function startClock(ctx) {
  ctx.startedAt = performance.now();
  ctx.ticker = setInterval(() => (ctx.clock.textContent = formatTime(performance.now() - ctx.startedAt)), TICK_MS);
}

function onInput(ctx) {
  if (ctx.startedAt === null) startClock(ctx);
  const progress = typingProgress(ctx.target, ctx.input.value);
  renderTarget(ctx, progress);
  ctx.input.classList.toggle("typing-input--wrong", progress.wrong);
  if (progress.done) finish(ctx, Math.round(performance.now() - ctx.startedAt));
}

const INSTRUCTIONS = "Skriv av texten så snabbt du kan, klockan startar när du börjar skriva. Du måste slå Ellens rekord för att klara luckan.";

const ellenBest = (results) => topResults(results.filter((result) => result.ellen))[0]?.timeMs ?? null;

/** The player's result line: passed or how fast they need to be; Ellen's own run needs no line. */
function resultMessage(ctx, timeMs) {
  const best = ellenBest(ctx.results);
  if (ctx.board.isEllen) return "";
  if (best === null) return `Din tid: ${formatTime(timeMs)}. Ellen har inte satt någon tid än.`;
  if (beatsEllen(timeMs, best)) return `Du slog Ellen! ${formatTime(timeMs)}`;
  return `${formatTime(timeMs)} – försök igen, slå Ellens tid ${formatTime(best)}`;
}

/** Every attempt is saved, so the same player can show up several times on the leaderboard. */
async function saveAttempt(ctx, timeMs) {
  await ctx.board.save(ctx.door, timeMs);
  ctx.latest = { uid: ctx.board.uid, name: ctx.board.name, timeMs, ellen: ctx.board.isEllen };
  ctx.results = [...ctx.results, ctx.latest];
}

async function finish(ctx, timeMs) {
  clearInterval(ctx.ticker);
  ctx.input.disabled = true;
  ctx.clock.textContent = formatTime(timeMs);
  try {
    await saveAttempt(ctx, timeMs);
    ctx.status.textContent = resultMessage(ctx, timeMs);
    renderLeaderboard(ctx);
    if (ctx.board.isEllen || beatsEllen(timeMs, ellenBest(ctx.results))) await pass(ctx);
  } catch {
    ctx.status.textContent = "Kunde inte spara tiden. Försök igen.";
  }
  ctx.retry.hidden = false;
}

async function pass(ctx) {
  if (ctx.progress.isCompleted(ctx.key)) return;
  await ctx.progress.complete(ctx.key);
  // The door header shows "+100 XP" once the door is done, so no extra line here.
  ctx.card.classList.add("task--done");
}

function restart(ctx) {
  Object.assign(ctx, { startedAt: null });
  Object.assign(ctx.input, { value: "", disabled: false });
  ctx.input.classList.remove("typing-input--wrong");
  ctx.clock.textContent = formatTime(0);
  ctx.status.textContent = "";
  ctx.retry.hidden = true;
  renderTarget(ctx, { correct: 0, wrong: false });
  ctx.input.focus();
}

function renderLeaderboard(ctx) {
  const rows = topResults(ctx.results).map((result) => {
    const row = element("li", result === ctx.latest ? "typing-me" : "");
    row.append(element("span", "typing-name", result.name), element("span", "typing-time", formatTime(result.timeMs)));
    return row;
  });
  ctx.list.replaceChildren(...(rows.length ? rows : [element("li", "typing-empty", "Ingen har skrivit än.")]));
}

function raceInput(ctx) {
  const input = element("textarea", "typing-input");
  Object.assign(input, { rows: 3, spellcheck: false, autocomplete: "off" });
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("aria-label", "Skriv texten här");
  input.addEventListener("input", () => onInput(ctx));
  // Pasting would skip the race.
  input.addEventListener("paste", (event) => event.preventDefault());
  return input;
}

function leaderboardBox(ctx) {
  const box = element("div", "typing-board");
  ctx.list = element("ol", "typing-list");
  box.append(element("h3", "", "Topp 5"), ctx.list);
  return box;
}

async function loadLeaderboard(ctx) {
  try {
    ctx.results = await ctx.board.load(ctx.door);
    renderLeaderboard(ctx);
  } catch {
    ctx.list.replaceChildren(element("li", "typing-empty", "Kunde inte ladda topplistan."));
  }
}

/**
 * Builds a typing race task.
 *
 * Args:
 *   options: { task, key, progress, card, door } where progress.leaderboard comes from createLeaderboard().
 * Returns:
 *   The elements to append to the card.
 */
export function createTypingRace({ task, key, progress, card, door }) {
  const ctx = { task, key, progress, card, door, board: progress.leaderboard, target: raceText(task), startedAt: null, results: [] };
  ctx.targetView = element("p", "typing-target");
  ctx.input = raceInput(ctx);
  ctx.clock = element("p", "typing-clock", formatTime(0));
  ctx.status = paragraph("task-status", "");
  ctx.status.setAttribute("role", "status");
  ctx.retry = Object.assign(element("button", "small typing-retry", "Kör igen"), { type: "button", hidden: true });
  ctx.retry.addEventListener("click", () => restart(ctx));
  renderTarget(ctx, { correct: 0, wrong: false });
  const board = leaderboardBox(ctx);
  if (ctx.board) loadLeaderboard(ctx);
  return [paragraph("typing-instructions", INSTRUCTIONS), ctx.targetView, ctx.clock, ctx.input, ctx.status, ctx.retry, board];
}
