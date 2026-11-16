// Bouwt ../../kernfusie.dc.html (zonder x-dc-sjabloon): een tokamak met uitsnede, in de huisstijl van de site.
//   node tools/kernfusie/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as Gl from "./kit/lathe.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";
import * as T from "./geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "kernfusie.dc.html");
const W = 880, H = 600;
const { RAD, PHI_V, PHI1, PHI2 } = T;

const BASE_R = 262, BASE_H = 12;
const P = k.fitProjection(
  [...Array.from({ length: 36 }, (_, i) => [BASE_R * Math.cos(i * 10 * RAD), BASE_R * Math.sin(i * 10 * RAD), T.FLOOR - BASE_H - 6]),
   ...Array.from({ length: 36 }, (_, i) => [146 * Math.cos(i * 10 * RAD), 146 * Math.sin(i * 10 * RAD), 112]), [0, 0, 112]],
  W, H, { pad: 26, azimuth: T.AZ, elevation: T.EL });
const KS = k.cameraOf(P).k;

const S = T.painter(P);
const around = (phi) => [Math.cos(phi), Math.sin(phi), 0];
const tang = (phi) => [-Math.sin(phi), Math.cos(phi), 0];
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const subv = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const TAU = Math.PI * 2;
const SOLID0 = PHI2, SOLID1 = PHI1 + TAU;           // het deel van het toestel dat blijft staan
const NPHI = 96;                                     // facetten langs de torus
const inSolid = (phi) => { let d = ((phi - PHI_V) % TAU + TAU) % TAU; if (d > Math.PI) d -= TAU; return Math.abs(d) > T.CUT * RAD; };

// ------------------------------------------------------------ vacuümvat met mantel
S.setPart("vat");
const polCenter = (phi) => T.at3([T.R0, 0], phi);
S.patch((u, v) => T.torus(T.R_OUT, v * TAU, SOLID0 + u * (SOLID1 - SOLID0)), 84, 44,
  { wrapV: true, cls: "m", toward: (m) => subv(m, polCenter(Math.atan2(m[1], m[0]))) });
// de binnenwand zie je alleen door de twee gaten in de snijvlakken
const HOLES = [PHI1, PHI2].map((phi) => Array.from({ length: 48 }, (_, j) => k.iso(T.torus(T.R_FW + 2, j / 48 * TAU, phi), P)));
const inside = ([x, y], poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const throughHole = (quad) => quad.some((p) => HOLES.some((h) => inside(k.iso(p, P), h)));
S.patch((u, v) => T.torus(T.R_FW, v * TAU, SOLID0 + u * (SOLID1 - SOLID0)), 84, 40,
  { keep: throughHole, wrapV: true, cls: "c", edgeTone: "lo", crease: 0.5, toward: (m) => subv(polCenter(Math.atan2(m[1], m[0])), m) });

// snijvlakken: eerste wand, mantel (warmt op door neutronen), vat
for (const [phi, sign] of [[PHI1, 1], [PHI2, -1]]) {
  const out = add([0, 0, 0], tang(phi), sign);
  const layer = (r0, r1, cls, tone, nv) => S.patch((u, v) => T.torus(r0 + (r1 - r0) * v, u * TAU, phi), 64, nv,
    { wrapU: true, cls, edgeTone: tone, toward: () => out, bias: 2.5 });
  S.setPart("wand"); layer(T.R_FW, T.R_BL, "w!", "hi", 1);
  S.setPart("mantel"); layer(T.R_BL, T.R_VV, "b!", "lo", 2);
  S.setPart("vat"); layer(T.R_VV, T.R_OUT, "s!", "lo", 1);
  S.setPart("mantel");
  // koelkanalen in de mantel: kleine gaatjes op het snijvlak
  for (let i = 0; i < 26; i++) {
    const th = (i + 0.5) / 26 * TAU;
    S.dotAt(T.torus((T.R_BL + T.R_VV) / 2, th, phi), { n: out, size: 0.75, tone: "lo", bias: 3 });
  }
}
// cls met "!" is een vaste klasse; geometry.patch voegt een toon toe, dus haal die er af
for (const it of S.items) if (it.cls && /!/.test(it.cls)) it.cls = it.cls.replace(/!.*/, "");

// naden van de vatsectoren (lijnen op de buitenwand, elke 20°)
S.setPart("vat");
for (let i = 0; i < 18; i++) {
  const phi = PHI_V + (i * 20) * RAD;
  if (!inSolid(phi) || !inSolid(phi - 4 * RAD) || !inSolid(phi + 4 * RAD)) continue;
  const pts = Array.from({ length: 57 }, (_, j) => T.torus(T.R_OUT + 0.05, j / 56 * TAU, phi));
  for (let j = 0; j + 1 < pts.length; j++) {
    const th = (j + 0.5) / 56 * TAU;
    const n = subv(T.torus(T.R_OUT + 1, th, phi), T.torus(T.R_OUT, th, phi));
    S.line([pts[j], pts[j + 1]], { tone: "faint", n, bias: 0.2 });
  }
}

// ------------------------------------------------------------ toroïdale veldspoelen (TF)
const coilPhis = [];
for (let i = 0; i < T.N_TF; i++) {
  const phi = PHI_V + (10 + i * 20) * RAD;
  if (inSolid(phi - 7 * RAD) && inSolid(phi + 7 * RAD)) coilPhis.push(phi);
}
const coilPoint = (r, th, phi, w) => add(T.torus(r, th, phi), tang(phi), w);
for (const phi of coilPhis) {
  S.setPart("tf");
  const c = polCenter(phi), t = tang(phi), hw = T.TF_W / 2;
  const NT = 60;
  S.patch((u, v) => coilPoint(T.R_TF1, u * TAU, phi, -hw + v * T.TF_W), NT, 1, { wrapU: true, cls: "m", toward: (m) => subv(m, c), crease: 0.7 });
  S.patch((u, v) => coilPoint(T.R_TF0, u * TAU, phi, -hw + v * T.TF_W), NT, 1, { wrapU: true, cls: "m", toward: (m) => subv(c, m), crease: 0.7 });
  for (const s of [-1, 1]) {
    S.patch((u, v) => coilPoint(T.R_TF0 + v * T.TF_T, u * TAU, phi, s * hw), NT, 1, { wrapU: true, cls: "m", toward: () => add([0, 0, 0], t, s), crease: 0.7 });
    // naad in het midden van de zijkant van de spoelkast
    const pts = Array.from({ length: NT + 1 }, (_, j) => coilPoint(T.R_TF0 + T.TF_T / 2, j / NT * TAU, phi, s * (hw + 0.05)));
    for (let j = 0; j < NT; j++) S.line([pts[j], pts[j + 1]], { tone: "faint", n: add([0, 0, 0], t, s), bias: 0.15 });
  }
  // klemplaten aan de buitenkant, met bouten
  for (const th of [-0.55, 0.55, -1.2, 1.2]) {
    const p = coilPoint(T.R_TF1 + 0.1, th, phi, 0);
    const n = subv(coilPoint(T.R_TF1 + 1, th, phi, 0), coilPoint(T.R_TF1, th, phi, 0));
    S.dotAt(add(p, t, -2.4), { n, size: 0.55, tone: "hi" });
    S.dotAt(add(p, t, 2.4), { n, size: 0.55, tone: "hi" });
  }
  // steunpoot onder de spoel tot op de sokkel
  const foot = coilPoint(T.R_TF1, -Math.PI / 2 - 0.12, phi, 0);
  S.setPart("poten");
  box(T.at3([Math.hypot(foot[0], foot[1]), 0], phi).slice(0, 2).concat([0]), phi, [7, 6.5], T.FLOOR, foot[2] + 1.2, "m", { bolts: true });
}

// ------------------------------------------------------------ poloïdale veldspoelen (PF-ringen)
const PF = [62, 122, -62, -122].map((deg) => {
  const [R, Z] = T.dPoint(T.R_TF1 + 11, deg * RAD);
  return { R, Z, h: deg > 0 ? 7 : 7, w: 6 };
});
S.setPart("pf");
for (const ring of PF) {
  const { R, Z, h, w } = ring;
  const range = (u) => SOLID0 + u * (SOLID1 - SOLID0);
  S.patch((u, v) => T.at3([R - w + 2 * w * v, Z + h], range(u)), 72, 1, { cls: "m", toward: () => [0, 0, 1] });
  S.patch((u, v) => T.at3([R - w + 2 * w * v, Z - h], range(u)), 72, 1, { cls: "m", toward: () => [0, 0, -1] });
  S.patch((u, v) => T.at3([R + w, Z - h + 2 * h * v], range(u)), 72, 1, { cls: "m", toward: (m) => [m[0], m[1], 0] });
  S.patch((u, v) => T.at3([R - w, Z - h + 2 * h * v], range(u)), 72, 1, { cls: "m", toward: (m) => [-m[0], -m[1], 0] });
  for (const [phi, sign] of [[PHI1, 1], [PHI2, -1]]) {
    const q = [[R - w, Z - h], [R + w, Z - h], [R + w, Z + h], [R - w, Z + h]].map((p) => T.at3(p, phi));
    S.poly(q, { cls: "k!", n: add([0, 0, 0], tang(phi), sign), lines: [[q[0], q[1]], [q[1], q[2]], [q[2], q[3]], [q[3], q[0]]].map((s) => [s, "hi"]), bias: 1 });
    // gewikkelde geleider in het snijvlak
    for (let i = 1; i < 4; i++) {
      const a = T.at3([R - w + 0.6, Z - h + (2 * h * i) / 4], phi), b = T.at3([R + w - 0.6, Z - h + (2 * h * i) / 4], phi);
      S.line([a, b], { tone: "lo", n: add([0, 0, 0], tang(phi), sign), bias: 1.4 });
    }
  }
}

// ------------------------------------------------------------ centrale solenoïde
const CS_R = 23, CS_TOP = 98;
S.setPart("cs");
S.patch((u, v) => [CS_R * Math.cos(u * TAU), CS_R * Math.sin(u * TAU), T.FLOOR + v * (CS_TOP - T.FLOOR)], 56, 8,
  { wrapU: true, cls: "m", toward: (m) => [m[0], m[1], 0] });
S.patch((u, v) => [CS_R * v * Math.cos(u * TAU), CS_R * v * Math.sin(u * TAU), CS_TOP], 64, 3, { wrapU: true, cls: "m", toward: () => [0, 0, 1], edges: true, hideEdges: { j0: true } });
for (const z of [-96, -60, -24, 12, 48, 84]) {
  const pts = Array.from({ length: 65 }, (_, i) => [(CS_R + 0.05) * Math.cos(i / 64 * TAU), (CS_R + 0.05) * Math.sin(i / 64 * TAU), z]);
  for (let i = 0; i < 64; i++) S.line([pts[i], pts[i + 1]], { tone: "lo", n: [Math.cos((i + 0.5) / 64 * TAU), Math.sin((i + 0.5) / 64 * TAU), 0], bias: 0.1 });
}
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU + 0.2;
  S.dotAt([CS_R * 0.72 * Math.cos(a), CS_R * 0.72 * Math.sin(a), CS_TOP], { n: [0, 0, 1], size: 0.55, tone: "hi" });
}
for (const r of [CS_R * 0.45, CS_R - 3]) {
  const pts = Array.from({ length: 49 }, (_, i) => [r * Math.cos(i / 48 * TAU), r * Math.sin(i / 48 * TAU), CS_TOP]);
  for (let i = 0; i < 48; i++) S.line([pts[i], pts[i + 1]], { tone: "faint", n: [0, 0, 1], bias: 0.2 });
}

// ------------------------------------------------------------ dozen (poorten, poten, NBI)
// Een doos in het lokale assenstelsel van toroïdale hoek phi: radiaal van r0 tot r1 (of rond een
// middelpunt met halve maten), tangentieel ±ht, verticaal z0..z1.
function box(center, phi, [hr, ht], z0, z1, cls, { r0 = null, r1 = null, bolts = false, bias = 0, skip = [] } = {}) {
  const er = around(phi), et = tang(phi), ez = [0, 0, 1];
  let c = center, a = hr;
  if (r0 !== null) { c = add([0, 0, 0], er, (r0 + r1) / 2); a = (r1 - r0) / 2; }
  const pt = (x, y, z) => add(add(c, er, x), et, y).slice(0, 2).concat([z]);
  const nx = Math.max(1, Math.round((2 * a) / 7)), ny = Math.max(1, Math.round((2 * ht) / 7)), nz = Math.max(1, Math.round((z1 - z0) / 7));
  const faces = [
    ["+r", (u, v) => pt(a, -ht + 2 * ht * u, z0 + (z1 - z0) * v), ny, nz, er],
    ["-r", (u, v) => pt(-a, -ht + 2 * ht * u, z0 + (z1 - z0) * v), ny, nz, add([0, 0, 0], er, -1)],
    ["+t", (u, v) => pt(-a + 2 * a * u, ht, z0 + (z1 - z0) * v), nx, nz, et],
    ["-t", (u, v) => pt(-a + 2 * a * u, -ht, z0 + (z1 - z0) * v), nx, nz, add([0, 0, 0], et, -1)],
    ["+z", (u, v) => pt(-a + 2 * a * u, -ht + 2 * ht * v, z1), nx, ny, ez],
    ["-z", (u, v) => pt(-a + 2 * a * u, -ht + 2 * ht * v, z0), nx, ny, [0, 0, -1]],
  ];
  for (const [name, fn, nu, nv, n] of faces) {
    if (skip.includes(name)) continue;
    S.patch(fn, nu, nv, { cls, toward: () => n, bias });
  }
  if (bolts) {
    const n = [0, 0, 1];
    for (const [x, y] of [[-a + 2, -ht + 2], [a - 2, -ht + 2], [-a + 2, ht - 2], [a - 2, ht - 2]]) S.dotAt(pt(x, y, z1), { n, size: 0.5, tone: "hi", bias: bias + 0.5 });
  }
  return { pt, er, et };
}

// poorten op de middenvlakte (tussen de spoelen), met flens en boutenkrans
const PORTS = [80, 120, 160, -80, -120, -160].map((d) => PHI_V + d * RAD).filter((phi) => inSolid(phi));
const NBI_PHI = PHI_V - 100 * RAD;
const GAS_PHI = PHI_V + 80 * RAD;
for (const phi of PORTS.concat([NBI_PHI])) {
  const nbi = phi === NBI_PHI;
  S.setPart(nbi ? "nbi" : "poorten");
  const rEnd = nbi ? 214 : 186;
  const hz = nbi ? 15 : 14, ht = nbi ? 9 : 8;
  box(null, phi, [0, ht], -hz, hz, "m", { r0: T.R0 + T.R_OUT - 6, r1: rEnd - 3, skip: ["-r"] });
  const f = box(null, phi, [0, ht + 3], -hz - 3, hz + 3, "m", { r0: rEnd - 3, r1: rEnd, skip: ["-r"] });
  if (!nbi) {
    const n = around(phi);
    for (let i = 0; i < 12; i++) {
      const s = i / 12 * TAU;
      S.dotAt(f.pt(1.55, Math.cos(s) * (ht + 1.4), Math.sin(s) * (hz + 1.4)), { n, size: 0.5, tone: "hi", bias: 0.6 });
    }
    // venster / blindplaat
    const q = [[-ht + 2, -hz + 2], [ht - 2, -hz + 2], [ht - 2, hz - 2], [-ht + 2, hz - 2]].map(([y, z]) => f.pt(1.52, y, z));
    for (let i = 0; i < 4; i++) S.line([q[i], q[(i + 1) % 4]], { tone: "lo", n, bias: 0.55 });
  }
}

// neutralebundelinjector (NBI): de bundelbron die het plasma verwarmt
S.setPart("nbi");
{
  const phi = NBI_PHI, r0 = 214, r1 = 262;
  const stand = box(null, phi, [0, 14], T.FLOOR, -30, "m", { r0: r0 + 6, r1: r1 - 6 });
  const tank = box(null, phi, [0, 22], -30, 34, "m", { r0, r1 });
  // ribben rond de tank
  for (const x of [-16, -6, 4, 14]) {
    const pts = [[-22, -30], [-22, 34], [22, 34], [22, -30]].map(([y, z]) => tank.pt(x, y, z));
    const pts2 = [tank.pt(x, -22.05, -30), tank.pt(x, -22.05, 34), tank.pt(x, 22.05, 34), tank.pt(x, 22.05, -30)];
    S.line([add(pts2[0], tank.et, -0.05), add(pts2[1], tank.et, -0.05)], { tone: "lo", n: add([0, 0, 0], tank.et, -1) });
    S.line([pts2[2], pts2[3]], { tone: "lo", n: tank.et });
    S.line([tank.pt(x, -22, 34.05), tank.pt(x, 22, 34.05)], { tone: "lo", n: [0, 0, 1] });
  }
  // deksel met bouten en een flens bovenop
  for (let i = 0; i < 6; i++) S.dotAt(tank.pt(-20 + i * 8, -19, 34), { n: [0, 0, 1], size: 0.5, tone: "hi" });
  for (let i = 0; i < 6; i++) S.dotAt(tank.pt(-20 + i * 8, 19, 34), { n: [0, 0, 1], size: 0.5, tone: "hi" });
  const top = add(around(phi), [0, 0, 0], 0);
  const cx = add([0, 0, 0], around(phi), 246), cyl = k.cylinder(cx[0], cx[1], 7, 34, 6, P, 28);
  S.raw(`<g>${k.solidSvg(cyl, { tone: "hi" })}</g>`, S.depth([cx[0], cx[1], 40]) + 2);
  S.raw(k.lineSvg(k.knurl(cx[0], cx[1], 7, 34, 40, 28, P), { tone: "lo" }), S.depth([cx[0], cx[1], 40]) + 2.1);
  S.dotAt([cx[0], cx[1], 40], { size: 0.7, tone: "hi", bias: 2.3 });
}

// ------------------------------------------------------------ sokkel
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf({ x: -BASE_R, y: -BASE_R, w: 2 * BASE_R, d: 2 * BASE_R, r: BASE_R }, T.FLOOR - BASE_H, BASE_H, P)}"/>`);
const FOOT_R = 9;
const feet = Array.from({ length: 8 }, (_, i) => [(BASE_R - 22) * Math.cos(i * 45 * RAD + 22.5 * RAD), (BASE_R - 22) * Math.sin(i * 45 * RAD + 22.5 * RAD)])
  .sort((a, b) => S.depth([a[0], a[1], 0]) - S.depth([b[0], b[1], 0]));
for (const [x, y] of feet) back.push(k.solidSvg(k.cylinder(x, y, FOOT_R, T.FLOOR - BASE_H - 6, 6, P, 28), { tone: "mid" }));
back.push(k.solidSvg(k.cylinder(0, 0, BASE_R, T.FLOOR - BASE_H, BASE_H, P, 160, 1.4), { tone: "hi" }));
back.push(k.lineSvg(k.ring(0, 0, BASE_R - 6, T.FLOOR, P, 160), { tone: "lo" }));
back.push(k.lineSvg(k.ring(0, 0, 196, T.FLOOR, P, 140), { tone: "faint" }));
back.push(k.dotsSvg(Array.from({ length: 36 }, (_, i) => k.iso([(BASE_R - 11) * Math.cos(i * 10 * RAD), (BASE_R - 11) * Math.sin(i * 10 * RAD), T.FLOOR], P)), { size: 0.55, tone: "mid" }));
// gradenschaal op de rand van de sokkel (toroïdale hoek), streepjes vanaf de groef
{
  const ticks = k.radialTicks(0, 0, BASE_R - 6, 72, 6, T.FLOOR, [2.2, 4.4], P);
  back.push(k.lineSvg(ticks.minor, { tone: "lo" }), k.lineSvg(ticks.major, { tone: "mid" }));
}
// typeplaatje voor op de sokkel
{
  const plan = { x: 150, y: -96, w: 52, d: 20, r: 1.5 };
  const ph = (p) => p;
  back.push(k.solidSvg(k.slabOf(plan, T.FLOOR, 0.8, P, 3), { tone: "mid", crease: "none" }));
  for (const [i, len] of [[0, 34], [1, 26], [2, 30]]) back.push(k.lineSvg(k.lineOnTop([plan.x + 8, plan.y + 5 + i * 5], [plan.x + 8 + len, plan.y + 5 + i * 5], T.FLOOR + 0.8, P), { tone: "lo", free: true }));
  back.push(k.dotsSvg(k.corners(plan, 2.4).map(([x, y]) => k.iso([x, y, T.FLOOR + 0.8], P)), { size: 0.45, tone: "mid" }));
  void ph;
}

// ------------------------------------------------------------ gasflessen D en T met leiding naar een poort
const front = [];
const BOTTLES = [{ phi: PHI_V + 70 * RAD, label: "D", mass: 2 }, { phi: PHI_V + 86 * RAD, label: "T", mass: 3 }].map((b) => ({ ...b, at: add([0, 0, 0], around(b.phi), 226) }));
const BOT_R = 10, BOT_TOP = T.FLOOR + 74;
const gasItems = [];
for (const b of BOTTLES) {
  const [x, y] = b.at;
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf({ x: x - BOT_R, y: y - BOT_R, w: 2 * BOT_R, d: 2 * BOT_R, r: BOT_R }, T.FLOOR, 2, P)}" style="filter:blur(4px)"/>`);
  parts.push(k.solidSvg(k.cylinder(x, y, BOT_R + 1.5, T.FLOOR, 3, P, 36), { tone: "mid" }));
  parts.push(k.solidSvg(k.cylinder(x, y, BOT_R, T.FLOOR + 3, BOT_TOP - 8 - T.FLOOR - 3, P, 48, 0.6), { tone: "hi" }));
  parts.push(k.lineSvg(k.sideArc(x, y, BOT_R, T.FLOOR + 14, P, 32), { tone: "faint" }));
  parts.push(k.lineSvg(k.sideArc(x, y, BOT_R, BOT_TOP - 22, P, 32), { tone: "faint" }));
  parts.push(k.solidSvg(k.cylinder(x, y, 5, BOT_TOP - 8, 4, P, 28), { tone: "hi" }));
  parts.push(k.solidSvg(k.cylinder(x, y, 2.2, BOT_TOP - 4, 4, P, 20), { tone: "mid" }));
  parts.push(k.solidSvg(k.cylinder(x, y, 4.2, BOT_TOP, 2.4, P, 24), { tone: "hi" }));
  parts.push(k.lineSvg(k.knurl(x, y, 4.2, BOT_TOP, BOT_TOP + 2.4, 20, P), { tone: "lo" }));
  const face = k.sideMatrix([x + BOT_R * Math.cos(PHI_V), y + BOT_R * Math.sin(PHI_V)], T.FLOOR + 36, P, "left");
  void face;
  gasItems.push({ key: S.depth([x, y, T.FLOOR + 30]), svg: `<g data-part="fles-${b.label}">${parts.join("")}</g>` });
  b.text = k.iso([x, y, T.FLOOR + 38], P);
}
// leiding: van elke fles omhoog, samen naar de gaspoort
{
  const portR = 186, port = add([0, 0, 0], around(GAS_PHI), portR);
  const routes = BOTTLES.map((b, i) => {
    const [x, y] = b.at;
    const up = [x, y, BOT_TOP + 2.4];
    const mid = add(add([0, 0, 0], around(GAS_PHI), 212), [0, 0, 0]);
    return Gl.fillet([up, [x, y, BOT_TOP + 14 + i * 6], [mid[0], mid[1], BOT_TOP + 14 + i * 6], [mid[0], mid[1], -6 + i * 10], [port[0] + Math.cos(GAS_PHI) * 1, port[1] + Math.sin(GAS_PHI) * 1, -6 + i * 10]], 7, 8);
  });
  for (const route of routes) {
    for (const piece of tubePieces(route, 1.5, P, { maxLength: 10 })) gasItems.push({ key: Gl.dot3(piece.mid, S.V) + 0.5, svg: tubeSvg(piece, { tone: "hi" }) });
  }
  // klep op de leiding
  const v = add([0, 0, 0], around(GAS_PHI), 212);
  for (const [i, z] of [[0, -6], [1, 4]]) gasItems.push({ key: S.depth([v[0], v[1], z]) + 2, svg: k.solidSvg(Gl.sphereOf([v[0], v[1], z], 2.6, P), { tone: "hi" }) });
}
S.setPart("brandstof");
for (const g of gasItems) S.raw(g.svg, g.key);

// ------------------------------------------------------------ vermogensmeter (fusievermogen in MW)
const DIAL = add([0, 0, 0], around(PHI_V - 50 * RAD), 228);
const DIAL_R = 21, DIAL_Z = T.FLOOR + 46, DIAL_H = 7, DIAL_TOP = DIAL_Z + DIAL_H;
{
  const [x, y] = DIAL;
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf({ x: x - 14, y: y - 14, w: 28, d: 28, r: 14 }, T.FLOOR, 2, P)}" style="filter:blur(4px)"/>`);
  parts.push(k.solidSvg(k.slabOf({ x: x - 13, y: y - 13, w: 26, d: 26, r: 3 }, T.FLOOR, 5, P, 4, 0.6), { tone: "mid" }));
  parts.push(k.dotsSvg(k.corners({ x: x - 13, y: y - 13, w: 26, d: 26, r: 3 }, 3.5).map(([px, py]) => k.iso([px, py, T.FLOOR + 5], P)), { size: 0.45, tone: "hi" }));
  parts.push(k.solidSvg(k.cylinder(x, y, 3.4, T.FLOOR + 5, DIAL_Z - T.FLOOR - 5, P, 24), { tone: "mid" }));
  parts.push(k.lineSvg(k.sideArc(x, y, 3.4, T.FLOOR + 24, P, 12), { tone: "lo" }));
  parts.push(k.solidSvg(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  parts.push(k.lineSvg(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  parts.push(k.lineSvg(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 72), { tone: "lo" }));
  const span = 1.5 * Math.PI, from = -0.75 * Math.PI;
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 50, 5, DIAL_TOP, [1.3, 2.8], P, from, span);
  parts.push(k.lineSvg(ticks.minor, { tone: "lo" }), k.lineSvg(ticks.major, { tone: "mid" }));
  parts.push(k.lineSvg(k.ring(x, y, 1.8, DIAL_TOP, P, 16), { tone: "mid" }));
  parts.push(k.faceTextSvg(k.topMatrix([x, y + 9], DIAL_TOP, P, "x"), "MW", { size: 2.6, tone: "lo", anchor: "middle" }));
  front.push(`<g data-part="meter">${parts.join("")}</g>`);
}

// ------------------------------------------------------------ plasma (overlay, alleen in de uitsnede)
// Elke laag is de projectie van een gedeeltelijke torus op flux-oppervlak rho: de omhullende van
// opeenvolgende D-doorsneden. Een groep met opacity geeft één egale gloed zonder naden.
const r1 = (v) => Math.round(v * 10) / 10;
const pathOf = (pts) => "M" + pts.map(([x, y]) => r1(x) + " " + r1(y)).join("L") + "Z";
function plasmaShell(rho, steps = 40) {
  const d = [];
  const sec = (phi) => Array.from({ length: 40 }, (_, j) => k.iso(T.torus(rho * T.A, j / 40 * TAU, phi), P));
  let prev = sec(PHI1);
  for (let i = 1; i <= steps; i++) {
    const cur = sec(PHI1 + (PHI2 - PHI1) * i / steps);
    d.push(pathOf(Gl.hullOf(prev.concat(cur))));
    prev = cur;
  }
  return d.join("");
}
const PL_RHO = [1.14, 1.0, 0.87, 0.74, 0.61, 0.48, 0.35, 0.22];
const PL_COL = ["#ecb3dc", "#d862b4", "#dd6dba", "#e384c5", "#ea9fd2", "#f1bde1", "#f8daee", "#fff3fb"];
const PLASMA_LAYERS = PL_RHO.map((rho, i) => `<path class="pl" fill="${PL_COL[i]}" d="${plasmaShell(rho, 32)}"/>`);
// een magnetische veldlijn (schroeflijn) op het plasmaoppervlak, alleen zichtbaar als de laag aan staat
function fieldLine(rho, turns, phase) {
  const pts = [];
  const N = 360;
  for (let i = 0; i <= N; i++) {
    const phi = PHI1 + (PHI2 - PHI1) * i / N;
    const th = phase + (phi - PHI1) / (1 + 2 * rho * rho) * turns;
    pts.push({ p: T.torus(rho * T.A, th, phi), th, phi });
  }
  return pts;
}
// alleen het voorste deel van de schroeflijn (de achterkant ligt achter het plasma)
const FIELD = [];
for (const phase of [0, 2.1, 4.2]) {
  const pts = fieldLine(1.02, 3.2, phase);
  let run = [];
  const flushRun = () => { if (run.length > 1) FIELD.push("M" + run.map(([x, y]) => r1(x) + " " + r1(y)).join("L")); run = []; };
  for (const { p, th, phi } of pts) {
    const n = subv(T.torus(T.A * 1.1, th, phi), T.torus(T.A, th, phi));
    if (Gl.dot3(n, S.V) > 0) run.push(k.iso(p, P)); else flushRun();
  }
  flushRun();
}

// ------------------------------------------------------------ alles samen
const machine = S.render();
const svgBody = [
  `<g class="back" data-p="sokkel">${back.join("")}</g>`,
  `<g class="machine">${machine}</g>`,
  `<g class="front" data-p="meter">${front.join("")}</g>`,
  `<g class="plasma" data-part="plasma" data-p="plasma">${PLASMA_LAYERS.join("")}</g>`,
  `<path class="field" data-part="field" d="${FIELD.join("")}"/>`,
  `<g class="live" data-part="live" data-p="plasma"></g>`,
  `<path class="needle iso-line" data-tone="lit" data-part="needle" data-p="meter" d=""/>`,
  ...BOTTLES.map((b) => `<text class="tag" data-p="brandstof" x="${r1(b.text[0])}" y="${r1(b.text[1])}" text-anchor="middle"><tspan font-size="9" dy="-5">${b.mass}</tspan><tspan dy="5">H</tspan></text>`),
];
const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="figTitle figDesc" xmlns="http://www.w3.org/2000/svg"><title id="figTitle">Tokamak met uitsnede</title><desc id="figDesc">Een tokamak op een ronde sokkel. Een kwart van het vacuümvat, de mantel en de spoelen is weggesneden, zodat het gloeiende ²H-³H-plasma zichtbaar is. Achttien toroïdale veldspoelen en vier poloïdale ringen houden het plasma vast; links staan flessen deuterium (²H) en tritium (³H), rechts achteraan de neutralebundelinjector, rechts vooraan een meter voor het fusievermogen.</desc>${svgBody.join("")}</svg>`;

const DATA = {
  P, K: KS, W, H, R0: T.R0, A: T.A, KAPPA: T.KAPPA, DELTA: T.DELTA, R_FW: T.R_FW, R_BL: T.R_BL,
  PHI1, PHI2, DIAL: [DIAL[0], DIAL[1]], DIAL_R, DIAL_TOP,
};

const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8");
const page = readFileSync(join(HERE, "page.html"), "utf8")
  .replace("/*ISO_CSS*/", k.ISO_CSS)
  .replace("<!--SVG-->", svg)
  .replace("/*SCRIPT*/", `const DATA = ${JSON.stringify(DATA)};\n${model}\n${live}`);
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB", S.items.length + " items");
