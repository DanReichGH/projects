// Scrub every step at 0.1 s and save frames: node tools/scrub.mjs → shots/scrub/NN_TTT.png
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
rmSync("shots/scrub", { recursive: true, force: true });
mkdirSync("shots/scrub", { recursive: true });
const only = process.argv[2] ? process.argv[2].split(",").map(Number) : null;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve("rm67-01.html")).href);
await page.waitForTimeout(1200);
// freeze the sound-word wobble so it doesn't count as change
await page.evaluate(() => { performance.now = () => 0; __rm.manual(); __rm.reset(); });
const log = [];
for (let i = 0; i < 10; i++) {
  await page.evaluate((i) => __rm.start(i), i);
  let f = 0;
  while (true) {
    const st = await page.evaluate(() => __rm.state.cur);
    if (st !== i) break;
    const r = await page.evaluate(() => __rm.advance(100, 1000 / 120));
    if (!only || only.includes(i + 1)) {
      const name = `shots/scrub/${String(i + 1).padStart(2, "0")}_${String(f).padStart(4, "0")}.png`;
      await page.locator("#fig").screenshot({ path: name });
      log.push({ name, step: i + 1, t: +(f * 0.1 + 0.1).toFixed(1), ...r });
    }
    f++;
  }
}
writeFileSync("shots/scrub/log.json", JSON.stringify(log));
console.log("frames", log.length);
await browser.close();
