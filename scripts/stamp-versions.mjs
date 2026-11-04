/**
 * Stamps every local module and stylesheet in index.html with a content hash, so a browser
 * never combines old cached files with new ones after a deploy.
 *
 * Usage: node scripts/stamp-versions.mjs           (updates index.html)
 *        node scripts/stamp-versions.mjs --check   (exits 1 if index.html is out of date)
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const INDEX = join(ROOT, "index.html");
const MODULE_DIRS = ["", "lib"];
const IMPORT_MAP = /<script type="importmap">[\s\S]*?<\/script>/;

const hashOf = (path) => createHash("sha256").update(readFileSync(join(ROOT, path))).digest("hex").slice(0, 10);
const stamped = (path) => `./${path}?v=${hashOf(path)}`;

function modulePaths() {
  return MODULE_DIRS.flatMap((dir) =>
    readdirSync(join(ROOT, dir))
      .filter((name) => name.endsWith(".js"))
      .map((name) => (dir ? `${dir}/${name}` : name)),
  ).sort();
}

function importMap() {
  const imports = Object.fromEntries(modulePaths().map((path) => [`./${path}`, stamped(path)]));
  const json = JSON.stringify({ imports }, null, 2).replace(/\n/g, "\n  ");
  return `<script type="importmap">\n  ${json}\n  </script>`;
}

function stampIndex(html) {
  if (!IMPORT_MAP.test(html)) throw new Error('index.html needs a <script type="importmap"> block');
  return html
    .replace(IMPORT_MAP, importMap())
    .replace(/href="\.?\/?style\.css(\?v=[0-9a-f]*)?"/, `href="${stamped("style.css")}"`)
    .replace(/src="\.?\/?app\.js(\?v=[0-9a-f]*)?"/, `src="${stamped("app.js")}"`);
}

const current = readFileSync(INDEX, "utf8");
const updated = stampIndex(current);
if (process.argv.includes("--check")) {
  if (updated !== current) {
    console.error("index.html version stamps are out of date: run node scripts/stamp-versions.mjs");
    process.exit(1);
  }
} else if (updated !== current) {
  writeFileSync(INDEX, updated);
  console.log("index.html version stamps updated");
} else {
  console.log("index.html version stamps already up to date");
}
