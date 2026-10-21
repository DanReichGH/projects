// The drawing: a forearm with the RM 67-01 on it, and the same watch turned over
// beside it with the rotor lifted off its bearing. Static paths are built once;
// the parts that move carry ids and get a transform each frame.

const W = 1000;
const H = 720;

// main scene camera and the wrist
const PM = cam(372, 396, 3.5);
const CASE = { a: 19.35, b: 23.76, n: 4.2 }; // half of 38.7 × 47.52
const Z0 = 36; // caseback on the skin
const ZB = [Z0, Z0 + 2.2, Z0 + 6.2, Z0 + 7.75]; // back, middle, bezel, top (7.75 total)
const ZD = ZB[3] - 1.35; // dial plane, under the crystal
const OPEN = { a: 16.15, b: 18.3 }; // bezel is thicker at 12 and 6, where its screws sit

// inset: the watch turned over, through the caseback
const PI_ = cam(800, 206, 5.0);
const ZM = -1.4; // movement plane, under the back crystal
const ZR = 12.5; // rotor lifted off its bearing
const MOV = { w: 29.1, h: 31.25 };

const T = {
  skin: ["#f6d7bb", "#e8b892", "#cf9774"],
  sleeve: ["#9cc0e4", "#7aa2cf", "#5b82b0"],
  cushion: ["#f3e3c3", "#e2cba2", "#c9ad7f"],
  ti: ["var(--cs0)", "var(--cs1)", "var(--cs2)"],
  strap: ["var(--st0)", "var(--st1)", "var(--st2)"],
  plate: ["#7a808a", "#5d636d", "#454a53"],
  gold: ["#f6d98a", "#e2b955", "#bf9334"],
  plat: ["#f1e8d8", "#dccdb2", "#bba98a"],
  steel: ["#c9d4e3", "#9fb0c7", "#7b8ca5"],
  jewel: "#d6455d",
};

const TI = ["#d9dde2", "#b7bdc5", "#8f97a1"];
const local = (d, cls = "", style = "") => `<path d="${d}"${cls ? ` class="${cls}"` : ""}${style ? ` style="${style}"` : ""}/>`;
const lpath = (pts, close = true) => pathOf(pts, close);
const circ = (x, y, r, style, cls = "") => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r3(r)}"${cls ? ` class="${cls}"` : ""} style="${style}"/>`;

// polar helpers on the face: clock angle φ (0 at 12, clockwise) → local X, Y
const clockDir = (phi) => [Math.sin(phi), -Math.cos(phi)];
const thOf = (phi) => Math.atan2(-Math.cos(phi), Math.sin(phi));

// ---------- the wrist ----------
const ARM = [
  { y: -64, rx: 33, rz: 24, zc: 26 },
  { y: -40, rx: 31.5, rz: 21.5, zc: 23 },
  { y: -14, rx: 29.5, rz: 18.5, zc: 18.5 },
  { y: 12, rx: 28.5, rz: 17, zc: 18 },
  { y: 34, rx: 28, rz: 15.5, zc: 16.5 },
  { y: 50, rx: 28, rz: 13, zc: 16 },
];
const ARM_N = 2.6;
const SLEEVE = [
  { y: -175, rx: 41, rz: 34, zc: 34 },
  { y: -62, rx: 40, rz: 33, zc: 33 },
];
const WRIST = { rx: 29, rz: 18, zc: 18 }; // cross-section the strap and cushion wrap

function shadowOf(P, plan, dx, dy) {
  const pts = hull(plan.map(([x, y]) => pr(P, x + dx, y + dy, 0)));
  return `<path d="${pathOf(pts)}" class="shade"/>`;
}

function armSvg() {
  const P = PM;
  let out = "";
  // hard warm shadow, just behind the arm (toward −x, away from the viewer)
  const foot = [];
  for (const s of [...SLEEVE, ...ARM]) foot.push([s.rx * 0.8, s.y], [-s.rx * 0.8, s.y]);
  foot.push([28, 94], [-28, 94], [35, 78], [35, 50]);
  out += shadowOf(P, foot, -30, -4);
  // sleeve: knitted cuff, a darker opening, ribs that run from seam to rim
  const sl = tubeY(P, SLEEVE, T.sleeve, { cap: "#41597d" });
  out += sl.svg;
  const capIn = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    capIn.push(pr(P, 33.5 * Math.cos(a), -62, 31 + 26.5 * Math.sin(a)));
  }
  out += `<path d="${pathOf(capIn)}" style="fill:#2f4362"/>`;
  // cuff seam ring and ribs on the visible face
  const seam = [];
  for (let a = -38; a <= 150; a += 4) seam.push(sl.pt({ y: -86, rx: 40.6, rz: 33.6, zc: 33 }, (a * Math.PI) / 180));
  out += `<path class="k thin" d="${pathOf(seam, false)}"/>`;
  for (let a = -30; a <= 140; a += 12) {
    const r = (a * Math.PI) / 180;
    const p0 = sl.pt({ y: -86, rx: 40.6, rz: 33.6, zc: 33 }, r);
    const p1 = sl.pt({ y: -62, rx: 40, rz: 33, zc: 33 }, r);
    out += `<path class="k thin" d="${pathOf([p0, p1], false)}"/>`;
  }
  // the forearm
  const arm = tubeY(P, ARM, T.skin, { n: ARM_N });
  out += arm.svg;
  // the hand, palm down; thumb on the near side
  const hand = roundRect(-28, 46, 28, 94, 15, 10).map(([x, y]) => [x, y]);
  out += prism(P, hand, 3, 29, T.skin);
  // finger gaps: along the top to the front edge, then down the front face
  for (const x of [-14, 0, 14]) {
    const yEnd = 94 - (Math.abs(x) > 13 ? 15 - Math.sqrt(15 * 15 - (Math.abs(x) - 13) ** 2) : 0);
    out += `<path class="k" d="${pathOf([pr(P, x, 76, 29), pr(P, x, yEnd, 29), pr(P, x, yEnd, 3)], false)}"/>`;
  }
  // knuckles: short arcs on the top that start and end on a finger gap
  for (const [x0, x1] of [[-28, -14], [-14, 0], [0, 14], [14, 28]]) {
    const pts = [];
    const a0 = x0;
    const a1 = x1;
    for (let i = 0; i <= 8; i++) {
      const x = a0 + ((a1 - a0) * i) / 8;
      pts.push(pr(P, x, 72 - 2.2 * Math.sin((Math.PI * i) / 8), 29));
    }
    if (x0 > -28 && x1 < 28) out += `<path class="k thin" d="${pathOf(pts, false)}"/>`;
  }
  const thumb = roundRect(22, 50, 35, 78, 6.4, 8);
  out += prism(P, thumb, 5, 19, T.skin);
  out += prism(P, roundRect(27, 70, 33.4, 76.4, 2.6, 4), 19, 19.6, ["#fbe7d6", T.skin[1], T.skin[2]]);
  return out;
}

function cushionSvg() {
  const st = [-27, 27].map((y) => ({ y, rx: WRIST.rx, rz: WRIST.rz, zc: WRIST.zc }));
  let out = shadowOf(PM, [[30, -27], [-30, -27], [30, 27], [-30, 27]], -8, -3);
  const c = tubeY(PM, st, T.cushion, { n: ARM_N, cap: T.cushion[2] });
  out += c.svg;
  // a stitched seam round the near end
  const s = [];
  for (let a = -30; a <= 140; a += 5) s.push(c.pt({ y: 24, rx: WRIST.rx + 0.4, rz: WRIST.rz + 0.4, zc: WRIST.zc }, (a * Math.PI) / 180));
  out += `<path class="k thin dash" d="${pathOf(s, false)}"/>`;
  return out;
}

// the strap: two rubber pieces wrapping the wrist from under the 12 and 6 ends
function strapSvg() {
  const P = PM;
  const cx = 0;
  const cz = WRIST.zc;
  const R = (a) => {
    const c = Math.cos(a);
    const q = Math.sin(a);
    return [cx + (WRIST.rx + 1.6) * Math.sign(c) * Math.abs(c) ** (2 / ARM_N), cz + (WRIST.rz + 1.6) * Math.sign(q) * Math.abs(q) ** (2 / ARM_N)];
  };
  const D = Math.PI / 180;
  let out = "";
  const pieces = [
    [[21, Z0 + 0.6], ...Array.from({ length: 28 }, (_, i) => R((52 - i * 4) * D))],
    [[-21, Z0 + 0.6], ...Array.from({ length: 22 }, (_, i) => R((128 + i * 4) * D))],
  ];
  for (const prof of pieces) {
    const s = stripY(P, prof, -12, 12, T.strap, [cx, cz]);
    out += s.svg;
    // moulded grooves across the strap, edge to edge
    for (let i = 3; i < prof.length - 1; i += 4) {
      if (!s.seg[i] || !s.seg[i].vis) continue;
      out += `<path class="k thin" d="${pathOf([s.q(i, -12), s.q(i, 12)], false)}"/>`;
    }
  }
  return out;
}

// ---------- the watch head on the wrist ----------
function caseSvg(P, z0, flip) {
  const pl = (a, b) => tonneau(a, b, CASE.n).map(([X, Y]) => [Y, X]);
  let out = "";
  out += prism(P, pl(CASE.a - 0.6, CASE.b - 0.6), z0, z0 + 2.2, T.ti);
  out += prism(P, pl(CASE.a, CASE.b), z0 + 2.2, z0 + 6.2, T.ti, { topId: flip ? "" : "caseMid" });
  out += prism(P, pl(CASE.a - 0.35, CASE.b - 0.35), z0 + 6.2, z0 + 7.75, T.ti, { topId: flip ? "insetTop" : "caseTop" });
  return out;
}

// Spline screws as on the RM 67-01: two through each end of the bezel, two down each side.
// A, B: the face's outer half-width and half-length.
function screwsSvg(A = 19, B = 23.4, r = 0.95) {
  const sideX = A * (1 - PINCH * (8 / B) ** 2) - 1.7;
  const at = [];
  for (const sy of [-1, 1]) for (const sx of [-1, 1]) at.push([sx * A * 0.55, sy * (B - 2.6)], [sx * sideX, sy * 8]);
  let out = "";
  at.forEach(([X, Y], i) => {
    out += circ(X, Y, r, "fill:#3a3f4b", "k");
    // spline head: six short splines from the rim toward the centre
    let d = "";
    for (let k = 0; k < 6; k++) {
      const a2 = (k / 6) * Math.PI * 2 + i;
      d += `M${r3(X + r * Math.cos(a2))} ${r3(Y + r * Math.sin(a2))}L${r3(X + 0.35 * r * Math.cos(a2))} ${r3(Y + 0.35 * r * Math.sin(a2))}`;
    }
    out += `<path class="spl" d="${d}"/>`;
  });
  return out;
}

function ring(aO, bO, aI, bI) {
  return lpath(tonneau(aO, bO, CASE.n)) + lpath(tonneau(aI, bI, CASE.n).reverse());
}

function dialSvg() {
  const a = OPEN.a;
  const b = OPEN.b;
  let out = "";
  out += local(lpath(tonneau(a, b, CASE.n)), "", `fill:${T.plate[1]}`);
  // the movement through the open-worked dial, seen from the front (mirror of the back):
  // the barrel's ratchet winding, the seconds wheel, the escape wheel and the balance, all live
  out += `<g id="fBarrelG">`;
  out += circ(-4.6, -6.2, 4.0, `fill:${T.gold[2]}`, "k");
  out += wheel("fRatchet", -4.6, -6.2, 3.4, T.steel, 3, 28);
  out += `</g>`;
  out += `<g id="fTrainG">`;
  out += wheel("fFourth", -5.4, 4.6, 2.6, T.gold, 4, 30, circ(0, -1.45, 0.38, "fill:var(--ui1)", "k"));
  out += wheel("fEsc", -1.9, 7.0, 1.6, T.steel, 0, 20);
  out += `</g>`;
  out += `<g id="fBalanceG" transform="translate(2.6 4.6)"><g id="fBalance">`;
  out += local(lpath(circlePts(0, 0, 2.7, 48)) + lpath(circlePts(0, 0, 2.25, 48).reverse()), "k", `fill:${T.gold[1]};fill-rule:evenodd`);
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI * 2 + Math.PI / 4;
    out += local(`M${r3(0.4 * Math.cos(t))} ${r3(0.4 * Math.sin(t))}L${r3(2.3 * Math.cos(t))} ${r3(2.3 * Math.sin(t))}`, "k thin");
  }
  out += circ(0, 0, 0.55, `fill:${T.gold[2]}`, "k");
  out += `</g><g transform="scale(0.62)"><path id="fHair" class="k hair" d=""/></g>`;
  out += circ(0, 0, 0.5, `fill:${T.jewel}`, "k");
  out += `</g>`;
  // black flange with a minute track, ticks hanging from its outer edge
  const ci = { a: a - 2.2, b: b - 2.2 };
  out += local(ring(a, b, ci.a, ci.b), "k", "fill:#262b36;fill-rule:evenodd");
  let ticks = "";
  let majors = "";
  for (let m = 0; m < 60; m++) {
    const phi = (m / 60) * Math.PI * 2;
    const th = thOf(phi);
    const ro = tonneauR(a, b, th, CASE.n);
    const [dx, dy] = clockDir(phi);
    const len = m % 5 === 0 ? 1.6 : 0.8;
    const seg = `M${r3(dx * ro)} ${r3(dy * ro)}L${r3(dx * (ro - len))} ${r3(dy * (ro - len))}`;
    if (m % 5 === 0) majors += seg;
    else ticks += seg;
  }
  out += `<path class="tickW hair" d="${ticks}"/><path class="tickW" d="${majors}"/>`;
  // numeral ring: a black rail carrying big white Arabic numerals
  const ra = { a: ci.a - 0.5, b: ci.b - 0.5 };
  const rw = 5.2;
  out += local(ring(ra.a, ra.b, ra.a - rw, ra.b - rw), "k", "fill:#2f3542;fill-rule:evenodd");
  for (let h = 1; h <= 12; h++) {
    if (h === 5) continue; // the date window takes the 5
    const phi = (h / 12) * Math.PI * 2;
    const th = thOf(phi);
    const r = tonneauR(ra.a - rw / 2, ra.b - rw / 2, th, CASE.n);
    const [dx, dy] = clockDir(phi);
    out += `<text x="${r3(dx * r)}" y="${r3(dy * r + 1.55)}" class="num">${h}</text>`;
  }
  // function indicator just inside the 1 and 2: W · D · H on an arc, with a pointer
  const fd = clockDir((1.5 / 12) * Math.PI * 2);
  const fc = [fd[0] * 4.2, fd[1] * 4.2];
  const axis = Math.atan2(fd[1], fd[0]);
  out += `<g id="fnDial">`;
  out += circ(fc[0], fc[1], 3.4, "fill:#2f3542", "k");
  FN_ANG.forEach((da, i) => {
    const t = axis + da;
    out += `<text x="${r3(fc[0] + 2.3 * Math.cos(t))}" y="${r3(fc[1] + 2.3 * Math.sin(t) + 0.66)}" class="fnl">${"WDH"[i]}</text>`;
  });
  out += `<g id="fnHand" transform="translate(${r3(fc[0])} ${r3(fc[1])})"><g id="fnHandR">`;
  out += local("M-0.3 -0.55L1.55 0L-0.3 0.55Z", "k", "fill:var(--ac1)");
  out += `</g></g>`;
  out += circ(fc[0], fc[1], 0.4, "fill:var(--ac2)", "k");
  out += `</g>`;
  // date at 5 o'clock, on the numeral rail: a vertical aperture, tens over units
  const dphi = (5 / 12) * Math.PI * 2;
  const dd = clockDir(dphi);
  const dR = tonneauR(ra.a - rw / 2, ra.b - rw / 2, thOf(dphi), CASE.n);
  const dc = [dd[0] * dR, dd[1] * dR];
  out += `<g transform="translate(${r3(dc[0])} ${r3(dc[1])})">`;
  out += `<clipPath id="dateClip"><rect x="-1.9" y="-3.7" width="3.8" height="7.4" rx="0.6"/></clipPath>`;
  out += `<rect x="-1.9" y="-3.7" width="3.8" height="7.4" rx="0.6" style="fill:#151922"/>`;
  out += `<g clip-path="url(#dateClip)"><g id="dateStrip"></g></g>`;
  out += `<rect x="-1.9" y="-3.7" width="3.8" height="7.4" rx="0.6" class="dateFrame"/>`;
  out += `</g>`;
  // hands: skeleton hour and minute with lume, then a cap
  out += `<g id="hourH">${local("M-1.2 1.8L-1.0 -6.5L0 -8.6L1.0 -6.5L1.2 1.8Z", "k", "fill:var(--ac1)")}${local("M-0.5 -1.6L-0.4 -6L0 -7.4L0.4 -6L0.5 -1.6Z", "", "fill:var(--ac0)")}</g>`;
  out += `<g id="minH">${local("M-0.9 2.2L-0.7 -12.2L0 -14.6L0.7 -12.2L0.9 2.2Z", "k", "fill:var(--ac1)")}${local("M-0.35 -2L-0.3 -11.5L0 -13L0.3 -11.5L0.35 -2Z", "", "fill:var(--ac0)")}</g>`;
  out += circ(0, 0, 1.5, `fill:${TI[0]}`, "k");
  out += circ(0, 0, 0.5, `fill:${T.jewel}`, "");
  return out;
}

const FN_ANG = [-0.75, 0, 0.75];

function crownSvg(P) {
  // along +y at 3 o'clock; knurled, with a titanium tube into the case
  const zc = Z0 + 4.2;
  const tube = tubeY(P, [{ y: CASE.a - 1, rx: 1.4, rz: 1.4, zc }, { y: CASE.a + 1.8, rx: 1.4, rz: 1.4, zc }], T.ti, { cap: T.ti[1] });
  const st = [{ y: CASE.a + 1.6, rx: 3.1, rz: 3.1, zc }, { y: CASE.a + 6.4, rx: 3.1, rz: 3.1, zc }];
  const cr = tubeY(P, st, T.ti, { cap: "var(--cs0)" });
  let knurl = "";
  for (let a = -40; a <= 150; a += 15) {
    const r = (a * Math.PI) / 180;
    knurl += pathOf([cr.pt(st[0], r), cr.pt(st[1], r)], false);
  }
  const face = pr(P, 0, CASE.a + 6.4, zc);
  return `<g id="crownTube">${tube.svg}</g><g id="crown">${cr.svg}<path class="k hair" d="${knurl}"/>` + `<path class="k thin" d="${flatCircleY(P, 0, CASE.a + 6.4, zc, 1.6)}"/>` + circ(face[0], face[1], 0.9, "fill:var(--cs0)", "k") + `</g>`;
}

function flatCircleY(P, x, y, zc, r) {
  const pts = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    pts.push(pr(P, x + r * Math.cos(a), y, zc + r * Math.sin(a)));
  }
  return pathOf(pts);
}

function watchSvg() {
  const P = PM;
  let out = "";
  out += caseSvg(P, Z0, false);
  out += `<path id="tptTop" d="" class="tpt"/>`;
  const top = ZB[3];
  // bezel inner wall, then the dial under the crystal
  const open = tonneau(OPEN.a, OPEN.b, CASE.n).map(([X, Y]) => pr(P, Y, X, top));
  out += `<path d="${pathOf(open)}" style="fill:var(--cs2)"/>`;
  out += `<clipPath id="openClip"><path d="${pathOf(open)}"/></clipPath>`;
  out += `<g clip-path="url(#openClip)"><g transform="${planeM(P, 0, 0, ZD)}" class="plane" id="dialG">${dialSvg()}</g>`;
  // crystal glints: two strokes from edge to edge, cut by the opening
  const g1 = [onPlane(P, 0, 0, top, -20, 2), onPlane(P, 0, 0, top, 4, -24)];
  const g2 = [onPlane(P, 0, 0, top, -18, 9), onPlane(P, 0, 0, top, 8, -18)];
  out += `<path class="glint" d="${pathOf(g1, false)}"/><path class="glint thinG" d="${pathOf(g2, false)}"/></g>`;
  out += `<path class="k" d="${pathOf(open)}"/>`;
  out += `<g transform="${planeM(P, 0, 0, top)}" class="plane">${screwsSvg(CASE.a - 0.35, CASE.b - 0.35)}</g>`;
  out += crownSvg(P);
  return out;
}

// ---------- the movement seen through the caseback ----------
const MV = {
  barrel: [7.5, -8, 6.3],
  ratchet: [7.5, -8, 5.1],
  centre: [0, 0, 5],
  third: [-8.2, 3, 4],
  fourth: [-4.2, 9.6, 3.4],
  esc: [1.6, 11.6, 2.6],
  pallet: [5.2, 10.6],
  balance: [9.2, 7.4, 4.6],
  oneway: [-4.6, -6.2, 2.5],
  reduce: [0.6, -12.3, 2.9],
};

function wheel(id, x, y, r, tones, spokes = 4, teeth = 0, extra = "") {
  let d = "";
  if (teeth) {
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const da = (Math.PI * 2) / teeth;
      pts.push([r * 0.86 * Math.cos(a), r * 0.86 * Math.sin(a)]);
      pts.push([r * Math.cos(a + da * 0.25), r * Math.sin(a + da * 0.25)]);
      pts.push([r * Math.cos(a + da * 0.5), r * Math.sin(a + da * 0.5)]);
      pts.push([r * 0.86 * Math.cos(a + da * 0.75), r * 0.86 * Math.sin(a + da * 0.75)]);
    }
    d = lpath(pts);
  } else d = lpath(circlePts(0, 0, r, 48));
  let out = `<g transform="translate(${r1(x)} ${r1(y)})"><g id="${id}">`;
  out += local(d, "k", `fill:${tones[1]}`);
  // open-worked: windows between the spokes, each a closed shape
  if (spokes) {
    const ri = r * 0.78;
    const rh = r * 0.3;
    const sw = Math.min(0.5, r * 0.12);
    for (let k = 0; k < spokes; k++) {
      const a0 = (k / spokes) * Math.PI * 2;
      const a1 = ((k + 1) / spokes) * Math.PI * 2;
      const pts = [];
      const g0 = a0 + sw / ri;
      const g1 = a1 - sw / ri;
      for (let i = 0; i <= 10; i++) {
        const a = g0 + ((g1 - g0) * i) / 10;
        pts.push([ri * Math.cos(a), ri * Math.sin(a)]);
      }
      const h0 = a0 + sw / rh;
      const h1 = a1 - sw / rh;
      for (let i = 10; i >= 0; i--) {
        const a = h0 + ((h1 - h0) * i) / 10;
        pts.push([rh * Math.cos(a), rh * Math.sin(a)]);
      }
      out += local(lpath(pts), "k thin", `fill:${T.plate[2]}`);
    }
  }
  out += extra;
  out += `</g>`;
  out += circ(0, 0, Math.max(0.55, r * 0.16), `fill:${T.jewel}`, "k");
  out += `</g>`;
  return out;
}

function mvtSvg() {
  let out = "";
  const pl = roundRect(-MOV.w / 2, -MOV.h / 2, MOV.w / 2, MOV.h / 2, 6, 8);
  out += local(lpath(pl), "k", `fill:${T.plate[1]}`);
  // skeleton plate: closed windows in the baseplate
  out += local(lpath(roundRect(-13, -14, -7, -9.6, 1.8, 4)), "k thin", `fill:${T.plate[2]}`);
  out += local(lpath(roundRect(-13, 6.6, -9.6, 14, 1.6, 4)), "k thin", `fill:${T.plate[2]}`);
  // reduction train from the rotor: OneWay wheel and a reduction wheel
  out += wheel("oneway", ...MV.oneway, T.steel, 0, 22);
  out += wheel("reduce", ...MV.reduce, T.gold, 4, 26);
  // barrel: drum (unwinds) with the mainspring seen through an open ratchet wheel (winds)
  const [bx, by, br] = MV.barrel;
  out += `<g transform="translate(${bx} ${by})"><g id="barrelDrum">${local(lpath((() => {
    const p = [];
    const n = 60;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = i % 2 ? br : br * 0.93;
      p.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
    return p;
  })()), "k", `fill:${T.gold[2]}`)}${circ(0, 0, br * 0.88, `fill:${T.plate[2]}`, "k")}</g>`;
  out += `<path id="spring" class="spring" d=""/>`;
  out += `<g id="ratchet">`;
  const rt = [];
  const rr = MV.ratchet[2];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    rt.push([rr * Math.cos(a), rr * Math.sin(a)], [rr * 0.9 * Math.cos(a + 0.12), rr * 0.9 * Math.sin(a + 0.12)]);
  }
  // ratchet: a toothed rim with three open windows, the spring visible through them
  let rim = lpath(rt);
  const rin = [];
  for (let i = 0; i < 48; i++) {
    const a = -(i / 48) * Math.PI * 2;
    rin.push([rr * 0.74 * Math.cos(a), rr * 0.74 * Math.sin(a)]);
  }
  rim += lpath(rin);
  out += local(rim, "k", `fill:${T.steel[1]};fill-rule:evenodd`);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const pts = [[-0.45, 1.4], [0.45, 1.4], [0.45, rr * 0.76], [-0.45, rr * 0.76]].map(([u, v]) => [u * ca - v * sa, u * sa + v * ca]);
    out += local(lpath(pts), "k thin", `fill:${T.steel[1]}`);
  }
  out += circ(0, 0, 1.6, `fill:${T.steel[0]}`, "k");
  out += local(`M-1.6 0L1.6 0`, "k thin");
  out += `</g></g>`;
  // click: a pawl on the ratchet teeth, with its spring
  out += `<g transform="translate(${r3(bx + 4.6)} ${r3(by - 4.2)})"><g id="click">${local("M0 0L3.4 -1.6L4.4 -0.6L1.2 1.1Z", "k", `fill:${T.steel[2]}`)}</g>${circ(3.9, -1.1, 0.5, `fill:${TI[0]}`, "k")}</g>`;
  // going train
  out += wheel("third", ...MV.third, T.gold, 4, 40);
  out += wheel("fourth", ...MV.fourth, T.gold, 4, 36, circ(0, -MV.fourth[2] * 0.55, 0.5, "fill:var(--ac1)", "k"));
  out += wheel("centre", ...MV.centre, T.gold, 5, 48);
  out += wheel("esc", ...MV.esc, T.steel, 3, 20);
  // train bridge: closed skeleton bar over third and fourth wheel pivots
  const tb = [[-11.6, 0.6], [-6, -1.2], [-1.6, 7.6], [-2.6, 12.4], [-6.2, 12], [-11.2, 5.6]];
  out += local(lpath(tb), "k", `fill:${TI[1]}`);
  out += circ(MV.third[0], MV.third[1], 0.75, `fill:${T.jewel}`, "k");
  out += circ(MV.fourth[0], MV.fourth[1], 0.7, `fill:${T.jewel}`, "k");
  out += circ(-10.2, 3.6, 0.6, `fill:${TI[0]}`, "k") + circ(-4, 11.6, 0.6, `fill:${TI[0]}`, "k");
  // pallet fork: pivot, two red stones toward the escape wheel, fork toward the balance
  const [px, py] = MV.pallet;
  out += `<g transform="translate(${px} ${py})"><g id="pallet">`;
  out += local("M-2.6 -1.2L-0.4 -0.5L2.9 -2.6L3.3 -2.1L0.3 0.6L-2.4 1.6L-2.9 1.1L-1 0.1L-3 -0.6Z", "k", `fill:${T.steel[1]}`);
  out += circ(-2.75, -0.9, 0.42, `fill:${T.jewel}`, "") + circ(-2.65, 1.35, 0.42, `fill:${T.jewel}`, "");
  out += `</g>${circ(0, 0, 0.55, `fill:${T.jewel}`, "k")}</g>`;
  // free-sprung balance: CuBe rim, four arms, four inertia weights, hairspring
  const [qx, qy, qr] = MV.balance;
  out += `<g transform="translate(${qx} ${qy})" id="balanceG">`;
  out += `<g id="balance">`;
  let bal = lpath(circlePts(0, 0, qr, 64)) + lpath(circlePts(0, 0, qr * 0.84, 64).reverse());
  out += local(bal, "k", `fill:${T.gold[1]};fill-rule:evenodd`);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const arm = [[-0.32, 0.5], [0.32, 0.5], [0.32, qr * 0.86], [-0.32, qr * 0.86]].map(([u, v]) => [u * ca - v * sa, u * sa + v * ca]);
    out += local(lpath(arm), "k thin", `fill:${T.gold[1]}`);
    const wa = a + Math.PI / 4;
    out += circ(qr * 0.72 * -Math.sin(wa), qr * 0.72 * Math.cos(wa), 0.55, `fill:${T.gold[0]}`, "k");
  }
  out += circ(0, 0, 0.9, `fill:${T.gold[2]}`, "k");
  out += circ(0, 1.25, 0.32, `fill:${T.jewel}`, "");
  out += `</g>`;
  out += `<path id="hair" class="k hair" d=""/>`;
  out += `</g>`;
  // balance cock: a bridge from the plate edge to the balance staff, Incabloc jewel
  const ck = [[qx + 6, qy + 6.2], [qx + 3.7, qy + 7.8], [qx - 0.9, qy + 0.9], [qx + 0.9, qy - 0.9]];
  out += local(lpath(ck), "k", `fill:${TI[1]}`);
  out += circ(qx, qy, 1.15, `fill:${TI[0]}`, "k") + circ(qx, qy, 0.6, `fill:${T.jewel}`, "k");
  out += circ(qx + 4.6, qy + 6.6, 0.6, `fill:${TI[0]}`, "k");
  // barrel bridge: closed bar across the ratchet arbor
  const bb = [[bx - 9.4, by - 4.6], [bx - 1.5, by - 1.2], [bx - 1.2, by + 1.4], [bx - 9.8, by - 2.2]];
  out += local(lpath(bb), "k", `fill:${TI[1]}`);
  out += circ(bx - 8.4, by - 3.2, 0.62, `fill:${TI[0]}`, "k");
  // the rotor's bearing seat at the centre
  out += circ(0, 0, 3.3, `fill:${TI[1]}`, "k") + circ(0, 0, 2.2, `fill:${T.plate[2]}`, "k");
  return out;
}

function rotorShape(rIn, rOut, span) {
  const pts = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = -span / 2 + (span * i) / n + Math.PI / 2;
    pts.push([rOut * Math.cos(a), rOut * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = -span / 2 + (span * i) / n + Math.PI / 2;
    pts.push([rIn * Math.cos(a), rIn * Math.sin(a)]);
  }
  return lpath(pts);
}

function rotorSvg(lower) {
  const span = (150 * Math.PI) / 180;
  const f = lower ? T.plat[2] : T.plat[0];
  let out = "";
  // three titanium arms from the hub to the platinum weight
  for (const a of [-0.52, 0, 0.52]) {
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const arm = [[-1.1, 2.4], [1.1, 2.4], [1.3, 9.8], [-1.3, 9.8]].map(([u, v]) => [u * ca - v * sa, u * sa + v * ca]);
    out += local(lpath(arm), lower ? "" : "k", `fill:${lower ? "${TI[2]}" : "${TI[1]}"}`);
  }
  out += local(rotorShape(9.4, 14.3, span), lower ? "" : "k", `fill:${f}`);
  if (!lower) {
    out += local(rotorShape(10.6, 13.1, span - 0.22), "k thin", `fill:${T.plat[1]}`);
    for (const a of [-0.9, -0.3, 0.3, 0.9]) out += circ(11.85 * Math.cos(a + Math.PI / 2), 11.85 * Math.sin(a + Math.PI / 2), 0.55, `fill:${TI[0]}`, "k");
    // hub with the ceramic ball bearing
    out += circ(0, 0, 3.2, `fill:${TI[0]}`, "k");
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      out += circ(2.2 * Math.cos(a), 2.2 * Math.sin(a), 0.42, "fill:#ffffff", "k hair");
    }
    out += circ(0, 0, 1.2, `fill:${TI[2]}`, "k");
  } else out += circ(0, 0, 3.2, `fill:${TI[2]}`);
  return out;
}

function insetSvg() {
  const P = PI_;
  let out = "";
  // shadow just behind the turned-over watch
  const foot = tonneau(CASE.a, CASE.b, CASE.n).map(([X, Y]) => [Y, X]);
  out += shadowOf(P, foot, -5, -2.5);
  // strap stubs, cut short: the head turned over on the paper
  for (const s of [-1, 1]) {
    const pl = roundRect(s > 0 ? CASE.b - 2 : -CASE.b - 6, -12, s > 0 ? CASE.b + 6 : -CASE.b + 2, 12, 3, 4);
    out += prism(P, pl, -7.75, -5.2, T.strap);
  }
  out += caseSvg(P, -7.75, true);
  out += `<path id="tptInset" d="" class="tpt"/>`;
  const opening = roundRect(-MOV.w / 2 - 0.9, -MOV.h / 2 - 0.9, MOV.w / 2 + 0.9, MOV.h / 2 + 0.9, 6.5, 8).map(([X, Y]) => pr(P, Y, X, 0));
  out += `<path d="${pathOf(opening)}" style="fill:var(--cs2)"/>`;
  out += `<clipPath id="backClip"><path d="${pathOf(opening)}"/></clipPath>`;
  out += `<g clip-path="url(#backClip)"><g transform="${planeM(P, 0, 0, ZM)}" class="plane" id="mvtG">${mvtSvg()}</g>`;
  const g1 = [onPlane(P, 0, 0, 0, -18, 6), onPlane(P, 0, 0, 0, 6, -20)];
  out += `<path class="glint thinG" d="${pathOf(g1, false)}"/></g>`;
  out += `<path class="k" d="${pathOf(opening)}"/>`;
  out += `<g transform="${planeM(P, 0, 0, 0)}" class="plane">${screwsSvg(CASE.a - 0.6, CASE.b - 0.6, 1.0)}</g>`;
  // the arbor the rotor lifts off, then the rotor itself (thickness under it)
  out += `<g id="post">${post(P, 0, 0, 1.15, ZM, ZR - 1.2, T.steel)}</g>`;
  out += `<g transform="${planeM(P, 0, 0, ZR - 1.2)}" class="plane"><g id="rotorLow">${rotorSvg(true)}</g></g>`;
  out += `<g transform="${planeM(P, 0, 0, ZR)}" class="plane" id="rotorTop"><g id="rotorBlur" style="opacity:0">${local(rotorShape(9.4, 14.3, Math.PI * 2 - 0.01), "", "fill:var(--blur)")}</g><g id="rotor">${rotorSvg(false)}</g></g>`;
  return out;
}

function spiralPath(f, turn) {
  // mainspring between arbor (r 1.7) and drum wall (r 5.3); f = 1 fully wound
  const n = 9;
  const pts = [];
  const N = 220;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const wound = 1.75 + 1.9 * u;
    const slack = 3.55 + 1.75 * u;
    const g = wound * f + slack * (1 - f);
    const r = i === N ? 5.25 : g;
    const a = turn + u * n * Math.PI * 2 * (0.7 + 0.3 * f);
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pathOf(pts, false);
}

function hairPath(angleDeg) {
  // hairspring: breathes as the balance swings, outer end held by the stud
  const n = 9;
  const pts = [];
  const N = 200;
  const tw = (angleDeg * Math.PI) / 180;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const r = 1.1 + 2.3 * u * (1 + 0.04 * (1 - u) * Math.sin(tw));
    const a = u * n * Math.PI * 2 + tw * (1 - u);
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pathOf(pts, false);
}
