import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(resolve("rm67-01.html")).href);
await page.waitForTimeout(1000);
await page.evaluate(() => { performance.now = () => 0; __rm.manual(); });
const box = await page.locator(".card").boundingBox();
// the open dial only, inside the bezel, away from the hands' sweep where possible
const clip = { x: box.x + box.width * 0.29, y: box.y + box.height * 0.3, width: box.width * 0.14, height: box.height * 0.13 };
for (const [step, label] of [[2, "rotor spins"], [3, "mainspring"], [5, "balance"]]) {
  await page.click(`#steps button[data-i='${step}']`);
  await page.evaluate(() => __rm.advance(1000));
  for (let f = 0; f < 4; f++) {
    await page.screenshot({ path: `shots/fm_${step}_${f}.png`, clip });
    await page.evaluate(() => __rm.advance(120));
  }
}
await browser.close();
