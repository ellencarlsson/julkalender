/**
 * Catch game: buns and apples fall from a tree and the player moves a bucket under them. Catching
 * the goal number of buns completes the task; catching a single apple ends the round.
 */
import { BUCKET_WIDTH, clampBucket, crossesRim, fallSpeed, isOverBucket, pickKind, spawnX } from "./lib/catch.js";

// Where the bucket rim is drawn: the bucket sits at the bottom and its rim is about 29% down the picture.
const RIM_Y = 79;
const BAD_CHANCE = 0.3;
const SPAWN_EVERY_S = [1.0, 0.55];
const KEY_SPEED = 70;
const CROWN_TOP = 12;
const CROWN_HEIGHT = 36;

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

function spawn(ctx) {
  const kind = pickKind(Math.random, BAD_CHANCE);
  const item = { kind, x: spawnX(Math.random), y: CROWN_TOP + Math.random() * CROWN_HEIGHT };
  item.node = picture(kind === "good" ? ctx.task.good : ctx.task.bad, `catch-item catch-item--${kind}`);
  place(item.node, item.x, item.y);
  ctx.field.append(item.node);
  ctx.items.push(item);
}

/** Spawns come quicker as the round goes on, from one a second down to about two a second. */
function spawnDelay(ctx) {
  const [slow, fast] = SPAWN_EVERY_S;
  return slow - (slow - fast) * Math.min(1, ctx.caught / ctx.goal);
}

function land(ctx, item) {
  if (item.kind === "bad") return lose(ctx);
  ctx.caught++;
  ctx.count.textContent = `${ctx.caught} / ${ctx.goal}`;
  if (ctx.caught >= ctx.goal) win(ctx);
}

/** Moves every item down; items that pass the rim above the bucket are caught, the rest fall away. */
function moveItems(ctx, dt) {
  const speed = fallSpeed(ctx.caught);
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
    ctx.untilSpawn = spawnDelay(ctx);
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
  showOverlay(ctx, "Oj! Du fångade ett äpple 🍎 Börja om och fånga bara kanelbullar.", "Försök igen");
}

async function win(ctx) {
  clearItems(ctx);
  showOverlay(ctx, `Du fångade ${ctx.goal} kanelbullar! 🎉`, "Spela igen");
  if (ctx.progress.isCompleted(ctx.key)) return;
  try {
    await ctx.progress.complete(ctx.key);
    ctx.card.classList.add("task--done");
  } catch {
    ctx.overlayText.textContent = "Kunde inte spara. Spela igen och försök på nytt.";
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

function overlay(ctx, done) {
  ctx.overlay = element("div", "catch-overlay");
  ctx.overlayText = element("p", "", done ? `Du har redan fångat ${ctx.goal} kanelbullar!` : `Fånga ${ctx.goal} kanelbullar!`);
  ctx.overlayButton = Object.assign(element("button", "catch-start", done ? "Spela igen" : "Starta"), { type: "button" });
  ctx.overlayButton.addEventListener("click", () => start(ctx));
  ctx.overlay.append(ctx.overlayText, ctx.overlayButton);
  return ctx.overlay;
}

function buildField(ctx, done) {
  ctx.field = element("div", "catch-field");
  ctx.field.tabIndex = 0;
  ctx.field.setAttribute("aria-label", "Fånga kanelbullar med hinken. Styr med musen, fingret eller piltangenterna.");
  ctx.field.style.setProperty("--bucket-width", `${BUCKET_WIDTH}%`);
  ctx.bucket = picture(ctx.task.bucket, "catch-bucket");
  ctx.count = element("span", "", `0 / ${ctx.goal}`);
  ctx.counter = element("p", "catch-counter");
  ctx.counter.append(picture(ctx.task.good, "catch-counter-icon"), ctx.count);
  ctx.field.append(picture(ctx.task.background, "catch-background"), ctx.bucket, ctx.counter, overlay(ctx, done));
  moveBucket(ctx, 50);
  addControls(ctx);
  return ctx.field;
}

/**
 * Builds a catch game task.
 *
 * Args:
 *   options: { task, key, progress, card } with task.background, bucket, good, bad and goal.
 * Returns:
 *   The elements to append to the card.
 */
export function createCatchGame({ task, key, progress, card }) {
  const ctx = { task, key, progress, card, goal: task.goal, items: [], caught: 0, running: false, keyDirection: 0, bucketX: 50 };
  return [buildField(ctx, progress.isCompleted(key))];
}
