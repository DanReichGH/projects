// One small model of the RM 67-01 (caliber CRMA6). Every number the page shows
// comes from here. Pure: no DOM, no clock, no randomness.
//
// source: "rm"   = Richard Mille's published RM 67-01 / CRMA6 specification
//         "std"  = industry standard for a Swiss lever movement; CRMA6 value not published
//         "est"  = our estimate, flagged on the page; not published anywhere

export const SPEC = {
  caseW: { v: 38.7, unit: "mm", src: "rm", note: "case width (RM lists 38.70)" },
  caseH: { v: 47.52, unit: "mm", src: "rm", note: "case length, 12 to 6" },
  caseT: { v: 7.75, unit: "mm", src: "rm", note: "case thickness" },
  movW: { v: 29.1, unit: "mm", src: "rm", note: "CRMA6 width" },
  movH: { v: 31.25, unit: "mm", src: "rm", note: "CRMA6 length" },
  movT: { v: 3.6, unit: "mm", src: "rm", note: "CRMA6 thickness" },
  vph: { v: 28800, unit: "vph", src: "rm", note: "balance frequency" },
  reserveH: { v: 50, unit: "h", src: "rm", note: "power reserve, RM states about 50 h ±10%" },
  jewels: { v: 25, unit: "", src: "rm", note: "jewels" },
  inertia: { v: 7.5, unit: "mg·cm²", src: "rm", note: "balance moment of inertia" },
  lift: { v: 50, unit: "°", src: "rm", note: "lift angle" },
  escTeeth: { v: 20, unit: "teeth", src: "std", note: "escape wheel teeth: the Swiss lever standard" },
  ampFull: { v: 280, unit: "°", src: "std", note: "balance amplitude fully wound: typical, not CRMA6 data" },
  ampLow: { v: 170, unit: "°", src: "std", note: "balance amplitude near empty: typical" },
  barrelTurns: { v: 6.5, unit: "turns", src: "est", note: "barrel turns from empty to full" },
  rotorTurnsFull: { v: 1000, unit: "turns", src: "est", note: "OneWay rotor turns to wind 0 → 50 h" },
  turnsPerStep: { v: 0.12, unit: "turns", src: "est", note: "winding rotor turns per walking step" },
  bothWays: { v: 1.6, unit: "×", src: "est", note: "what-if: a rotor that winds both ways" },
  wornH: { v: 16, unit: "h", src: "est", note: "hours a day on the wrist" },
};

// A day of each activity: steps walked, plus winding rotor turns from wrist motion
// that isn't walking (swings, strokes, a rolling deck). All estimates (src "est").
export const ACTIVITIES = {
  walk: { name: "Just walking", steps: 8000, motion: 0, moves: "" },
  golf: { label: "swings", name: "Golf", steps: 12000, motion: 60, moves: "~90 full swings", why: "walking 18 holes, and every swing whips the rotor round" },
  skiing: { label: "poles and turns", name: "Skiing", steps: 6000, motion: 250, moves: "pole plants, turns, chairlift bumps", why: "few steps, but poles and turns rock the wrist all day" },
  tennis: { label: "strokes", name: "Tennis", steps: 9000, motion: 200, moves: "a few hundred strokes", why: "running between shots, and each stroke snaps the wrist" },
  sailing: { label: "boat roll", name: "Sailing", steps: 4000, motion: 250, moves: "all-day boat roll, winching", why: "hardly any walking, but the deck rolls the rotor for hours" },
  racing: { label: "wheel vibration", name: "Racing cars", steps: 3000, motion: 40, moves: "hands steady on the wheel", why: "sitting still with hands on the wheel; buzzing vibration barely swings a rotor" },
};

export const HZ = SPEC.vph.v / 3600 / 2; // 28,800 vph = 8 beats/s = 4 full swings/s
export const BEATS_PER_S = SPEC.vph.v / 3600;
export const FULL_S = SPEC.reserveH.v * 3600;
// reserve seconds stored per radian of winding rotor travel
export const S_PER_RAD = FULL_S / (SPEC.rotorTurnsFull.v * 2 * Math.PI);
// escape wheel: half a tooth per beat
export const ESC_DEG_PER_BEAT = 360 / SPEC.escTeeth.v / 2;

export function initial() {
  return {
    reserve: 0, // seconds of running left
    run: 0, // seconds the movement has run (drives every wheel)
    watch: 10 * 3600 + 8 * 60, // what the hands show, seconds since day 0 midnight
    day0: 19, // date shown at watch = 0
    world: 7 * 3600 + 32 * 60, // the real clock
    rotor: 0, // rotor angle, rad, relative to the movement
    rotorV: 0, // rad/s
    wound: 0, // total rad that wound the spring
    fn: "W",
    oneWay: true,
  };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Balance amplitude in degrees for a given reserve (falls as the spring lets down).
export function amplitude(reserve) {
  if (reserve <= 0) return 0;
  const f = clamp(reserve / FULL_S, 0, 1);
  const a = SPEC.ampLow.v + (SPEC.ampFull.v - SPEC.ampLow.v) * Math.sqrt(f);
  // the last few minutes: amplitude collapses to rest
  return a * clamp(reserve / 300, 0, 1);
}

// Winding: rotor travel (rad, relative to the movement) → reserve seconds.
// OneWay winds on positive travel only; the what-if winds on both.
export function windOf(dRotor, oneWay) {
  if (oneWay) return Math.max(0, dRotor) * S_PER_RAD;
  return Math.abs(dRotor) * S_PER_RAD * (SPEC.bothWays.v / 2);
}

// Advance the watch by dt real seconds.
// input: { worn, roll, rollV, spin (kinematic rotor rad/s or null), wear (avg wind s per s), fn }
export function step(s, dt, input = {}) {
  const n = { ...s };
  n.world = s.world + dt;
  n.fn = input.fn ?? s.fn;
  n.oneWay = input.oneWay ?? s.oneWay;

  // rotor: an off-centre platinum mass. Gravity pulls it toward the bottom of the
  // tilted case; the wrist roll drags the case round under it.
  let dRotor = 0;
  if (input.spin != null) {
    dRotor = input.spin * dt;
    n.rotorV = input.spin;
  } else if (dt > 0.05) {
    // compressed time: the rotor's swing is averaged into input.wear instead
    n.rotorV = 0;
  } else {
    const g = 60; // rad/s² at full tilt: tuned for a readable swing, not measured
    const damp = 1.4;
    const roll = input.roll ?? 0;
    const acc = -g * Math.sin(s.rotor + roll) - damp * s.rotorV - (input.rollA ?? 0);
    n.rotorV = s.rotorV + acc * dt;
    dRotor = n.rotorV * dt;
  }
  n.rotor = s.rotor + dRotor;
  let gain = (input.worn !== false ? windOf(dRotor, n.oneWay) : 0) + (input.wear ?? 0) * dt;
  if (n.fn === "W" && input.crownWind) gain += input.crownWind * dt;
  n.wound = s.wound + (gain > 0 ? gain / S_PER_RAD : 0);

  // running: the reserve drains one second per second; the bridle slips when full
  const running = s.reserve > 0;
  const used = running ? Math.min(dt, s.reserve) : 0;
  n.reserve = clamp(s.reserve + gain - used, 0, FULL_S);
  n.run = s.run + used;
  n.watch = s.watch + used + (input.setBy ?? 0);
  return n;
}

// Everything the screen reads, derived from the state.
export function read(s) {
  const amp = amplitude(s.reserve);
  const running = amp > 0;
  const beats = Math.floor(s.run * BEATS_PER_S);
  const balance = running ? amp * Math.sin(2 * Math.PI * HZ * s.run) : 0;
  const dayIndex = Math.floor(s.watch / 86400);
  const tod = ((s.watch % 86400) + 86400) % 86400;
  // semi-instantaneous date: jumps over the 2 minutes after midnight
  const jump = clamp(tod / 120, 0, 1);
  const date = ((s.day0 - 1 + dayIndex) % 31) + 1;
  const barrelTurnsDone = (s.run / FULL_S) * SPEC.barrelTurns.v;
  return {
    reserveH: s.reserve / 3600,
    reserveFrac: s.reserve / FULL_S,
    amp,
    running,
    beats,
    balance,
    hourDeg: (tod / 43200) * 360,
    minDeg: ((tod % 3600) / 3600) * 360,
    secWheelDeg: (s.run / 60) * 360, // fourth wheel: one turn a minute (no seconds hand)
    escDeg: escAngle(s.run),
    centreDeg: (s.run / 3600) * 360,
    thirdDeg: -(s.run / 3600) * 360 * 7.5,
    barrelDeg: barrelTurnsDone * 360,
    ratchetDeg: -(s.wound / (SPEC.rotorTurnsFull.v * 2 * Math.PI)) * SPEC.barrelTurns.v * 360,
    rotorDeg: (s.rotor * 180) / Math.PI,
    date,
    nextDate: (date % 31) + 1,
    dateJump: tod < 120 && dayIndex > 0 ? jump : 1,
    hh: Math.floor(tod / 3600),
    mm: Math.floor((tod % 3600) / 60),
    worldTod: ((s.world % 86400) + 86400) % 86400,
  };
}

// The escape wheel moves only when a beat lets a tooth go: a fast eased jump
// (30 ms), then still. Continuous in time, never a snap.
export function escAngle(run) {
  const b = run * BEATS_PER_S;
  const k = Math.floor(b);
  const f = clamp((b - k) / 0.24, 0, 1);
  const e = f * f * (3 - 2 * f);
  return (k + e) * ESC_DEG_PER_BEAT;
}

// A day of wear, averaged: steps → rotor turns → hours of reserve.
export function dayModel({ steps, motion = 0, oneWay = true, startH = SPEC.reserveH.v, days = 7 }) {
  const factor = oneWay ? 1 : SPEC.bothWays.v;
  const stepTurns = steps * SPEC.turnsPerStep.v * factor;
  const motionTurns = motion * factor;
  const turns = stepTurns + motionTurns;
  const gainH = (turns / SPEC.rotorTurnsFull.v) * SPEC.reserveH.v;
  const worn = SPEC.wornH.v;
  const trace = [];
  let r = startH;
  let stoppedAt = null;
  // run long enough for a slow drain to show; the chart keeps the first `days`
  for (let h = 0; h < Math.max(days, 60) * 24; h++) {
    const hour = h % 24; // 0..15 on the wrist, 16..23 on the nightstand
    const add = hour < worn ? gainH / worn : 0;
    if (r <= 0 && add === 0 && stoppedAt == null) stoppedAt = h;
    r = clamp(r + add - (r > 0 || add > 0 ? 1 : 0), 0, SPEC.reserveH.v);
    if (r === 0 && stoppedAt == null) stoppedAt = h + 1;
    trace.push(r);
  }
  // steady state: reserve on taking it off, once days repeat
  const steady = trace[trace.length - 24 + worn - 1];
  trace.length = days * 24;
  return {
    steps,
    stepTurns,
    motionTurns,
    // the same winding expressed as plain walking
    stepEquiv: Math.round(steps + motion / SPEC.turnsPerStep.v),
    turns,
    gainH,
    useH: 24,
    netH: gainH - 24,
    // speed up a real winding second into a readable on-screen second
    windPerS: gainH / (worn * 3600), // reserve hours per worn second
    trace,
    stoppedAt,
    steady,
    breakEven: Math.ceil((24 / SPEC.reserveH.v) * SPEC.rotorTurnsFull.v / (SPEC.turnsPerStep.v * (oneWay ? 1 : SPEC.bothWays.v))),
  };
}

// Real-time speed factor for a move: (real seconds represented) / (screen seconds).
export function speedOf(realS, screenS) {
  return realS / screenS;
}

export function speedLabel(k) {
  if (Math.abs(k - 1) < 0.02) return "×1";
  if (k < 1) return "×1/" + Math.round(1 / k);
  return "×" + Math.round(k).toLocaleString("en-US");
}
