// Mid-step stills of every step, plus a contact sheet: node tools/stills.mjs
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await page.goto(pathToFileURL(resolve("rm67-01.html")).href);
await page.waitForTimeout(1200);
await page.evaluate(() => { __rm.manual(); __rm.reset(); });
const durs = await page.evaluate(() => [1.8, 6, 5, 10, 6, 8, 3.4, 3.6, 7, null]);
for (let i = 0; i < 10; i++) {
  await page.evaluate((i) => __rm.start(i), i);
  let mid = durs[i] != null ? durs[i] / 2 : null;
  if (mid == null) {
    await page.evaluate(() => __rm.advance(1700));
    const st = await page.evaluate(() => __rm.state.V.offDur);
    mid = st / 2 - 1.7;
  }
  const r = await page.evaluate((ms) => __rm.advance(ms), mid * 1000);
  const hint = await page.textContent("#hint");
  const chk = await page.evaluate(() => {
    const { S } = __rm.state;
    const R = __rm.model.read(S);
    const h = R.reserveH.toFixed(R.reserveH < 1 ? 2 : 1);
    const beats = R.beats.toLocaleString("en-US");
    const t = (sel) => document.querySelector(sel).textContent;
    const bad = [];
    if (t("#resText") !== h + " h") bad.push("gauge " + t("#resText") + " vs " + h);
    if (!t("#readout").includes(h + " h")) bad.push("readout " + t("#readout"));
    if (!t('[data-k="reserve"]').startsWith(h + " h")) bad.push("chip " + t('[data-k="reserve"]'));
    if (t("#beatText") !== beats) bad.push("counter " + t("#beatText") + " vs " + beats);
    if (!t('[data-k="beats"]').startsWith(beats)) bad.push("beats chip");
    if (!t('[data-k="watch"]').includes("date " + R.date)) bad.push("date chip");
    // text that must fit its box
    const inside = (a, b) => { const p = document.querySelector(a).getBBox(), q = document.querySelector(b).getBBox(); return p.x >= q.x && p.y >= q.y && p.x + p.width <= q.x + q.width && p.y + p.height <= q.y + q.height; };
    if (!inside("#beatText", ".odo")) bad.push("beat counter overflows");
    if (!inside("#resText", ".plateFace")) bad.push("reserve text overflows");
    const sp = document.querySelector("#speedT").getBBox(), bg = document.querySelector("#speedG rect").getBBox();
    if (sp.width > bg.width - 8) bad.push("speed badge overflows");
    return bad;
  });
  await page.locator(".card").screenshot({ path: `shots/step${i + 1}.png` });
  console.log(`step ${i + 1}`, JSON.stringify(r), "|", hint, "| checks:", chk.length ? chk : "ok");
  await page.evaluate(() => { let g = 0; while (__rm.state.cur >= 0 && g++ < 4000) __rm.advance(50); });
}
console.log("errors:", errs.length ? errs : "none");
await browser.close();
