// Scrub the flip at 0.1 s and measure pixels changed per frame; save a sheet.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
mkdirSync("shots/flip", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto(pathToFileURL(resolve("rm67-01.html")).href);
await page.waitForTimeout(1000);
await page.evaluate(() => { performance.now = () => 0; __rm.manual(); __rm.reset(); __rm.advance(500); });
let n = 0;
for (const dir of ["over", "back"]) {
  await page.click("#flip");
  for (let f = 0; f < 14; f++) {
    await page.evaluate(() => __rm.advance(100));
    await page.locator("#fig").screenshot({ path: `shots/flip/${dir}_${String(f).padStart(2, "0")}.png` });
    n++;
  }
}
console.log("frames", n, "errors:", errs.length ? errs : "none", "| button:", await page.textContent("#flip"));
await browser.close();
