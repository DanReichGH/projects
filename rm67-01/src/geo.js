// Isometric camera and the few solids this figure needs. World units are mm.
// x and y on the floor, z up. The viewer sits at (+1, +1, +1).

const C30 = Math.cos(Math.PI / 6);

function cam(ox, oy, k) {
  return { ox, oy, k };
}

function pr(P, x, y, z) {
  return [P.ox + (y - x) * C30 * P.k, P.oy + ((x + y) * 0.5 - z) * P.k];
}

// A plane at height z whose local X runs along world +y and local Y along world +x.
// Watch faces are drawn flat in this local frame (X toward 3 o'clock, Y toward 6).
function planeM(P, cx, cy, z) {
  const k = P.k;
  const e = P.ox + (cy - cx) * C30 * k;
  const f = P.oy + ((cx + cy) * 0.5 - z) * k;
  return `matrix(${r3(C30 * k)} ${r3(0.5 * k)} ${r3(-C30 * k)} ${r3(0.5 * k)} ${r3(e)} ${r3(f)})`;
}

function onPlane(P, cx, cy, z, X, Y) {
  return pr(P, cx + Y, cy + X, z);
}

const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

function pathOf(pts, close = true) {
  return "M" + pts.map((p) => r1(p[0]) + " " + r1(p[1])).join("L") + (close ? "Z" : "");
}

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  const up = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// Tonneau: a superellipse pinched toward 12 and 6, so the sides bow out like a barrel.
// Local X half-width a (at the middle), Y half-length b.
const PINCH = 0.2;
const barrel = (Y, b) => 1 - PINCH * (Y / b) ** 2;

function tonneau(a, b, n = 4.2, N = 96) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const Y = b * Math.sign(s) * Math.abs(s) ** (2 / n);
    out.push([a * barrel(Y, b) * Math.sign(c) * Math.abs(c) ** (2 / n), Y]);
  }
  return out;
}

// Distance from centre to the tonneau edge along polar angle th (local frame).
function tonneauR(a, b, th, n = 4.2) {
  const inside = (r) => {
    const X = r * Math.cos(th);
    const Y = r * Math.sin(th);
    return Math.abs(X / (a * barrel(Y, b))) ** n + Math.abs(Y / b) ** n <= 1;
  };
  let lo = 0;
  let hi = Math.max(a, b);
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (inside(m)) lo = m;
    else hi = m;
  }
  return lo;
}

function roundRect(x0, y0, x1, y1, r, N = 8) {
  const out = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= N; i++) {
      const a = a0 + (i / N) * (Math.PI / 2);
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  corner(x1 - r, y0 + r, (3 * Math.PI) / 2);
  return out;
}

function circlePts(cx, cy, r, N = 48) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

const fillS = (c) => `style="fill:${c};stroke:${c};stroke-width:.5"`;
const fillOnly = (c) => `style="fill:${c}"`;

// A vertical prism on a world plan. tones = [top, faces toward +x, faces toward +y].
// Sides are flat colour runs; one ink outline goes round the silhouette and the top.
function prism(P, plan, z0, z1, tones, o = {}) {
  const n = plan.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = plan[i];
    const [x1, y1] = plan[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const ccw = area > 0;
  const B = plan.map(([x, y]) => pr(P, x, y, z0));
  const T = plan.map(([x, y]) => pr(P, x, y, z1));
  const edges = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = plan[j][0] - plan[i][0];
    const dy = plan[j][1] - plan[i][1];
    const nx = ccw ? dy : -dy;
    const ny = ccw ? -dx : dx;
    const vis = nx + ny > 1e-9;
    edges.push({ i, j, vis, tone: vis ? (nx > ny ? 1 : 2) : 0 });
  }
  let start = edges.findIndex((e) => !e.vis);
  if (start < 0) start = 0;
  const order = edges.slice(start).concat(edges.slice(0, start));
  let out = "";
  let run = null;
  const flush = () => {
    if (!run) return;
    const pts = [];
    for (const e of run.list) pts.push(B[e.i]);
    pts.push(B[run.list[run.list.length - 1].j]);
    for (let q = run.list.length - 1; q >= 0; q--) pts.push(T[run.list[q].j]);
    pts.push(T[run.list[0].i]);
    out += `<path d="${pathOf(pts)}" ${fillS(tones[run.tone])}/>`;
    run = null;
  };
  for (const e of order) {
    if (!e.vis) {
      flush();
      continue;
    }
    if (run && run.tone === e.tone) run.list.push(e);
    else {
      flush();
      run = { tone: e.tone, list: [e] };
    }
  }
  flush();
  if (z1 - z0 < 1e-6) out = "";
  out += `<path d="${pathOf(T)}" ${fillOnly(tones[0])}${o.topId ? ` id="${o.topId}"` : ""}/>`;
  if (o.ink !== false) {
    out += `<path class="k" d="${pathOf(hull(B.concat(T)))}"/>`;
    out += `<path class="k" d="${pathOf(T)}"/>`;
  }
  return out;
}

// A tube along world y with an elliptical (or squarish, n > 2) cross-section.
// stations: [{ y, rx, rz, zc, cx? }]. tones = [top, side, underside].
function tubeY(P, st, tones, o = {}) {
  const n = o.n || 2;
  const sec = (s, a) => {
    const c = Math.cos(a);
    const q = Math.sin(a);
    return [(s.cx || 0) + s.rx * Math.sign(c) * Math.abs(c) ** (2 / n), s.zc + s.rz * Math.sign(q) * Math.abs(q) ** (2 / n)];
  };
  const pt = (s, a) => {
    const [x, z] = sec(s, a);
    return pr(P, x, s.y, z);
  };
  const all = [];
  for (const s of st) for (let i = 0; i < 72; i++) all.push(pt(s, (i / 72) * Math.PI * 2));
  const H = hull(all);
  const band = (a0, a1) => {
    const pts = [];
    st.forEach((s) => pts.push(pt(s, a0)));
    const L = st[st.length - 1];
    for (let i = 1; i < 16; i++) pts.push(pt(L, a0 + ((a1 - a0) * i) / 16));
    for (let q = st.length - 1; q >= 0; q--) pts.push(pt(st[q], a1));
    const F = st[0];
    for (let i = 1; i < 16; i++) pts.push(pt(F, a1 + ((a0 - a1) * i) / 16));
    return pathOf(pts);
  };
  const D = Math.PI / 180;
  let out = `<path d="${pathOf(H)}" ${fillS(tones[1])}/>`;
  out += `<path d="${band(-40 * D, 12 * D)}" ${fillS(tones[2])}/>`;
  out += `<path d="${band(58 * D, 150 * D)}" ${fillS(tones[0])}/>`;
  if (o.cap) {
    const L = st[st.length - 1];
    const cap = [];
    for (let i = 0; i < 72; i++) cap.push(pt(L, (i / 72) * Math.PI * 2));
    out += `<path d="${pathOf(cap)}" ${fillS(o.cap)}/><path class="k" d="${pathOf(cap)}"/>`;
  }
  out += `<path class="k" d="${pathOf(H)}"/>`;
  return { svg: out, hull: H, pt, sec };
}

// A thin strip (a strap) along world y following a cross-section profile [[x, z], ...].
// Only the outward face that looks at the viewer is drawn. centre: [x, z] the profile wraps.
function stripY(P, prof, y0, y1, tones, centre) {
  const seg = [];
  for (let i = 0; i < prof.length - 1; i++) {
    const [xa, za] = prof[i];
    const [xb, zb] = prof[i + 1];
    const mx = (xa + xb) / 2 - centre[0];
    const mz = (za + zb) / 2 - centre[1];
    const ang = Math.atan2(mz, mx);
    // outward normal of the segment
    let nx = zb - za;
    let nz = -(xb - xa);
    if (nx * mx + nz * mz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const vis = nx + nz > 0;
    const deg = (ang * 180) / Math.PI;
    const tone = deg > 58 && deg < 150 ? 0 : deg < 12 && deg > -140 ? 2 : 1;
    seg.push({ i, vis, tone });
  }
  let out = "";
  let ink = "";
  let run = null;
  let vrun = null;
  const q = (i, y) => pr(P, prof[i][0], y, prof[i][1]);
  const flush = () => {
    if (!run) return;
    const a = run[0];
    const b = run[run.length - 1] + 1;
    const pts = [];
    for (let i = a; i <= b; i++) pts.push(q(i, y0));
    for (let i = b; i >= a; i--) pts.push(q(i, y1));
    out += `<path d="${pathOf(pts)}" ${fillS(tones[run.tone])}/>`;
    run = null;
  };
  const vflush = () => {
    if (!vrun) return;
    const pts = [];
    for (let i = vrun[0]; i <= vrun[1] + 1; i++) pts.push(q(i, y0));
    for (let i = vrun[1] + 1; i >= vrun[0]; i--) pts.push(q(i, y1));
    ink += `<path class="k" d="${pathOf(pts)}"/>`;
    vrun = null;
  };
  for (const s of seg) {
    if (!s.vis) {
      flush();
      vflush();
      continue;
    }
    if (run && run.tone === s.tone) run.push(s.i);
    else {
      flush();
      run = [s.i];
      run.tone = s.tone;
    }
    if (vrun) vrun[1] = s.i;
    else vrun = [s.i, s.i];
  }
  flush();
  vflush();
  return { svg: out + ink, seg, q };
}

// Ellipse of a horizontal circle (radius r at world centre) as a path.
function flatCircle(P, x, y, z, r, N = 40) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push(pr(P, x + r * Math.cos(a), y + r * Math.sin(a), z));
  }
  return pathOf(pts);
}

// A vertical cylinder: a prism on a circle plan.
function post(P, x, y, r, z0, z1, tones) {
  return prism(P, circlePts(x, y, r, 36), z0, z1, tones);
}
