// The live page: one model state, ten steps that drive it, and the drawing reading it.

const $ = (s) => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";

// ---------- gauges: flat instrument faces nothing else covers ----------
const GA = { x: 730, y: 666, r: 70 }; // power reserve
function gaugesSvg() {
  let out = `<g class="inst">`;
  // power reserve plate
  out += `<rect x="${GA.x - 92}" y="${GA.y - 98}" width="184" height="140" rx="14" class="plateFace"/>`;
  out += `<path d="M${GA.x - GA.r} ${GA.y}A${GA.r} ${GA.r} 0 0 1 ${GA.x + GA.r} ${GA.y}" class="arcBg"/>`;
  out += `<path id="resArc" d="" class="arcFill"/>`;
  let t = "";
  for (let h = 0; h <= 50; h += 5) {
    const a = Math.PI * (1 - h / 50);
    const r0 = GA.r;
    const r1_ = GA.r - (h % 10 === 0 ? 10 : 6);
    t += `M${r1(GA.x + r0 * Math.cos(a))} ${r1(GA.y - r0 * Math.sin(a))}L${r1(GA.x + r1_ * Math.cos(a))} ${r1(GA.y - r1_ * Math.sin(a))}`;
    if (h % 10 === 0) out += `<text x="${r1(GA.x + (GA.r - 19) * Math.cos(a))}" y="${r1(GA.y - (GA.r - 19) * Math.sin(a) + 4)}" class="gnum">${h}</text>`;
  }
  out += `<path d="${t}" class="k"/>`;
  out += `<path d="M${GA.x - GA.r} ${GA.y}L${GA.x + GA.r} ${GA.y}" class="k"/>`;
  out += `<g id="resGhost"><path d="M0 0L${GA.r - 4} 0" class="ghost"/></g>`;
  out += `<g id="resNeedle"><path d="M-6 -2.6L${GA.r - 12} -0.8L${GA.r - 12} 0.8L-6 2.6Z" class="needle"/></g>`;
  out += `<circle cx="${GA.x}" cy="${GA.y}" r="5" class="hub"/>`;
  out += `<text x="${GA.x}" y="${GA.y + 22}" class="glab" id="resText">0.0 h</text>`;
  out += `<text x="${GA.x}" y="${GA.y - 78}" class="gcap">power reserve</text>`;
  // beat counter + tick clock, a second plate
  const bx = 834;
  const by = 568;
  out += `<rect x="${bx}" y="${by}" width="148" height="140" rx="14" class="plateFace"/>`;
  out += `<text x="${bx + 75}" y="${by + 24}" class="gcap">beats</text>`;
  out += `<rect x="${bx + 12}" y="${by + 31}" width="124" height="36" rx="6" class="odo"/>`;
  out += `<text x="${bx + 75}" y="${by + 56}" class="odoT" id="beatText">0</text>`;
  // tick clock: a dial whose hand follows the balance, a dot that flashes each beat
  const tx = bx + 46;
  const ty = by + 102;
  out += `<circle cx="${tx}" cy="${ty}" r="22" class="tickFace"/>`;
  let tt = "";
  for (let d = -270; d <= 270; d += 45) {
    const a = ((d / 2 - 90) * Math.PI) / 180;
    tt += `M${r1(tx + 22 * Math.cos(a))} ${r1(ty + 22 * Math.sin(a))}L${r1(tx + 17 * Math.cos(a))} ${r1(ty + 17 * Math.sin(a))}`;
  }
  out += `<path d="${tt}" class="k thin"/>`;
  out += `<g id="tickHand" transform="translate(${tx} ${ty})"><path d="M0 3L0 -17" class="tickNeedle"/></g>`;
  out += `<circle cx="${tx}" cy="${ty}" r="2.6" class="hub"/>`;
  out += `<circle id="tickFlash" cx="${bx + 112}" cy="${ty - 8}" r="8" class="flash"/>`;
  out += `<text x="${bx + 112}" y="${ty + 18}" class="gsmall" id="hzText">4 Hz</text>`;
  out += `</g>`;
  return out;
}

// ---------- the page's single state ----------
let S = initial();
const V = {
  lift: 1, // watch above the wrist (put-on)
  armRot: 0, // screen-space swing, degrees
  armOut: 0, // arm slid away (take-off)
  crownOut: 0,
  fnAng: FN_ANG[0],
  spinVis: 0, // extra rotor angle drawn while time is compressed
  blur: 0,
  visRun: 0, // clock for parts too fast to draw at compressed time
  dateRoll: 0,
  dateShown: S.day0,
  speed: 1,
  sound: {},
  lit: "",
  tickFlash: 0,
  lastBeat: 0,
};
let inputs = { steps: 8000, oneWay: true };

const STEPS = [
  {
    id: "on",
    label: "Put it on",
    hint: "The watch goes on your wrist. It has no battery, and its spring is empty, so it is stopped.",
    dur: () => 1.8,
    lit: "watchLit",
  },
  {
    id: "swing",
    label: "Swing the wrist",
    hint: "When you swing your arm, a heavy platinum weight inside tries to keep hanging down, so it swings.",
    dur: () => 6,
    lit: "rotorLit",
    sound: "whirr",
  },
  {
    id: "spin",
    label: "Rotor spins",
    hint: "A big swing sends the weight all the way round. Every turn winds the spring a tiny bit.",
    dur: () => 5,
    lit: "rotorLit",
    sound: "whirr",
  },
  {
    id: "wind",
    label: "Mainspring tightens",
    hint: "A whole day on your wrist turns the weight hundreds of times. The spring in its drum coils tighter, like a wind-up toy.",
    dur: () => 10,
    lit: "barrelLit",
    sound: "click",
  },
  {
    id: "train",
    label: "Gear train turns",
    hint: "The spring pushes back slowly. A row of wheels passes the push along, each faster than the last.",
    dur: () => 6,
    lit: "trainLit",
  },
  {
    id: "beat",
    label: "Balance beats",
    hint: "The balance wheel swings back and forth 8 times a second. Each swing lets the escape wheel move one notch: tick!",
    dur: () => 8,
    lit: "balanceLit",
    sound: "tick",
  },
  {
    id: "fn",
    label: "Set the function: W → D → H",
    hint: "The crown has three jobs. The little hand at 2 o'clock shows which: W winds, D sets the date, H sets the hands.",
    dur: () => 3.4,
    lit: "fnLit",
    sound: "clack",
  },
  {
    id: "set",
    label: "Set the time",
    hint: "In H, turning the crown moves the hands. We set them to the real time.",
    dur: () => 3.6,
    lit: "handsLit",
    sound: "clack",
  },
  {
    id: "oneway",
    label: "Turn it back: OneWay",
    hint: "The weight only winds when it turns one way. Turned back, it slips freely and winds nothing.",
    dur: () => 7,
    lit: "rotorLit",
    sound: "zip",
  },
  {
    id: "off",
    label: "Take it off, watch it run down",
    hint: "Off your wrist nothing winds it. The spring lets go at a steady pace until the watch stops.",
    dur: () => (V.offDur || 12),
    lit: "gaugeLit",
    sound: "tick",
  },
];

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const env = (t, d, a = 0.8) => Math.min(ease(t / a), ease((d - t) / a));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

let cur = -1; // running step
let next = 0; // next step to press
let tStep = 0;
let mode = "manual";
let autoWait = 0;
let showMe = false;
let stepMemo = {};

// Run one step for dt screen seconds; returns the model dt and inputs to apply.
function runStep(i, t, dt) {
  const st = STEPS[i];
  const d = st.dur();
  const inp = { oneWay: inputs.oneWay, fn: S.fn };
  let speed = 1;
  let badge = null;
  const snd = {};
  switch (st.id) {
    case "on":
      V.lift = 1 - ease(t / 1.4);
      break;
    case "swing": {
      const e = env(t, d);
      const w = 2 * Math.PI * 1.1;
      inp.roll = 0.6 * e * Math.sin(w * t);
      inp.rollA = -0.6 * e * w * w * Math.sin(w * t);
      V.armRot = 3.2 * e * Math.sin(w * t);
      snd.whirr = clamp01(Math.abs(S.rotorV) / 3) * e;
      break;
    }
    case "spin": {
      const e = env(t, d, 0.9);
      inp.spin = 2 * Math.PI * 1.1 * e;
      V.armRot = 3.6 * e * Math.sin(2 * Math.PI * 1.1 * t);
      snd.whirr = e;
      break;
    }
    case "wind": {
      const real = SPEC.wornH.v * 3600;
      speed = speedOf(real, d);
      const day = dayModel({ steps: inputs.steps, oneWay: inputs.oneWay });
      inp.wear = day.gainH / SPEC.wornH.v; // reserve s per worn s
      const e = env(t, d, 0.6);
      V.spinVis += dt * 2 * Math.PI * 1.4 * e * (inputs.steps > 0 ? 1 : 0);
      V.blur = 0.55 * e * (inputs.steps > 0 ? 1 : 0);
      V.armRot = 1.8 * e * Math.sin(2 * Math.PI * 0.7 * t);
      snd.click = e * (inputs.steps > 0 ? 1 : 0);
      break;
    }
    case "train":
      snd.tick = 0.35;
      break;
    case "beat": {
      const k = ease((t - 4) / 0.6);
      speed = 1 / 8 + (1 - 1 / 8) * k;
      snd.tick = 1;
      break;
    }
    case "fn": {
      V.crownOut = ease(t / 0.4);
      const fn = t < 0.9 ? "W" : t < 2.0 ? "D" : "H";
      if (fn !== S.fn) {
        inp.fn = fn;
        V.clackT = 0;
      }
      if (fn === "D" && !stepMemo.dateSet) {
        // D: quick-set the date to today's date
        const worldDate = 20 + Math.floor(S.world / 86400);
        S = { ...S, day0: S.day0 + (worldDate - read(S).date) };
        stepMemo.dateSet = true;
      }
      snd.clack = V.clackT != null && V.clackT < 0.5 ? 1 - V.clackT / 0.5 : 0;
      break;
    }
    case "set": {
      // H: the hands go the short way round to the real time; the date stays put
      if (stepMemo.setDelta == null) {
        const wl = S.world + 2.9;
        let d = (((wl - S.watch) % 86400) + 86400) % 86400;
        if (d > 43200) d -= 86400;
        stepMemo.setDelta = d - 2.6;
        stepMemo.setDone = 0;
      }
      const a = clamp01((t - 0.3) / 2.3);
      const want = stepMemo.setDelta * ease(a) - stepMemo.setDone;
      inp.setBy = want;
      stepMemo.setDone += want;
      if (t > 0.3 && t < 2.6) badge = Math.abs(stepMemo.setDelta) / 2.3;
      if (t > 2.9 && S.fn !== "W") {
        inp.fn = "W";
        V.clackT = 0;
      }
      V.crownOut = 1 - ease((t - 2.9) / 0.4);
      snd.clack = V.clackT != null && V.clackT < 0.5 ? 1 - V.clackT / 0.5 : 0;
      break;
    }
    case "oneway": {
      const back = t < 3.2;
      const e = back ? env(t, 3.2, 0.6) : env(t - 3.4, d - 3.4, 0.6);
      inp.spin = (back ? -1 : 1) * 2 * Math.PI * 1.0 * e;
      V.armRot = (back ? -3.6 : 3.6) * e * Math.sin(2 * Math.PI * 1.0 * t);
      if (back) snd.zip = e;
      else snd.whirr = e;
      break;
    }
    case "off": {
      V.armOut = ease(t / 1.4);
      if (t < 1.6) break;
      if (stepMemo.r0 == null) {
        stepMemo.r0 = S.reserve;
        // run down at a pace the minute hand can still be followed
        stepMemo.runDur = Math.max(3, Math.min(31, S.reserve / 5760));
        V.offDur = 1.6 + stepMemo.runDur + 1.6;
      }
      const tr = t - 1.6;
      if (tr < stepMemo.runDur) {
        speed = stepMemo.r0 > 0 ? stepMemo.r0 / stepMemo.runDur : 1;
        inp.worn = false;
      } else speed = 1;
      snd.tick = S.reserve > 0 ? 0.6 : 0;
      break;
    }
  }
  if (V.clackT != null) V.clackT += dt;
  return { inp, speed, snd, badge: badge ?? speed };
}

let lastRealDt = 0;
let badgeNow = 1;
function advance(dt) {
  lastRealDt = dt;
  let speed = 1;
  let snd = {};
  if (cur >= 0) {
    const r = runStep(cur, tStep, dt);
    speed = r.speed;
    snd = r.snd;
    badgeNow = r.badge;
    // integrate the model: small substeps when the rotor is live, one when time is compressed
    const simDt = dt * speed;
    const live = r.inp.roll != null || r.inp.spin != null;
    const n = live ? Math.max(1, Math.ceil(dt * 240)) : 1;
    const inp = { ...r.inp };
    const setBy = inp.setBy || 0;
    for (let k = 0; k < n; k++) {
      inp.setBy = k === 0 ? setBy : 0;
      const before = inp.setBy ? Math.floor(S.watch / 86400) : null;
      S = step(S, simDt / n, inp);
      if (before != null) S = { ...S, day0: S.day0 + before - Math.floor(S.watch / 86400) };
      if (inp.fn) delete inp.fn;
    }
    tStep += dt;
    if (tStep >= STEPS[cur].dur()) finishStep();
  } else {
    S = step(S, dt, { worn: V.armOut < 0.5, oneWay: inputs.oneWay });
    if (mode === "auto" || showMe) {
      autoWait -= dt;
      if (autoWait <= 0) {
        if (next >= STEPS.length) {
          if (mode === "auto") {
            reset();
            autoWait = 0.6;
          } else showMe = false;
        } else startStep(next);
      }
    }
  }
  V.speed += (speed - V.speed) * (speed > V.speed * 4 || speed < V.speed / 4 ? 1 : 1 - Math.exp(-dt * 8));
  V.speedShown = cur >= 0 ? badgeNow : 1;
  V.sound = snd;
  // parts too quick to draw at compressed time run on a capped clock
  const R = read(S);
  if (R.running) V.visRun += dt * Math.min(speed, 1);
  V.blurNow = V.blur;
  if (cur < 0 || STEPS[cur].id !== "wind") V.blur *= Math.exp(-dt * 6);
  return R;
}

function startStep(i) {
  cur = i;
  tStep = 0;
  stepMemo = {};
  V.clackT = null;
  if (STEPS[i].id === "off") V.offDur = 12;
  renderButtons();
  setHint(STEPS[i].hint);
}

function finishStep() {
  const done = STEPS[cur].id;
  cur = -1;
  next++;
  V.armRot = 0;
  autoWait = 0.9;
  if (done === "off") autoWait = 2.5;
  renderButtons();
  setHint(next < STEPS.length ? "Next: " + STEPS[next].label.replace(/:.*$/, "") + "." : "It stopped: the spring is empty. Start over, or try the sliders below.");
}

function reset() {
  S = initial();
  Object.assign(V, { lift: 1, armRot: 0, armOut: 0, crownOut: 0, fnAng: FN_ANG[0], spinVis: 0, blur: 0, visRun: 0, speed: 1, dateShown: S.day0, dateRoll: 0 });
  cur = -1;
  next = 0;
  tStep = 0;
  autoWait = 0.8;
  stepMemo = {};
  renderButtons();
  setHint("A watch with no battery. Press 1 to put it on.");
}

// ---------- drawing the state ----------
const el = {};
function grab() {
  for (const id of [
    "armSwing", "armBody", "cushion", "watchG", "strapG", "hourH", "minH", "fnHandR", "dateStrip", "crown",
    "rotor", "rotorLow", "rotorBlur", "barrelDrum", "ratchet", "spring", "click", "oneway", "reduce", "centre", "third",
    "fourth", "esc", "pallet", "balance", "hair", "tickHand", "tickFlash", "resNeedle", "resGhost", "resArc", "resText",
    "beatText", "speedG", "speedT", "readout", "watchShade", "hzText",
  ]) el[id] = document.getElementById(id);
  el.snd = {};
  for (const k of ["whirr", "click", "tick", "clack", "zip"]) el.snd[k] = document.getElementById("snd-" + k);
  el.lit = document.querySelectorAll("[data-lit]");
}

const ELBOW = pr(PM, 0, -40, 30); // the swing pivots near the forearm, so the hand stays clear of the inset
let ghostH = 50;

function draw(R) {
  const tr = (n, v) => n && n.setAttribute("transform", v);
  tr(el.armSwing, `rotate(${r3(V.armRot)} ${r1(ELBOW[0])} ${r1(ELBOW[1])})`);
  const out = V.armOut;
  tr(el.armBody, `translate(${r1(out * 300 * Math.cos(Math.PI / 6))} ${r1(out * 300 * 0.5)})`);
  el.armBody.style.opacity = r3(1 - ease(out * 1.2));
  el.cushion.style.opacity = r3(ease((out - 0.15) / 0.6));
  tr(el.watchG, `translate(0 ${r1(-V.lift * 70)})`);
  el.strapG.style.opacity = r3(clamp01((0.35 - V.lift) / 0.35));
  el.watchShade.style.opacity = r3(1 - V.lift);
  // hands, function hand, crown
  tr(el.hourH, `rotate(${r3(R.hourDeg)})`);
  tr(el.minH, `rotate(${r3(R.minDeg)})`);
  const fnI = "WDH".indexOf(S.fn);
  V.fnAng += (FN_ANG[fnI] - V.fnAng) * (1 - Math.exp(-lastRealDt * 14));
  const fd = clockDir((2 / 12) * Math.PI * 2);
  const axis = Math.atan2(fd[1], fd[0]);
  tr(el.fnHandR, `rotate(${r3(((axis + V.fnAng) * 180) / Math.PI)})`);
  const cdx = V.crownOut * 1.8;
  tr(el.crown, `translate(${r1(cdx * C30 * PM.k)} ${r1(cdx * 0.5 * PM.k)})`);
  // date strip rolls toward the date the model shows
  const target = R.date;
  if (target !== V.dateShown) {
    V.dateRoll += lastRealDt / 0.45;
    if (V.dateRoll >= 1) {
      V.dateShown = target;
      V.dateRoll = 0;
    }
  }
  const dr = ease(V.dateRoll);
  const nxt = target;
  el.dateStrip.innerHTML = dateDigits(V.dateShown, 0) + dateDigits(nxt, 8.2);
  tr(el.dateStrip, `translate(0 ${r3(-dr * 8.2)})`);
  // movement
  const rot = R.rotorDeg + (V.spinVis * 180) / Math.PI;
  tr(el.rotor, `rotate(${r3(rot)})`);
  tr(el.rotorLow, `rotate(${r3(rot)})`);
  el.rotorBlur.style.opacity = r3(V.blur);
  tr(el.barrelDrum, `rotate(${r3(R.barrelDeg)})`);
  tr(el.ratchet, `rotate(${r3(R.ratchetDeg)})`);
  el.spring.setAttribute("d", spiralPath(R.reserveFrac, (R.ratchetDeg * Math.PI) / 180));
  const toothPhase = ((-R.ratchetDeg / 9) % 1 + 1) % 1;
  tr(el.click, `rotate(${r3(-7 * Math.sin(Math.PI * toothPhase) ** 2)})`);
  tr(el.oneway, `rotate(${r3(-rot * 2.4)})`);
  tr(el.reduce, `rotate(${r3(R.ratchetDeg * -1.8)})`);
  tr(el.centre, `rotate(${r3(R.centreDeg)})`);
  const vr = V.visRun;
  tr(el.third, `rotate(${r3(-(vr / 3600) * 360 * 7.5)})`);
  tr(el.fourth, `rotate(${r3((vr / 60) * 360)})`);
  tr(el.esc, `rotate(${r3(-escAngle(vr))})`);
  const amp = R.amp;
  const bal = amp > 0 ? amp * Math.sin(2 * Math.PI * HZ * vr) : 0;
  tr(el.balance, `rotate(${r3(bal)})`);
  el.hair.setAttribute("d", hairPath(bal));
  tr(el.pallet, `rotate(${r3(9 * Math.tanh(bal / 25))})`);
  // gauges
  const fr = Math.max(0, Math.min(1, R.reserveFrac));
  tr(el.resNeedle, `translate(${GA.x} ${GA.y}) rotate(${r3(-180 + 180 * fr)})`);
  tr(el.resGhost, `translate(${GA.x} ${GA.y}) rotate(${r3(-180 + (180 * ghostH) / SPEC.reserveH.v)})`);
  const a = Math.PI * (1 - fr);
  el.resArc.setAttribute("d", fr > 0.002 ? `M${GA.x - GA.r + 5} ${GA.y}A${GA.r - 5} ${GA.r - 5} 0 0 1 ${r1(GA.x + (GA.r - 5) * Math.cos(a))} ${r1(GA.y - (GA.r - 5) * Math.sin(a))}` : "");
  el.resText.textContent = fmtH(R.reserveH) + " h";
  el.beatText.textContent = R.beats.toLocaleString("en-US");
  tr(el.tickHand, `translate(${GA.tx || 264} ${GA.ty || 560}) rotate(${r3(bal / 2)})`);
  if (R.beats !== V.lastBeat) {
    V.tickFlash = 1;
    V.lastBeat = R.beats;
  }
  V.tickFlash *= Math.exp(-lastRealDt * 18);
  el.tickFlash.style.opacity = r3(V.speed <= 1.01 ? V.tickFlash : R.running ? 0.6 : 0);
  el.hzText.textContent = R.running ? "4 Hz" : "stopped";
  // speed badge, from the real seconds each screen second stands for
  const sp = V.speedShown;
  const showSpeed = cur >= 0 && STEPS[cur].id !== "on";
  el.speedG.style.opacity = showSpeed ? 1 : 0;
  el.speedT.textContent = speedLabel(sp);
  // sound words
  for (const k in el.snd) {
    const v = V.sound[k] || 0;
    const n = el.snd[k];
    n.style.opacity = r3(v);
    const wob = k === "tick" ? Math.sin(performance.now() / 60) : Math.sin(performance.now() / 120);
    n.setAttribute("transform", `rotate(${r3(wob * 3)} ${n.dataset.x} ${n.dataset.y})`);
  }
  // highlight
  const lit = cur >= 0 ? STEPS[cur].lit : "";
  for (const n of el.lit) n.classList.toggle("lit", n.dataset.lit === lit);
  writeReadout(R);
}

function dateDigits(d, y) {
  const s = String(d).padStart(2, "0");
  return `<text x="0" y="${r3(y - 0.6)}" class="dnum">${s[0]}</text><text x="0" y="${r3(y + 3.1)}" class="dnum">${s[1]}</text>`;
}

const pad = (n) => String(n).padStart(2, "0");
// one formatter for hours of reserve, so every place shows the same number
const fmtH = (h) => h.toFixed(h < 1 ? 2 : 1);
function writeReadout(R) {
  const w = R.worldTod;
  const chips = $("#live");
  if (!chips) return;
  const set = (k, v) => {
    const n = chips.querySelector(`[data-k="${k}"]`);
    if (n && n.textContent !== v) n.textContent = v;
  };
  set("reserve", fmtH(R.reserveH) + " h of 50 h");
  set("beats", R.beats.toLocaleString("en-US") + " beats");
  set("watch", `watch ${pad(R.hh)}:${pad(R.mm)} · date ${R.date}`);
  set("world", `real ${pad(Math.floor(w / 3600))}:${pad(Math.floor((w % 3600) / 60))}`);
  set("turns", (S.wound / (2 * Math.PI)).toFixed(1) + " winding rotor turns");
  set("amp", R.running ? `balance ${Math.round(R.amp)}° amplitude` : "balance at rest");
  set("fn", "crown: " + { W: "W winding", D: "D date", H: "H hands" }[S.fn]);
  $("#readout").textContent = R.running ? `${fmtH(R.reserveH)} h left · ${R.beats.toLocaleString("en-US")} beats` : `stopped · ${fmtH(R.reserveH)} h`;
}

// ---------- page ----------
function setHint(s) {
  const h = $("#hint");
  if (h.textContent !== s) h.textContent = s;
}

function renderButtons() {
  const list = $("#steps");
  list.querySelectorAll("button").forEach((b, i) => {
    const state = i === cur ? "running" : i < next ? "done" : i === next && cur < 0 ? "next" : "later";
    b.dataset.state = state;
    b.disabled = !(state === "next" && mode === "manual" && !showMe);
    b.classList.toggle("pulse", state === "next" && mode === "manual" && !showMe);
  });
  document.querySelectorAll(".mode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
}

function buildPage() {
  const svg = $("#fig");
  svg.innerHTML = `
  <defs>
    <pattern id="tptP" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
      <rect width="6" height="6" fill="#4f535c"/><path d="M0 1.2H6M0 3.6H6" stroke="#2f3238" stroke-width="1.1"/><path d="M0 4.8H6" stroke="#8b8f98" stroke-width=".6"/>
    </pattern>
  </defs>
  <clipPath id="cardClip"><rect x="0" y="0" width="${W}" height="${H}" rx="22"/></clipPath><rect x="0" y="0" width="${W}" height="${H}" rx="22" class="paper"/><g clip-path="url(#cardClip)">
  <g id="armSwing">
    <g id="armBody">${armSvg()}</g>
    <g id="cushion" style="opacity:0">${cushionSvg()}</g>
    <path id="watchShade" class="skinShade" d="${pathOf(hull(tonneau(CASE.a, CASE.b, CASE.n).map(([X, Y]) => pr(PM, Y - 3.5, X - 1.5, 35.4))))}"/>
    <g id="strapG">${strapSvg()}</g>
    <g id="watchG" data-lit="watchLit">${watchSvg()}</g>
  </g>
  <g id="insetG">
    <text x="${PI_.ox - 236}" y="84" class="incap">the same watch, turned over:</text>
    <text x="${PI_.ox - 236}" y="106" class="incap">through the caseback, rotor lifted</text>
    ${insetSvg()}
  </g>
  ${gaugesSvg()}
  </g><g class="figlab"><rect x="14" y="14" width="78" height="38" rx="12" class="labBg"/><text x="26" y="42" class="figno">Fig. 1</text></g><text x="${W - 26}" y="40" class="figtitle">RM 67-01 · caliber CRMA6</text><g id="speedG" style="opacity:0"><rect x="${W / 2 - 52}" y="20" width="104" height="34" rx="17" class="badge"/><text id="speedT" x="${W / 2}" y="43" class="badgeT">×1</text></g>
  ${soundWord("whirr", "whirr", PI_.ox - 196, 214, -8)}
  ${soundWord("zip", "zzzip… slips", PI_.ox - 200, 214, -8)}
  ${soundWord("click", "click-click", PI_.ox + 150, 150, 6)}
  ${soundWord("tick", "tick-tick-tick-tick", PI_.ox + 60, 420, -4)}
  ${soundWord("clack", "clack!", 486, 150, -6)}
  `;
  // highlight groups on the movement
  const mark = (sel, lit) => {
    const n = typeof sel === "string" ? document.getElementById(sel) : sel;
    if (n) n.setAttribute("data-lit", lit);
  };
  mark("rotorTop", "rotorLit");
  for (const id of ["third", "fourth", "centre", "esc"]) mark(document.getElementById(id).parentNode, "trainLit");
  mark("balanceG", "balanceLit");
  mark(document.getElementById("pallet").parentNode, "balanceLit");
  mark(document.getElementById("barrelDrum").parentNode, "barrelLit");
  mark("fnDial", "fnLit");
  mark("crown", "fnLit");
  mark("hourH", "handsLit");
  mark("minH", "handsLit");
  document.querySelector(".inst").setAttribute("data-lit", "gaugeLit");
  GA.tx = 264;
  GA.ty = 560;
  grab();
  // tick-clock hand position from the plate
  const tc = document.querySelector(".tickFace");
  GA.tx = +tc.getAttribute("cx");
  GA.ty = +tc.getAttribute("cy");

  // step buttons
  const list = $("#steps");
  list.innerHTML = STEPS.map((s, i) => `<li><button type="button" data-i="${i}"><span class="n">${i + 1}</span><span class="l">${s.label}</span></button></li>`).join("");
  list.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const i = +b.dataset.i;
    if (i === next && cur < 0) startStep(i);
  });
  document.querySelectorAll(".mode button").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      try {
        localStorage.setItem("rm67-mode", mode);
      } catch {}
      autoWait = 0.4;
      renderButtons();
    }),
  );
  $("#restart").addEventListener("click", (e) => {
    e.preventDefault();
    showMe = false;
    reset();
  });
  $("#showme").addEventListener("click", () => {
    reset();
    showMe = true;
    autoWait = 0.3;
    renderButtons();
    $("#fig").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  // swatches
  document.querySelectorAll(".sw").forEach((b) =>
    b.addEventListener("click", () => {
      applyVariant(b.dataset.v);
      document.querySelectorAll(".sw").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );
  // sliders
  const act = $("#act");
  const wind = document.querySelectorAll("input[name=wind]");
  const upd = () => {
    inputs.steps = +act.value;
    inputs.oneWay = document.querySelector("input[name=wind]:checked").value === "one";
    ledger();
  };
  act.addEventListener("input", upd);
  wind.forEach((w) => w.addEventListener("change", upd));
  upd();
  try {
    const m = localStorage.getItem("rm67-mode");
    if (m === "auto" || m === "manual") mode = m;
  } catch {}
  reset();
}

function soundWord(k, text, x, y, rot) {
  return `<text id="snd-${k}" data-x="${x}" data-y="${y}" x="${x}" y="${y}" class="snd" style="opacity:0" transform="rotate(${rot} ${x} ${y})">${text}</text>`;
}

const VARIANTS = {
  titanium: { cs: ["#e6e8ea", "#c4c9ce", "#9ba2aa"], st: ["#5a5f70", "#3f4352", "#2b2e3b"], ac: ["#ffb3a3", "#ec5a43", "#b9402e"], tpt: false },
  carbon: { cs: ["#7a7e87", "#5a5e67", "#41444c"], st: ["#5a5f70", "#3f4352", "#2b2e3b"], ac: ["#b9f0d8", "#3fbf8f", "#2b8a66"], tpt: true },
  white: { cs: ["#e6e8ea", "#c4c9ce", "#9ba2aa"], st: ["#ffffff", "#ebe7de", "#cfc9bc"], ac: ["#a9c8ff", "#3f74d8", "#2c55a3"], tpt: false },
  blue: { cs: ["#e6e8ea", "#c4c9ce", "#9ba2aa"], st: ["#8fb2ea", "#4f7fcf", "#365fa3"], ac: ["#ffe3a0", "#f2b632", "#c48b12"], tpt: false },
  red: { cs: ["#e6e8ea", "#c4c9ce", "#9ba2aa"], st: ["#f39a8f", "#dc4f43", "#a8362e"], ac: ["#ffd9d4", "#ffffff", "#e8e2d8"], tpt: false },
};

function applyVariant(v) {
  const p = VARIANTS[v];
  const r = document.documentElement.style;
  p.cs.forEach((c, i) => r.setProperty("--cs" + i, c));
  p.st.forEach((c, i) => r.setProperty("--st" + i, c));
  p.ac.forEach((c, i) => r.setProperty("--ac" + i, c));
  for (const id of ["tptTop", "tptInset"]) {
    const n = document.getElementById(id);
    const src = document.getElementById(id === "tptTop" ? "caseTop" : "insetTop");
    n.setAttribute("d", p.tpt ? src.getAttribute("d") : "");
  }
}

function ledger() {
  const d = dayModel({ steps: inputs.steps, oneWay: inputs.oneWay });
  ghostH = d.steady;
  const f = (v) => (Math.abs(v) < 0.05 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v).toFixed(1));
  $("#actOut").textContent = inputs.steps.toLocaleString("en-US") + " steps a day";
  $("#ledger").innerHTML = `
    <span class="chip"><b>${Math.round(d.turns).toLocaleString("en-US")}</b> winding rotor turns <i class="src est">est.</i></span>
    <span class="chip">wound <b>${f(d.gainH)} h</b></span>
    <span class="chip">used <b>−24.0 h</b></span>
    <span class="chip ${d.netH < 0 ? "bad" : "good"}">net <b>${f(d.netH)} h</b> a day</span>
    <span class="chip">${d.stoppedAt != null ? `stops after <b>${(d.stoppedAt / 24).toFixed(1)} days</b>` : `keeps going: <b>${d.steady.toFixed(0)} h</b> left at bedtime`}</span>
    <span class="chip">break-even ≈ <b>${d.breakEven.toLocaleString("en-US")}</b> steps <i class="src est">est.</i></span>`;
  // a week, hour by hour
  const sp = $("#week");
  const w = 300;
  const h = 64;
  const pts = d.trace.map((r, i) => `${r1((i / (d.trace.length - 1)) * w)},${r1(h - (r / 50) * h)}`);
  let nights = "";
  for (let k = 0; k < 7; k++) nights += `<rect x="${r1(((k * 24 + 16) / 167) * w)}" y="0" width="${r1((8 / 167) * w)}" height="${h}" class="night"/>`;
  sp.innerHTML = `${nights}<polyline points="0,${h} ${pts.join(" ")} ${w},${h}" class="wkFill"/><polyline points="${pts.join(" ")}" class="wkLine"/><line x1="0" y1="${h}" x2="${w}" y2="${h}" class="wkAxis"/>`;
  $("#weekCap").textContent = d.stoppedAt != null ? `Starting full, it stops on day ${Math.ceil(d.stoppedAt / 24)}.` : `Starting full, it never stops. Grey bands are nights on the nightstand.`;
}

// ---------- loop ----------
let last = null;
let visible = true;
let manualClock = false;
function frame(now) {
  if (!manualClock) {
    if (last == null) last = now;
    const speed = window.__driveSpeed || 1;
    const dt = Math.min(0.05, ((now - last) / 1000) * 1);
    last = now;
    if (visible) draw(advance(dt * (speed === 1 ? 1 : 1)));
  }
  requestAnimationFrame(frame);
}

window.__rm = {
  // test hooks: drive the page on a fixed clock
  manual(on = true) {
    manualClock = on;
    last = null;
  },
  advance(ms, sub = 1000 / 60) {
    let left = ms / 1000;
    let R = read(S);
    while (left > 1e-9) {
      const d = Math.min(left, sub / 1000);
      R = advance(d);
      left -= d;
    }
    draw(R);
    return { step: cur, t: tStep, reserveH: R.reserveH, beats: R.beats, date: R.date, hh: R.hh, mm: R.mm, fn: S.fn, speed: V.speedShown, rotor: R.rotorDeg };
  },
  start(i) {
    if (i === next && cur < 0) startStep(i);
  },
  get state() {
    return { cur, next, tStep, S, V };
  },
  reset,
  model: { read, step, dayModel, SPEC },
};

buildPage();
applyVariant("titanium");
const io = new IntersectionObserver((es) => (visible = es[0].isIntersecting));
io.observe($("#fig"));
requestAnimationFrame(frame);
