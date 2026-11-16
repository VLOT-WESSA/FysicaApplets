// Bouwt ../../bel.dc.html: een elektrische bel (zelfonderbreker) op een plankje.
//   node tools/bel/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";
import { pageHtml, kitScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "bel.dc.html");
const W = 880, H = 580;

// ------------------------------------------------------------ maten (≈ mm, x/y op het plankje, z omhoog)
const BOARD = { x: -150, y: -88, w: 300, d: 176, r: 6 }, BOARD_H = 10;
const PIVOT = [-92, -5];                       // draaipunt van het anker (in de klem)
const BAR = { s0: 4, s1: 181, w0: -0.6, w1: 1.4, z0: 13, z1: 23 };
const KEEP = { s0: 39, s1: 107, w0: 1.4, w1: 3.6, z0: 11, z1: 25 };   // weekijzer onder de polen
const BALL = { s: 181, w: 1.4, z: 18, r: 6 };
const RIVET = { s: 122, r: 1.6 };              // contactnagel op de onderkant van het anker
const LEGS = [-43, 5], LEG_HW = 7, POLE_Y = 5.2, CORE_Z = 18, CORE_HZ = 7;
const YOKE = { y0: 40, y1: 52 };
const COIL = { y0: 10, y1: 34, r: 10.6, flange: 12.2 };
const HIT = 12;
const GONG_R18 = 29.5;
const GONG = [PIVOT[0] + BALL.s, PIVOT[1] + BALL.w + HIT + BALL.r + GONG_R18];
const GONG_Z = 9;
const SCREW = { x: PIVOT[0] + RIVET.s, post: [-26, -16] };
const BAT = { x: -144, y: -80, w: 34, d: 42, r: 2 }, BAT_H = 46;
const BTN = [62, -62];

const P = k.fitProjection(
  [...k.boxCorners(BOARD, -BOARD_H - 5, 0), [GONG[0], GONG[1] + 31, 34], [GONG[0] + 31, GONG[1], 34], [BAT.x, BAT.y, BAT_H], [-100, 50, 30]],
  W, H, { pad: 22, azimuth: -40, elevation: 34 });
const V = G.viewOf(P);
const depth = (p) => G.dot3(p, V);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const at = (p) => k.iso(p, P);
const items = [];
const put = (p, key, svg) => items.push({ p, key, svg });

// ------------------------------------------------------------ plankje
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BOARD, -BOARD_H - 5, BOARD_H, P)}"/>`);
for (const [x, y] of k.corners(BOARD, 16).sort((a, b) => depth([...a, 0]) - depth([...b, 0]))) {
  back.push(S(k.cylinder(x, y, 7, -BOARD_H - 5, 5, P, 24), { tone: "mid" }));
}
back.push(S(k.slabOf(BOARD, -BOARD_H, BOARD_H, P, 8, 1.4), { tone: "hi", className: "wood" }));
back.push(Ln(k.planOutline(k.insetPlan(BOARD, 5), 0, P), { tone: "lo" }));
// houtnerf: lijnen van rand tot rand op het blad
for (const y of [-70, -41, -12, 23, 51, 76]) back.push(Ln(k.lineOnTop([BOARD.x + 5, y], [BOARD.x + BOARD.w - 5, y + 2], 0, P), { tone: "faint" }));
const screwsB = k.corners(BOARD, 9);
back.push(Ln(screwsB.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(k.dotsSvg(screwsB.map(([x, y]) => at([x, y, 0])), { size: 0.55, tone: "hi" }));
// typeplaatje vooraan
{
  const plan = { x: 96, y: -82, w: 46, d: 16, r: 1.5 };
  back.push(S(k.slabOf(plan, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
  for (const [i, len] of [[0, 30], [1, 22]]) back.push(Ln(k.lineOnTop([plan.x + 7, plan.y + 5 + i * 5], [plan.x + 7 + len, plan.y + 5 + i * 5], 0.8, P), { tone: "lo", free: true }));
  back.push(k.dotsSvg(k.corners(plan, 2.4).map(([x, y]) => at([x, y, 0.8])), { size: 0.45, tone: "mid" }));
}

// ------------------------------------------------------------ draden (liggen op het plankje)
const WR = 1.25;
const terminal = (x, y) => [S(k.cylinder(x, y, 3, 0, 2.4, P, 20), { tone: "mid" }), S(k.cylinder(x, y, 1.6, 2.4, 1.2, P, 16), { tone: "hi" }), k.dotsSvg([at([x, y, 3.6])], { size: 0.6, tone: "hi" })].join("");
const WIRES = [
  { id: "plus", from: [-108, -70], via: [[48, -70]], to: [48, -62] },                         // batterij + → drukknop
  { id: "knop", from: [76, -62], via: [[118, -62], [118, 74]], to: [5, 74], end: [5, 64] },     // drukknop → spoel B
  { id: "spoel", from: [-43, 64], via: [[-43, 74], [-95, 74]], to: [-95, 9] },                 // spoel A → klem van het anker
  { id: "min", from: [SCREW.x, -32], via: [[SCREW.x, -48]], to: [-108, -48] },                  // contactschroef → batterij −
];
const wireSvg = [], flowSvg = [];
for (const w of WIRES) {
  const pts = [w.from, ...w.via, w.to, ...(w.end ? [w.end] : [])].map(([x, y]) => [x, y, WR]);
  const route = G.fillet(pts, 6, 8);
  for (const piece of tubePieces(route, WR, P, { maxLength: 400 })) wireSvg.push(tubeSvg(piece, { tone: "hi" }));
  flowSvg.push(`<path class="flow" data-w="${w.id}" d="${k.pathOf(route.map(at))}"/>`);
}
back.push(`<g data-p="draden" class="wires">${wireSvg.join("")}${flowSvg.join("")}</g>`);

// ------------------------------------------------------------ batterij (4,5 V platte batterij)
{
  const parts = [];
  parts.push(S(k.slabOf(k.insetPlan(BAT, -3), 0, 2, P, 3), { tone: "mid" }));
  parts.push(S(k.slabOf(BAT, 2, BAT_H - 2, P, 3, 0.6), { tone: "hi" }));
  parts.push(Ln(k.sideSeam(BAT, BAT_H - 8, P, 3), { tone: "lo" }));
  parts.push(Ln(k.sideSeam(BAT, 8, P, 3), { tone: "lo" }));
  // twee koperen lipjes over de rand, naar de klemmen
  for (const [y, len] of [[-70, 7], [-48, 12]]) {
    const strip = { x: BAT.x + BAT.w - 10, y: y - 2.5, w: 10, d: 5, r: 0.5 };
    parts.push(S(k.slabOf(strip, BAT_H, 0.8, P, 2), { tone: "mid", className: "brass" }));
    parts.push(S(k.slabOf({ x: BAT.x + BAT.w, y: y - 2.5, w: 0.8, d: 5, r: 0.2 }, BAT_H - 18, 18.8, P, 2), { tone: "mid", className: "brass" }));
    void len;
  }
  parts.push(k.faceTextSvg(k.topMatrix([BAT.x + 14, BAT.y + 21], BAT_H, P, "y"), "4,5 V", { size: 5, tone: "mid", anchor: "middle" }));
  parts.push(k.faceTextSvg(k.topMatrix([BAT.x + 27, -69], BAT_H, P, "y"), "+", { size: 4, tone: "hi", anchor: "middle" }));
  parts.push(k.faceTextSvg(k.topMatrix([BAT.x + 27, -47], BAT_H, P, "y"), "−", { size: 4, tone: "hi", anchor: "middle" }));
  put("batterij", depth([BAT.x + BAT.w / 2, BAT.y + BAT.d / 2, 10]), parts.join(""));
  put("batterij", depth([-108, -60, 2]) + 30, terminal(-108, -70) + terminal(-108, -48));
}

// ------------------------------------------------------------ elektromagneet: U-kern, beugel, spoelen
{
  const core = { x: LEGS[0] - LEG_HW, y: YOKE.y0, w: LEGS[1] - LEGS[0] + 2 * LEG_HW, d: YOKE.y1 - YOKE.y0, r: 1 };
  put("kern", depth([-19, 47, 5]) - 40, S(k.slabOf({ x: core.x + 2, y: 42, w: core.w - 4, d: 10, r: 1 }, 0, CORE_Z - CORE_HZ, P, 3, 0.4), { tone: "mid" }) +
    k.dotsSvg([at([core.x + 6, 47, CORE_Z - CORE_HZ]), at([core.x + core.w - 6, 47, CORE_Z - CORE_HZ])], { size: 0.5, tone: "hi" }));
  put("kern", depth([-19, 46, CORE_Z]) - 30, S(k.slabOf(core, CORE_Z - CORE_HZ, 2 * CORE_HZ, P, 3, 0.5), { tone: "mid", className: "iron" }) +
    Ln(k.lineOnTop([core.x + 2, 46], [core.x + core.w - 2, 46], CORE_Z + CORE_HZ, P), { tone: "faint" }));
  // klemmenstrook achter de kern
  const strip = { x: core.x, y: 58, w: core.w, d: 10, r: 1.5 };
  put("spoelen", depth([-19, 63, 0]) - 50, S(k.slabOf(strip, 0, 3, P, 3, 0.4), { tone: "mid" }) + terminal(LEGS[0], 64) + terminal(LEGS[1], 64));
  for (const cx of LEGS) {
    const leg = { x: cx - LEG_HW, y: COIL.y0, w: 2 * LEG_HW, d: YOKE.y0 - COIL.y0, r: 0.8 };
    put("kern", depth([cx, 25, CORE_Z]) - 20, S(k.slabOf(leg, CORE_Z - CORE_HZ, 2 * CORE_HZ, P, 2), { tone: "mid", className: "iron" }));
    // spoel: spoelvorm met twee flenzen en koperdraad
    const F = G.frameAlong([cx, COIL.y0, CORE_Z], [0, 1, 0]);
    const body = S(G.disc(1.2, COIL.y1 - COIL.y0 - 1.2, COIL.r, F, P), { tone: "hi", className: "copper" });
    const fl0 = S(G.disc(0, 1.2, COIL.flange, F, P), { tone: "mid" });
    const fl1 = S(G.disc(COIL.y1 - COIL.y0 - 1.2, COIL.y1 - COIL.y0, COIL.flange, F, P), { tone: "mid" });
    const wind = k.coil(COIL.y0 + 1.4, COIL.y1 - 1.4, [cx, CORE_Z], COIL.r + 0.1, 15, "y", P, 24);
    put("spoelen", depth([cx, 22, CORE_Z]) - 5, fl1 + body + Ln(wind.front, { tone: "lo", className: "wind" }) + fl0);
    // aansluitdraadje van de spoel naar de klem
    const lead = G.fillet([[cx + 4, COIL.y1 - 0.5, CORE_Z - COIL.r + 2], [cx + 4, 50, 6], [cx, 62, 3.4]], 4, 6);
    for (const piece of tubePieces(lead, 0.6, P, { maxLength: 400 })) put("spoelen", depth([cx, 48, 4]) - 46, tubeSvg(piece, { tone: "hi" }));
    // poolstuk vóór de spoel
    const pole = { x: cx - LEG_HW, y: POLE_Y, w: 2 * LEG_HW, d: COIL.y0 - POLE_Y + 0.2, r: 0.8 };
    put("kern", depth([cx, 6, CORE_Z]) + 2, S(k.slabOf(pole, CORE_Z - CORE_HZ, 2 * CORE_HZ, P, 2, 0.4), { tone: "mid", className: "iron" }));
  }
  // de twee spoelen in serie: draadbrug bovenover
  const bridge = G.fillet([[LEGS[0] + 3, COIL.y0 + 3, CORE_Z + COIL.r - 0.4], [LEGS[0] + 3, COIL.y0 + 3, CORE_Z + COIL.r + 4], [LEGS[1] - 3, COIL.y0 + 3, CORE_Z + COIL.r + 4], [LEGS[1] - 3, COIL.y0 + 3, CORE_Z + COIL.r - 0.4]], 3, 6);
  for (const piece of tubePieces(bridge, 0.6, P, { maxLength: 400 })) put("spoelen", depth([-19, 13, 30]) + 1, tubeSvg(piece, { tone: "hi" }));
}

// ------------------------------------------------------------ bel (gong) op een stang
{
  const [x, y] = GONG;
  const F = G.frameOf([x, y, GONG_Z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const prof = [[0, 31], [1.2, 31.4], [2.6, 31.2, 1], [9, 29.5, 1], [15, 25.2, 1], [19, 18.5, 1], [21.4, 9.5, 1], [22, 0]];
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf({ x: x - 26, y: y - 26, w: 52, d: 52, r: 26 }, 0, 2, P)}" style="filter:blur(6px)"/>`);
  parts.push(S(k.cylinder(x, y, 7, 0, 3, P, 28, 0.4), { tone: "mid" }));
  parts.push(k.dotsSvg([at([x - 4.5, y, 3]), at([x + 4.5, y, 3])], { size: 0.45, tone: "hi" }));
  parts.push(S(k.cylinder(x, y, 2.8, 3, GONG_Z, P, 20), { tone: "mid" }));
  parts.push(`<g class="gong" data-part="gong">` + S(G.solidOf(prof, F, P), { tone: "hi", className: "bellmetal" }) +
    Ln(G.arcOf(F, 2.6, 31.2, P, { slope: -0.2 }), { tone: "lo" }) + Ln(G.arcOf(F, 12, 27.6, P, { slope: -0.6 }), { tone: "faint" }) +
    S(k.cylinder(x, y, 4.4, GONG_Z + 22, 2.2, P, 24), { tone: "mid" }) + S(k.cylinder(x, y, 2.2, GONG_Z + 24.2, 1.4, P, 16), { tone: "hi" }) +
    Ln(k.lineOnTop([x - 1.6, y - 1.6], [x + 1.6, y + 1.6], GONG_Z + 25.6, P), { tone: "hi" }) + `</g>`);
  put("bel", depth([x, y, 10]), parts.join(""));
}

// ------------------------------------------------------------ klem van het anker (met bladveer)
{
  const [px, py] = PIVOT;
  const plan = { x: px - 10, y: py - 9, w: 14, d: 18, r: 1.5 };
  const parts = [S(k.slabOf(k.insetPlan(plan, -2), 0, 3, P, 3, 0.4), { tone: "mid" }), S(k.slabOf(plan, 3, 25, P, 3, 0.6), { tone: "mid", className: "brass" })];
  parts.push(S(k.cylinder(px - 3, py - 4, 2.4, 28, 1.6, P, 16), { tone: "hi" }), S(k.cylinder(px - 3, py + 4, 2.4, 28, 1.6, P, 16), { tone: "hi" }));
  parts.push(Ln(k.lineOnTop([px - 4.6, py - 4], [px - 1.4, py - 4], 29.6, P), { tone: "hi" }), Ln(k.lineOnTop([px - 4.6, py + 4], [px - 1.4, py + 4], 29.6, P), { tone: "hi" }));
  put("klem", depth([px - 3, py, 14]), parts.join(""));
  put("klem", depth([px - 3, py, 14]) + 0.5, terminal(-95, 9));
}

// ------------------------------------------------------------ contactschroef T (onderbreker)
{
  const [y0, y1] = SCREW.post;
  const plan = { x: SCREW.x - 7, y: y0 - 4, w: 14, d: y1 - y0 + 4, r: 1.4 };
  const parts = [S(k.slabOf(k.insetPlan(plan, -2.5), 0, 3, P, 3, 0.4), { tone: "mid" }), S(k.slabOf({ x: SCREW.x - 5, y: y0, w: 10, d: y1 - y0, r: 1 }, 3, 21, P, 3, 0.5), { tone: "mid", className: "brass" })];
  const tipY = PIVOT[1] + BAR.w0 - 0.9;
  const F = G.frameAlong([SCREW.x, y0 - 6, BALL.z], [0, 1, 0]);
  parts.push(S(G.disc(0, 4, 4.4, F, P), { tone: "mid", className: "brass" }));
  parts.push(Ln(G.ribsOf(F, 0.3, 3.7, 4.4, 28, P), { tone: "lo" }));
  parts.push(S(G.disc(4, 6, 3.6, F, P), { tone: "mid" }));                         // borgmoer
  parts.push(S(G.disc(6, tipY - (y0 - 6), 1.5, F, P), { tone: "hi", className: "silver" }));
  put("schroef", 1e3 + 1, parts.join(""));
  put("schroef", 1e3 + 2, terminal(SCREW.x, -32));
}

// ------------------------------------------------------------ drukknop K
{
  const [x, y] = BTN;
  const plate = { x: x - 18, y: y - 9, w: 36, d: 18, r: 2 };
  put("knop", 1e3 + 4, S(k.slabOf(plate, 0, 2, P, 3, 0.4), { tone: "mid" }) + S(k.cylinder(x, y, 10, 2, 7, P, 40, 0.6), { tone: "hi" }) +
    Ln(k.ring(x, y, 7.6, 9, P, 32), { tone: "lo" }) + terminal(48, -62) + terminal(76, -62));
  put("knop", 1e3 + 5, `<g data-part="cap">${S(k.cylinder(x, y, 6.2, 9, 4.5, P, 32, 0.5), { tone: "hi", className: "button" })}</g>`);
}

// ------------------------------------------------------------ anker (wordt in de pagina per beeld getekend)
put("anker", 1e3, `<g data-part="field" class="field"></g><g data-part="armature"></g>`);
put("schroef", 1e3 + 3, `<g data-part="spark"></g>`);

items.sort((a, b) => a.key - b.key);
const fig = [`<g data-p="plankje">${back.slice(0, -1).join("")}</g>`, back[back.length - 1], ...items.map((it) => `<g data-p="${it.p}">${it.svg}</g>`), `<g data-part="waves" class="waves"></g>`];
const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Elektrische bel</title><desc id="d">Een elektrische bel op een houten plankje: een batterij, een drukknop, een U-vormige elektromagneet met twee spoelen, een ijzeren anker met een hamer en een contactschroef, en een bel. Als de kring gesloten is, trekt de magneet het anker aan, de hamer slaat op de bel en het contact bij de schroef gaat open; het anker veert terug en het spel herhaalt zich.</desc><g class="fig">${fig.join("")}</g></svg>`;

const DATA = { P, PIVOT, BAR, KEEP, BALL, RIVET, LEGS, LEG_HW, POLE_Y, CORE_Z, CORE_HZ, GONG, HIT, BTN, SCREW };
const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8");

const side = `
      <div class="action-row">
        <button class="btn-accent" id="run">Drukknop indrukken</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Kring open: de bel zwijgt</span></div>
        <div class="row"><span>Stroom door de spoelen (piek)</span><b id="rI">0,00 A</b></div>
        <div class="row"><span>Contact bij de schroef T</span><b id="rC">gesloten</b></div>
        <div class="row"><span>Slagen per seconde (echt)</span><b id="rF">–</b></div>
        <div class="toggles"><button class="toggle" id="slow" aria-pressed="true">Vertraagd (40&times; trager)</button></div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps" id="steps">
          <li><span>Je drukt op de knop <b>K</b>: de kring is gesloten en er loopt stroom door de spoelen.</span></li>
          <li><span>De ijzeren kern <b>E</b> wordt een elektromagneet en trekt het anker <b>A</b> aan. De hamer slaat op de bel <b>B</b>.</span></li>
          <li><span>Het anker komt los van de contactschroef <b>T</b>: de kring is onderbroken en de magneet verliest zijn kracht.</span></li>
          <li><span>De bladveer duwt het anker terug tegen de schroef. De kring sluit weer en alles begint opnieuw.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;

const legend = `
        <span><i class="bar" style="background:#e0a020"></i>stroom (van + naar −)</span>
        <span><i class="bar" style="background:#1f7f86"></i>magnetisch veld in de spleet</span>
        <span><i class="bar" style="background:#b8733a"></i>koperdraad van de spoelen</span>
        <span><i class="bar" style="background:#8f98a3"></i>weekijzer</span>`;

const css = `
  .wood>.iso-top{fill:#f3e6cf}.wood>.iso-shade[data-shade="0"]{fill:#d9c29d}.wood>.iso-shade[data-shade="1"]{fill:#e2cda9}.wood>.iso-shade[data-shade="2"]{fill:#e9d7b6}.wood>.iso-shade[data-shade="3"]{fill:#efdfc2}
  .brass>.iso-top{fill:#f1dfa8}.brass>.iso-shade{fill:#dcc27c}.brass>.iso-shade[data-shade="3"],.brass>.iso-shade[data-shade="2"]{fill:#e7d08f}
  .copper>.iso-top,.copper>.iso-shade{fill:#d99a68}.copper>.iso-shade[data-shade="0"]{fill:#b8733a}.copper>.iso-shade[data-shade="1"]{fill:#c4834b}.copper>.iso-shade[data-shade="2"]{fill:#cf8f59}
  .wind{stroke:#8a4f22 !important}
  .iron>.iso-top{fill:#e4e7ea}.iron>.iso-shade[data-shade="0"]{fill:#a9b0b8}.iron>.iso-shade[data-shade="1"]{fill:#b7bdc4}.iron>.iso-shade[data-shade="2"]{fill:#c5cad0}.iron>.iso-shade[data-shade="3"]{fill:#d3d7dc}
  .bellmetal .iso-shade,.bellmetal .iso-top{fill:#e7dcc0;stroke:#e7dcc0}.bellmetal .iso-shade[data-shade="0"]{fill:#c3b28a;stroke:#c3b28a}.bellmetal .iso-shade[data-shade="1"]{fill:#d1c19b;stroke:#d1c19b}.bellmetal .iso-shade[data-shade="2"]{fill:#dccdaa;stroke:#dccdaa}
  .silver>.iso-top,.silver>.iso-shade{fill:#e6e8ea}
  .button>.iso-top{fill:#e46b55}.button>.iso-shade{fill:#c9503b}.button>.iso-shade[data-shade="3"]{fill:#d65e48}
  .wires .tb-body{fill:#5d6876}.wires .tb-shine{fill:#8c97a4}.wires .tb-shade{fill:#3f4954}
  .flow{fill:none;stroke:#f2b631;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:3 7;opacity:0;vector-effect:non-scaling-stroke}
  .field path{fill:none;stroke:#1f7f86;stroke-width:1;vector-effect:non-scaling-stroke}
  .waves path{fill:none;stroke:#1d2a3a;stroke-width:1;vector-effect:non-scaling-stroke}
`;

const PARTS = [
  { id: "bel", name: "B · bel", text: "Een schaal van belbrons op een stang. Als de hamer ertegen slaat, trilt de schaal en dat hoor je als geluid.", fact: "toonhoogte hangt af van grootte en dikte van de schaal" },
  { id: "kern", name: "E · weekijzeren kern", text: "Een U-vormige kern van weekijzer. Zonder stroom is hij niet magnetisch. Loopt er stroom door de spoelen, dan worden de twee benen een noord- en een zuidpool. Weekijzer verliest zijn magnetisme meteen weer als de stroom stopt; staal zou magnetisch blijven.", fact: "weekijzer: groot μr, kleine remanentie" },
  { id: "spoelen", name: "Spoelen", text: "Twee spoelen van gelakt koperdraad rond de benen van de kern, in serie geschakeld en in tegengestelde zin gewonden, zodat het ene been noord en het andere zuid wordt. Hoe meer windingen en hoe groter de stroom, hoe sterker de magneet.", fact: "B ~ N · I" },
  { id: "anker", name: "A · anker met hamer", text: "Een ijzeren strip met een plaatje weekijzer onder de polen en een kogeltje (de hamer) aan het eind. De magneet trekt het anker aan; de hamer beweegt dan naar de bel.", fact: "hefboom: de hamer beweegt ruim 2× verder dan het weekijzer" },
  { id: "klem", name: "Bladveer en klem", text: "Het anker zit met een verende strip vast in een koperen klem. De veer trekt het anker terug zodra de magneet loslaat. Via deze klem loopt ook de stroom het anker in.", fact: "veerkracht F = −k · u" },
  { id: "schroef", name: "T · contactschroef", text: "De punt van de schroef raakt het anker in rust. Zo is de kring gesloten. Trekt de magneet het anker weg, dan komt er een spleetje en is de kring open: de bel onderbreekt zelf haar stroom. Met de schroef stel je in hoe snel ze rinkelt.", fact: "zelfonderbreker: vonkjes slijten de punt" },
  { id: "knop", name: "K · drukknop", text: "Een schakelaar die alleen sluit zolang je drukt. Laat je los, dan is de kring open en stopt de bel.", fact: "" },
  { id: "batterij", name: "U · batterij", text: "Een platte batterij van 4,5 V levert de spanning die de stroom door de kring drijft.", fact: "I = U / R = 4,5 V / 3 Ω = 1,5 A" },
  { id: "draden", name: "Draden", text: "Geïsoleerde koperdraden verbinden alles tot één kring: + → drukknop → spoelen → klem → anker → contactschroef → −. De gele streepjes tonen de (conventionele) stroomzin.", fact: "één onderbreking waar ook en de stroom stopt overal" },
];

const page = pageHtml({
  title: "Elektrische bel", h1: "Elektrische bel", hue: 150, icon: "bel", W, H, svg, legend, side, css,
  corners: { tl: "zelfonderbreker", bl: "klik op een onderdeel voor uitleg", br: "kring open" },
  script: `${kitScript()}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\n${model}\n${PARTS_SCRIPT}\n${live}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
