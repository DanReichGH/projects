import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto(pathToFileURL(resolve("rm67-01.html")).href);
await page.waitForTimeout(1000);
for (const a of ["golf", "skiing", "tennis", "sailing", "racing", "walk"]) {
  await page.click(`.act[data-act=${a}]`);
  const r = await page.evaluate(() => ({ slider: document.querySelector("#act").value, out: document.querySelector("#actOut").textContent, ledger: document.querySelector("#ledger").textContent.replace(/\s+/g, " ").trim(), cap: document.querySelector("#weekCap").textContent }));
  console.log(a.padEnd(8), "|", r.out, "|", r.ledger, "|", r.cap);
}
// slider drag switches back to plain walking
await page.click(".act[data-act=golf]");
await page.fill("#act", "5000");
await page.dispatchEvent("#act", "input");
console.log("after dragging:", await page.$eval(".act[aria-pressed=true]", (b) => b.dataset.act), await page.textContent("#actOut"));
// step 4 with racing cars, from empty: reserve after the day must equal the model's gain − 16 h used
await page.click(".act[data-act=racing]");
const res = await page.evaluate(() => { __rm.manual(); __rm.reset(); for (let i = 0; i < 4; i++) { __rm.start(i); let g = 0; while (__rm.state.cur >= 0 && g++ < 2000) __rm.advance(50); } return { reserve: __rm.state.S.reserve / 3600, hint: "" }; });
console.log("racing, after steps 1-4 reserve h:", res.reserve.toFixed(2), "(model: 20.0 wound − 16.0 worn ≈ 4.0, plus a little from steps 2–3)");
await page.evaluate(() => { __rm.reset(); __rm.start(0); __rm.advance(1900); __rm.start(1); __rm.advance(6100); __rm.start(2); __rm.advance(5100); __rm.start(3); __rm.advance(100); });
console.log("step 4 hint:", await page.textContent("#hint"));
await page.click(".act[data-act=sailing]");
await page.locator(".row2").screenshot({ path: "shots/acts.png" });
console.log("errors:", errs.length ? errs : "none");
await browser.close();
