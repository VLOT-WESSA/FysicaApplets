// Bouwt ../../kookplaat.dc.html: een inductiekookplaat met een pan water, in kwartdoorsnede.
//   node tools/kookplaat/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";
import { painter } from "../shared/painter.mjs";
import { halfBody } from "../shared/revolve.mjs";
import { pageHtml, kitScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "kookplaat.dc.html");
const W = 880, H = 600;
const HX = [-175, 175], HY = [-135, 135], GZ = [40, 44];
const P = k.fitProjection([[HX[0], HY[0], -4], [HX[1], HY[0], -4], [HX[0], HY[1], -4], [HX[1], HY[1], -4], [0, 0, 150], [-40, -40, 150], [-150, -150, 116]], W, H, { pad: 18, azimuth: 45, elevation: 30 });
const F = { o: [0, 0, 0], ax: [0, 0, 1], up: [1, 0, 0], back: [0, 1, 0] };
const KEEP = { psi0: Math.PI / 2, psi1: 2 * Math.PI };
const S = painter(P);
const r1 = (v) => Math.round(v * 10) / 10;

function box(x, y, z, cls, part, cell = 10, top = true) {          // as-uitgelijnde doos [x0,x1],[y0,y1],[z0,z1]
  S.setPart(part);
  const n = (a, b) => Math.max(1, Math.round((b - a) / cell));
  S.patch((u, v) => [x[1], y[0] + (y[1] - y[0]) * u, z[0] + (z[1] - z[0]) * v], n(...y), n(...z), { cls, toward: () => [1, 0, 0] });
  S.patch((u, v) => [x[0] + (x[1] - x[0]) * u, y[1], z[0] + (z[1] - z[0]) * v], n(...x), n(...z), { cls, toward: () => [0, 1, 0] });
  if (top) S.patch((u, v) => [x[0] + (x[1] - x[0]) * u, y[0] + (y[1] - y[0]) * v, z[1]], n(...x), n(...y), { cls, toward: () => [0, 0, 1] });
}

// ------------------------------------------------------------ behuizing
box(HX, HY, [-4, 3], "h", "behuizing", 14);
box([HX[0], HX[0] + 3], HY, [3, GZ[0]], "h", "behuizing", 10, false);
box(HX, [HY[0], HY[0] + 3], [3, GZ[0]], "h", "behuizing", 10, false);
box([HX[0], 0], [HY[1] - 3, HY[1]], [3, GZ[0]], "h", "behuizing", 10, false);
box([HX[1] - 3, HX[1]], [HY[0], 0], [3, GZ[0]], "h", "behuizing", 10, false);
// ventilatiesleuven in de voorwand
for (let x = -150; x < -20; x += 12) S.line([[x, HY[1] + 0.05, 10], [x, HY[1] + 0.05, 30]], { tone: "lo", n: [0, 1, 0] });
// glaskeramische plaat (L-vorm: het voorste kwart is weggezaagd)
box(HX, [HY[0], 0], GZ, "g", "glas", 14);
box([HX[0], 0], [0, HY[1]], GZ, "g", "glas", 14);
// opdruk op het glas: kookzone en bediening
S.setPart("glas");
const arc = (R, z, a0, a1, n = 64) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [R * Math.cos(a), R * Math.sin(a), z]; });
for (const R of [96, 100]) { const pts = arc(R, GZ[1] + 0.05, KEEP.psi0, KEEP.psi1); for (let i = 0; i + 1 < pts.length; i++) S.line([pts[i], pts[i + 1]], { tone: "faint", n: [0, 0, 1], bias: 0.3 }); }
const GLASS_TOP = GZ[1] + 0.05;

// ------------------------------------------------------------ spoel, drager, ferriet
const PROF = {
  carrier: [[19, 0], [19, 94], [23, 94], [23, 0]],
  coil: [[24, 8], [24, 82], [30, 82], [30, 8]],
  mica: [[38.6, 0], [38.6, 92], [39.6, 92], [39.6, 0]],
};
S.setPart("drager"); halfBody(S, F, PROF.carrier, { cls: "d", cut: "xd", ...KEEP, steps: 40 });
S.setPart("spoel"); halfBody(S, F, PROF.coil, { cls: "cu", cut: "xc", ...KEEP, steps: 40 });
// windingen: ringen op de bovenkant van de spoel en draaddoorsneden op de snijvlakken
S.setPart("spoel");
for (let R = 11; R < 82; R += 4.5) { const pts = arc(R, 30.05, KEEP.psi0, KEEP.psi1, 48); for (let i = 0; i + 1 < pts.length; i++) S.line([pts[i], pts[i + 1]], { tone: "lo", n: [0, 0, 1], bias: 0.2 }); }
for (const psi of [KEEP.psi0, KEEP.psi1]) for (let R = 10.3; R < 82; R += 4.5) for (const z of [25.6, 28.4]) {
  const n = psi === KEEP.psi0 ? [1, 0, 0] : [0, 1, 0];
  S.dotAt([R * Math.cos(psi), R * Math.sin(psi), z], { n, size: 1.25, tone: "lo", bias: 3 });
}
// ferrietstaven (radiaal, onder de drager)
S.setPart("ferriet");
for (let i = 0; i < 8; i++) {
  const a = (22.5 + 45 * i) * Math.PI / 180;
  if (a < KEEP.psi0 + 0.15 || a > KEEP.psi1 - 0.15) continue;
  const c = [Math.cos(a), Math.sin(a)], t = [-Math.sin(a), Math.cos(a)];
  const p = (s, w, z) => [c[0] * s + t[0] * w, c[1] * s + t[1] * w, z];
  const sides = [[(u, v) => p(14 + 66 * u, 5, 14 + 5 * v), t], [(u, v) => p(14 + 66 * u, -5, 14 + 5 * v), [-t[0], -t[1], 0]], [(u, v) => p(80, -5 + 10 * u, 14 + 5 * v), [c[0], c[1], 0]], [(u, v) => p(14 + 66 * u, -5 + 10 * v, 19), [0, 0, 1]]];
  for (const [fn, nn] of sides) S.patch(fn, 7, 1, { cls: "f", toward: () => [nn[0], nn[1], nn[2] || 0] });
}
// steuntjes onder de drager
S.setPart("drager");
for (const a of [2.2, 3.4, 4.6, 5.8]) { const x = 70 * Math.cos(a), y = 70 * Math.sin(a); box([x - 4, x + 4], [y - 4, y + 4], [3, 19], "d", "drager", 8); }

// ------------------------------------------------------------ elektronica in de hoek (in het open kwart)
box([108, 160], [18, 125], [3, 5], "pcb", "elektronica", 12);
S.setPart("elektronica");
const caps = [];
for (const [x, y, r, h] of [[124, 40, 9, 30], [146, 40, 7, 24], [128, 98, 6, 18]]) caps.push({ x, y, r, h });
for (const c of caps) S.raw(k.solidSvg(k.cylinder(c.x, c.y, c.r, 5, c.h, P, 28, 0.5), { tone: "hi", className: "cap" }) + k.lineSvg(k.sideArc(c.x, c.y, c.r, 5 + c.h - 4, P, 20), { tone: "lo" }), S.depth([c.x, c.y, 18]));
// koelprofiel met vinnen
for (let i = 0; i < 6; i++) box([136 + i * 3.4, 137.4 + i * 3.4], [64, 92], [5, 26], "hs", "elektronica", 8);
box([134, 156], [64, 92], [5, 9], "hs", "elektronica", 8);
// draadjes van de print naar de spoel
const lead = G.fillet([[110, 30, 6], [96, 30, 6], [80, 18, 27]], 6, 6);
for (const pc of tubePieces(lead, 1.4, P, { maxLength: 12 })) S.raw(`<g class="lead">${tubeSvg(pc, { tone: "hi" })}</g>`, G.dot3(pc.mid, S.V) + 1);

// ------------------------------------------------------------ pan en water
const PAN = [[44, 0], [44, 84], [46, 85.6], [113, 85.6], [113, 83.6], [49, 83.6], [49, 0]];
const WATER_Z = 96;
S.setPart("pan"); halfBody(S, F, PAN, { cls: "pn", cut: "xp", ...KEEP, steps: 44, crease: 0.6 });
// waterdoorsnede en wateroppervlak (half doorzichtig, zodat je de bodem ziet)
S.setPart("water");
halfBody(S, F, [[49, 0], [49, 83.6], [WATER_Z, 83.6], [WATER_Z, 0]], { shells: false, cut: "xw", ...KEEP });
const surf = [];
{
  const pts = arc(83.4, WATER_Z, KEEP.psi0, KEEP.psi1, 72).map((p) => k.iso(p, P));
  const c = k.iso([0, 0, WATER_Z], P);
  surf.push(`M${r1(c[0])} ${r1(c[1])}L` + pts.map(([x, y]) => r1(x) + " " + r1(y)).join("L") + "Z");
}
S.raw(`<path class="watertop" data-part="watertop" d="${surf[0]}"/>`, S.depth([0, 0, WATER_Z]) + 80);
// steel van de pan
{
  const a = 0.78 * Math.PI, c = [Math.cos(a), Math.sin(a)];
  const route = [[c[0] * 84, c[1] * 84, 100], [c[0] * 110, c[1] * 110, 102], [c[0] * 190, c[1] * 190, 112]];
  S.setPart("pan");
  for (const pc of tubePieces(G.fillet(route, 20, 6), 5.5, P, { maxLength: 20 })) S.raw(`<g class="handle">${tubeSvg(pc, { tone: "hi" })}</g>`, G.dot3(pc.mid, S.V) - 2);
}

const machine = S.render();
const svg = `<svg class="iso-svg base" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Inductiekookplaat</title><desc id="d">Een inductiekookplaat met een pan water, met een kwart weggezaagd. Onder de glazen plaat ligt een platte spiraal van koperdraad op een drager met ferrietstaven. Een wisselstroom in de spoel maakt een wisselend magnetisch veld dat door de stalen panbodem loopt en daar wervelstromen opwekt; die warmen de bodem en het water op.</desc>
<defs><marker id="arrE" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 1L9 5L0 9z" fill="#c9822c"/></marker></defs>
<g class="fig"><g class="s">${machine}</g></g></svg>
<svg class="iso-svg overlay" viewBox="0 0 ${W} ${H}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g class="fig ov">
<g data-part="field" class="fieldL" data-p="spoel"></g>
<g data-part="eddy" class="eddy" data-p="pan"></g>
<g data-part="bubbles" class="bubbles" data-p="water"></g>
<g data-part="steam" class="steam" data-p="water"></g>
<g data-part="display" data-p="glas"></g>
</g></svg>`;

const DATA = { P, KEEP, WATER_Z, GLASS_TOP };
const side = `
      <div class="action-row">
        <button class="btn-accent" id="run">Kookplaat aan</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Kookplaat uit</span></div>
        <div class="ctl"><div class="row"><span>Stand</span><b id="vL">6</b></div><input type="range" id="level" min="1" max="9" step="1" value="6" aria-label="Kookstand"></div>
        <div class="row"><span>Pan van</span></div>
        <div class="toggles" id="mat"><button data-m="staal">staal</button><button data-m="koper">koper</button><button data-m="glas">glas</button></div>
        <div class="row"><span>Frequentie in de spoel</span><b id="rF">–</b></div>
        <div class="row"><span>Vermogen naar de pan</span><b id="rP">–</b></div>
        <div class="row"><span>Temperatuur water</span><b id="rT">20 °C</b></div>
        <div class="row"><span>Kooktijd (echt)</span><b id="rt">0:00</b></div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps">
          <li><span>Door de platte spoel loopt een wisselstroom van zo'n 24 000 Hz. Die maakt een snel wisselend magnetisch veld.</span></li>
          <li><span>De ferrietstaven sturen het veld omhoog, door het glas, in de panbodem.</span></li>
          <li><span>De veranderende flux wekt in de metalen bodem kringstromen op: wervelstromen.</span></li>
          <li><span>Die stromen warmen de bodem op (P = I²·R). Het glas zelf wordt niet opgewarmd door het veld, alleen door de hete pan.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;
const legend = `
        <span><i class="bar" style="background:#1f7f86"></i>magnetisch veld (wisselt)</span>
        <span><i class="bar" style="background:#c9822c"></i>wervelstromen in de bodem</span>
        <span><i class="bar" style="background:#b8733a"></i>koperspoel</span>
        <span><i class="bar" style="background:#3f4650"></i>ferriet</span>`;
const css = `
  .s path{stroke-width:.45;stroke-linejoin:round}
  .h0{fill:#c9ccd0;stroke:#c9ccd0}.h1{fill:#d5d8db;stroke:#d5d8db}.h2{fill:#e0e2e4;stroke:#e0e2e4}.h3{fill:#eaebed;stroke:#eaebed}.ht{fill:#f1f2f3;stroke:#f1f2f3}
  .g0,.g1,.g2,.g3{fill:#2e333b;stroke:#2e333b;stroke-width:1.1 !important}.gt{fill:#3a4049;stroke:#3a4049;stroke-width:1.1 !important}
  .d0,.d1,.d2,.d3,.dt{fill:#6b7280;stroke:#6b7280}.dt{fill:#7c8390;stroke:#7c8390}
  .cu0{fill:#b8733a;stroke:#b8733a}.cu1{fill:#c4834b;stroke:#c4834b}.cu2,.cu3{fill:#cf8f59;stroke:#cf8f59}.cut{fill:#d99a68;stroke:#d99a68}
  .f0,.f1,.f2,.f3,.ft{fill:#3f4650;stroke:#3f4650}.ft{fill:#4d5560;stroke:#4d5560}
  .pcb0,.pcb1,.pcb2,.pcb3,.pcbt{fill:#3f7d55;stroke:#3f7d55}
  .hs0,.hs1{fill:#b3bac2;stroke:#b3bac2}.hs2,.hs3,.hst{fill:#d3d8dd;stroke:#d3d8dd}
  .cap>.iso-top{fill:#5b6573}.cap>.iso-shade{fill:#3e5a8a}
  .lead .tb-body{fill:#b8733a}.lead .tb-shine{fill:#d99a68}.lead .tb-shade{fill:#8a4f22}
  .handle .tb-body{fill:#2f343b}.handle .tb-shine{fill:#59616b}.handle .tb-shade{fill:#1d2128}
  .pn0{fill:var(--pan0);stroke:var(--pan0)}.pn1{fill:var(--pan1);stroke:var(--pan1)}.pn2{fill:var(--pan2);stroke:var(--pan2)}.pn3{fill:var(--pan3);stroke:var(--pan3)}.pnt{fill:var(--pan3);stroke:var(--pan3)}
  .fig{--pan0:#9aa2ab;--pan1:#b0b7be;--pan2:#c6ccd2;--pan3:#dbe0e4;--pancut:#a9b0b8;--water:#9cc3e6}
  .fig[data-mat="koper"]{--pan0:#b06a35;--pan1:#c27a42;--pan2:#d08c55;--pan3:#dca06c;--pancut:#c9824a}
  .fig[data-mat="glas"]{--pan0:#c9dde3;--pan1:#d6e6ea;--pan2:#e2eef1;--pan3:#eef6f7;--pancut:#d9e9ee}
  .xp{fill:var(--panhot,var(--pancut));stroke:var(--panhot,var(--pancut))}
  .xw{fill:var(--water);stroke:var(--water)}
  .xc{fill:#d08a4c;stroke:#d08a4c}.xd{fill:#7c8390;stroke:#7c8390}
  .watertop{fill:var(--water);opacity:.55;stroke:none}
  .lh,.lm,.ll,.lf{fill:none;stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .lh{stroke:var(--anatomy-hi)}.lm{stroke:var(--anatomy-mid)}.ll{stroke:var(--anatomy-lo)}.lf{stroke:#7f8794}
  .dt{fill:var(--anatomy-dot);opacity:.5}.dt[data-tone="lo"]{fill:#7a4319;opacity:.75}
  .fieldL path{fill:none;stroke:#1f7f86;stroke-width:1.5;stroke-dasharray:4 5;vector-effect:non-scaling-stroke}
  .eddy path{fill:none;stroke:#c9822c;stroke-width:1.6;stroke-dasharray:5 6;vector-effect:non-scaling-stroke}
  .eddy circle{fill:#fffdf7;stroke:#c9822c;stroke-width:1}
  .bubbles circle{fill:#fffdf7;stroke:#5b8fbf;stroke-width:.7;fill-opacity:.85}
  .steam path{fill:none;stroke:#b9c3cc;stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke}
  .disp{fill:#ff6b4a !important;font-weight:600}
`;
const PARTS = [
  { id: "spoel", name: "Platte spoel", text: "Een spiraal van gevlochten koperdraad (litzedraad), plat onder de glasplaat. Er loopt een wisselstroom van ongeveer 24 kHz door: veel sneller dan de 50 Hz van het stopcontact.", fact: "litzedraad: veel dunne draadjes tegen het skineffect" },
  { id: "ferriet", name: "Ferrietstaven", text: "Staafjes van ferriet onder de spoel. Ferriet is magnetisch maar geleidt nauwelijks: het leidt het veld naar boven, naar de pan, en schermt de elektronica eronder af, zonder zelf warm te worden door wervelstromen.", fact: "" },
  { id: "glas", name: "Glaskeramische plaat", text: "De plaat is geen geleider: het magnetische veld gaat er ongehinderd doorheen zonder ze op te warmen. Ze wordt alleen warm doordat de hete pan erop staat.", fact: "" },
  { id: "pan", name: "Pan", text: "De bodem van de pan is de 'secundaire spoel': de wisselende flux wekt er wervelstromen in op. Een stalen bodem is ideaal: het veld dringt er maar een dun laagje in door en dat laagje heeft een grote weerstand, dus veel warmte. In koper ontstaan wel stromen, maar met heel weinig weerstand, dus weinig warmte. In glas ontstaan helemaal geen stromen.", fact: "P = I² · R" },
  { id: "water", name: "Water", text: "Het water wordt van onderuit opgewarmd door de hete bodem. Vanaf 100 °C kookt het en ontstaan er dampbellen.", fact: "1 L water van 20 naar 100 °C: Q = m·c·ΔT = 335 kJ" },
];
const page = pageHtml({
  title: "Inductiekookplaat", h1: "Inductiekookplaat", hue: 150, icon: "kookplaat", W, H, svg, legend, side, css,
  corners: { tl: "kwart weggezaagd", bl: "veld vertraagd · tijd 20× versneld", br: "uit" },
  script: `${kitScript()}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
