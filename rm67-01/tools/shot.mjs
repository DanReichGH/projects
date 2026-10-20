// node tools/shot.mjs out.png [width] [js-to-run-before-shot]
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");

const [out = "shots/page.png", width = "1440", pre = ""] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +width, height: 1000 }, deviceScaleFactor: 1.5 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await page.goto(pathToFileURL(resolve("rm67-01.html")).href);
await page.waitForTimeout(1200);
if (pre) console.log(JSON.stringify(await page.evaluate(pre)));
await page.waitForTimeout(100);
const sel = process.argv[5];
if (sel) await page.locator(sel).first().screenshot({ path: out });
else await page.screenshot({ path: out, fullPage: true });
const scroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log("errors:", errs.length ? errs : "none", "| sideways scroll:", scroll);
await browser.close();
