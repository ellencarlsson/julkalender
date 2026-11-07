/**
 * Catch game: buns and other things fall from a tree and the player moves a bucket under them. Four
 * levels, each faster than the last: catch the goal number of buns to finish a level, but catching
 * anything else restarts it. The finished levels are saved; level 4 completes the task.
 */
import {
  BUCKET_WIDTH, LEVEL_COUNT, clampBucket, crossesRim, encodeLevels, fallSpeed, isOverBucket, levelSettings, levelsDone,
  pickKind, spawnX,
} from "./lib/catch.js";

// Where the bucket rim is drawn: the bucket sits at the bottom of the tall field and its rim is about
// 29% down the bucket picture.
const RIM_Y = 86;
const KEY_SPEED = 70;
const CROWN_TOP = 6;
const CROWN_HEIGHT = 38;

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

function picture(src, className) {
  const image = Object.assign(element("img", className), { src, alt: "", draggable: false });
  image.setAttribute("aria-hidden", "true");
  return image;
}

function place(node, x, y) {
  node.style.left = `${x}%`;
  node.style.top = `${y}%`;
}

const badPictures = (task) => [task.bad].flat();
const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

function spawn(ctx) {
  const kind = pickKind(Math.random, levelSettings(ctx.level).badChance);
  const item = { kind, x: spawnX(Math.random), y: CROWN_TOP + Math.random() * CROWN_HEIGHT };
  const src = kind === "good" ? ctx.task.good : randomOf(badPictures(ctx.task));
  const size = ctx.task.large?.includes(src) ? " catch-item--large" : "";
  item.node = picture(src, `catch-item catch-item--${kind}${size}`);
  place(item.node, item.x, item.y);
  ctx.field.append(item.node);
  ctx.items.push(item);
}

function land(ctx, item) {
  if (item.kind === "bad") return lose(ctx);
  ctx.caught++;
  ctx.count.textContent = `${ctx.caught} / ${ctx.goal}`;
  if (ctx.caught >= ctx.goal) finishLevel(ctx);
}

/** Moves every item down; items that pass the rim above the bucket are caught, the rest fall away. */
function moveItems(ctx, dt) {
  const speed = fallSpeed(ctx.level);
  for (const item of [...ctx.items]) {
    const previous = item.y;
    item.y += speed * dt;
    const caught = crossesRim(previous, item.y, RIM_Y) && isOverBucket(item.x, ctx.bucketX);
    if (caught || item.y > 105) removeItem(ctx, item);
    else place(item.node, item.x, item.y);
    if (caught) land(ctx, item);
    if (!ctx.running) return;
  }
}

function removeItem(ctx, item) {
  item.node.remove();
  ctx.items = ctx.items.filter((other) => other !== item);
}

function moveBucket(ctx, x) {
  ctx.bucketX = clampBucket(x);
  ctx.bucket.style.left = `${ctx.bucketX}%`;
}

function tick(ctx, now) {
  if (!ctx.running) return;
  const dt = Math.min(0.05, (now - ctx.last) / 1000);
  ctx.last = now;
  if (ctx.keyDirection) moveBucket(ctx, ctx.bucketX + ctx.keyDirection * KEY_SPEED * dt);
  ctx.untilSpawn -= dt;
  if (ctx.untilSpawn <= 0) {
    spawn(ctx);
    ctx.untilSpawn = levelSettings(ctx.level).spawn;
  }
  moveItems(ctx, dt);
  if (ctx.running) requestAnimationFrame((time) => tick(ctx, time));
}

function clearItems(ctx) {
  ctx.items.forEach((item) => item.node.remove());
  ctx.items = [];
}

function start(ctx) {
  clearItems(ctx);
  Object.assign(ctx, { caught: 0, running: true, untilSpawn: 0.4, last: performance.now() });
  ctx.count.textContent = `0 / ${ctx.goal}`;
  ctx.overlay.hidden = true;
  ctx.field.focus();
  requestAnimationFrame((time) => tick(ctx, time));
}

function showOverlay(ctx, text, buttonText) {
  ctx.running = false;
  ctx.overlayText.textContent = text;
  ctx.overlayButton.textContent = buttonText;
  ctx.overlay.hidden = false;
}

function lose(ctx) {
  showOverlay(ctx, `Oj! Det där var ingen kanelbulle. Börja om nivå ${ctx.level}.`, "Försök igen");
}

/** Finished levels and the next one can be chosen; later ones stay locked. */
const isUnlocked = (ctx, level) => level <= Math.min(LEVEL_COUNT, ctx.done + 1);

function chooseLevel(ctx, level) {
  if (ctx.running || !isUnlocked(ctx, level)) return;
  ctx.level = level;
  renderStars(ctx);
  showOverlay(ctx, `Nivå ${level}: fånga ${ctx.goal} kanelbullar!`, `Starta nivå ${level}`);
}

function starButton(ctx, level) {
  const star = element("button", level <= ctx.level ? "catch-star catch-star--on" : "catch-star", "★");
  Object.assign(star, { type: "button", disabled: !isUnlocked(ctx, level) });
  star.setAttribute("aria-label", `Nivå ${level}`);
  star.addEventListener("click", () => chooseLevel(ctx, level));
  return star;
}

/** One star per level, filled up to the level being played; clicking a star picks that level. */
function renderStars(ctx) {
  ctx.stars.replaceChildren(...Array.from({ length: LEVEL_COUNT }, (_, index) => starButton(ctx, index + 1)));
  ctx.stars.setAttribute("aria-label", `Nivå ${ctx.level} av ${LEVEL_COUNT}`);
}

async function saveProgress(ctx) {
  await ctx.progress.saveCrossword?.(ctx.key, encodeLevels(ctx.done));
  if (ctx.done === LEVEL_COUNT && !ctx.progress.isCompleted(ctx.key)) {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
  }
}

async function finishLevel(ctx) {
  clearItems(ctx);
  const finished = ctx.level;
  ctx.done = Math.max(ctx.done, finished);
  if (finished < LEVEL_COUNT) ctx.level = finished + 1;
  renderStars(ctx);
  if (finished < LEVEL_COUNT) showOverlay(ctx, `Nivå ${finished} klar! ⭐ Nästa nivå går lite fortare.`, `Starta nivå ${ctx.level}`);
  else showOverlay(ctx, `Alla ${LEVEL_COUNT} nivåer klara! 🎉`, "Spela nivå 4 igen");
  try {
    await saveProgress(ctx);
  } catch {
    ctx.overlayText.textContent = "Kunde inte spara. Försök igen.";
  }
}

const KEY_DIRECTIONS = { ArrowLeft: -1, ArrowRight: 1 };

/** The bucket follows the mouse or finger across the field, or the arrow keys while held. */
function addControls(ctx) {
  ctx.field.addEventListener("pointermove", (event) => {
    const box = ctx.field.getBoundingClientRect();
    moveBucket(ctx, ((event.clientX - box.left) / box.width) * 100);
  });
  ctx.field.addEventListener("keydown", (event) => {
    if (!(event.key in KEY_DIRECTIONS)) return;
    ctx.keyDirection = KEY_DIRECTIONS[event.key];
    event.preventDefault();
  });
  ctx.field.addEventListener("keyup", (event) => {
    if (KEY_DIRECTIONS[event.key] === ctx.keyDirection) ctx.keyDirection = 0;
  });
}

function overlay(ctx) {
  const allDone = ctx.done === LEVEL_COUNT;
  ctx.overlay = element("div", "catch-overlay");
  ctx.overlayText = element("p", "", allDone ? `Du har klarat alla ${LEVEL_COUNT} nivåer!` : `Nivå ${ctx.level}: fånga ${ctx.goal} kanelbullar!`);
  ctx.overlayButton = Object.assign(element("button", "catch-start", allDone ? "Spela nivå 4 igen" : `Starta nivå ${ctx.level}`), { type: "button" });
  ctx.overlayButton.addEventListener("click", () => start(ctx));
  ctx.overlay.append(ctx.overlayText, ctx.overlayButton);
  return ctx.overlay;
}

function buildField(ctx) {
  ctx.field = element("div", "catch-field");
  ctx.field.tabIndex = 0;
  ctx.field.setAttribute("aria-label", "Fånga kanelbullar med hinken. Styr med musen, fingret eller piltangenterna.");
  ctx.field.style.setProperty("--bucket-width", `${BUCKET_WIDTH}%`);
  ctx.bucket = picture(ctx.task.bucket, "catch-bucket");
  ctx.count = element("span", "", `0 / ${ctx.goal}`);
  ctx.counter = element("p", "catch-counter");
  ctx.counter.append(picture(ctx.task.good, "catch-counter-icon"), ctx.count);
  ctx.stars = element("div", "catch-stars");
  ctx.stars.setAttribute("role", "group");
  renderStars(ctx);
  ctx.field.append(picture(ctx.task.background, "catch-background"), ctx.bucket, ctx.counter, ctx.stars, overlay(ctx));
  moveBucket(ctx, 50);
  addControls(ctx);
  return ctx.field;
}

/**
 * Builds a catch game task.
 *
 * Args:
 *   options: { task, key, progress, card } with task.background, bucket, good, bad (one picture or a
 *   list) and goal (buns per level).
 * Returns:
 *   The elements to append to the card.
 */
export function createCatchGame({ task, key, progress, card }) {
  const done = progress.isCompleted(key) ? LEVEL_COUNT : levelsDone(progress.crosswordEntries?.(key));
  const level = Math.min(LEVEL_COUNT, done + 1);
  const ctx = { task, key, progress, card, goal: task.goal, done, level, items: [], caught: 0, running: false, keyDirection: 0, bucketX: 50 };
  return [buildField(ctx)];
}
