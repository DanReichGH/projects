// Builds the standalone page: node build.mjs → rm67-01.html
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(HERE, "src", f), "utf8");

const model = src("model.mjs").replace(/^export /gm, "");
const js = [model, src("geo.js"), src("art.js"), src("app.js")].join("\n\n");
const page = src("page.html").replace("/*CSS*/", () => src("style.css")).replace("/*JS*/", () => js);
writeFileSync(join(HERE, "rm67-01.html"), page);
// the deployable site: just the page, as index.html
mkdirSync(join(HERE, "site"), { recursive: true });
writeFileSync(join(HERE, "site", "index.html"), page);
console.log("wrote rm67-01.html", (page.length / 1024).toFixed(0) + " KB");
