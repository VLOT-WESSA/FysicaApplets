// Bouwt ../../zekering.dc.html: een opengewerkte automatische zekering (naar de klassieke schoolfiguur), met een stekkerdoos.
//   node tools/zekering/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";
import { painter } from "../shared/painter.mjs";
import { pageHtml, kitScript, moduleScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";
import * as PT from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "zekering.dc.html");
const W = 900, H = 620;
const MX = -150, MZ = 130;                                // plaats van de zekering op het paneel
const TABLE = { x: [-260, 330], y: [-60, 230] };
const P = k.fitProjection([[TABLE.x[0], TABLE.y[0], -14], [TABLE.x[1], TABLE.y[0], -14], [TABLE.x[0], TABLE.y[1], -14], [TABLE.x[1], TABLE.y[1], -14], [TABLE.x[0], -46, 520], [TABLE.x[1], -46, 520]], W, H, { pad: 14, azimuth: 70, elevation: 20 });
const S0 = painter(P), S = painter(P);
const w3 = ([x, z], y) => [x + MX, y, z + MZ];

function prism(Sx, poly, y0, y1, cls, { front = cls, bias = 0 } = {}) {
  let area = 0; for (let i = 0; i < poly.length; i++) { const [a, b] = poly[i], [c, d] = poly[(i + 1) % poly.length]; area += a * d - c * b; }
  const sg = area > 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const n = [sg * (q[1] - p[1]) / len, 0, -sg * (q[0] - p[0]) / len];
    Sx.patch((u, v) => w3([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u], y0 + (y1 - y0) * v), Math.max(1, Math.round(len / 14)), 1, { cls, toward: () => n, bias });
  }
  const f = poly.map((p) => w3(p, y1));
  Sx.poly(f, { cls: front + "!", n: [0, 1, 0], lines: f.map((a, i) => [[a, f[(i + 1) % f.length]], "hi"]), bias: bias + 0.5 });
}
const rect = ([x0, x1], [z0, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// ------------------------------------------------------------ tafel en paneel
const back = [];
{
  const ring = [[TABLE.x[0], TABLE.y[0]], [TABLE.x[1], TABLE.y[0]], [TABLE.x[1], TABLE.y[1]], [TABLE.x[0], TABLE.y[1]]];
  back.push(`<path class="iso-halo" d="${k.pathOf(ring.map(([x, y]) => k.iso([x, y, -14], P)), true)}"/>`);
  back.push(k.solidSvg(k.extrude(ring, -14, 14, P, { bevel: 1.2 }), { tone: "hi", className: "wood" }));
}
S0.setPart("paneel");
const box = (Sx, x, y, z, cls) => {
  Sx.patch((u, v) => [x[1], y[0] + (y[1] - y[0]) * u, z[0] + (z[1] - z[0]) * v], 1, 1, { cls, toward: () => [1, 0, 0] });
  Sx.patch((u, v) => [x[0] + (x[1] - x[0]) * u, y[1], z[0] + (z[1] - z[0]) * v], 1, 1, { cls, toward: () => [0, 1, 0] });
  Sx.patch((u, v) => [x[0] + (x[1] - x[0]) * u, y[0] + (y[1] - y[0]) * v, z[1]], 1, 1, { cls, toward: () => [0, 0, 1] });
};
box(S0, [TABLE.x[0] + 10, TABLE.x[1] - 10], [-60, -40], [0, 520], "pw");
for (const [x, z] of [[TABLE.x[0] + 30, 30], [TABLE.x[1] - 30, 30], [TABLE.x[0] + 30, 490], [TABLE.x[1] - 30, 490]]) S0.dotAt([x, -39.9, z], { n: [0, 1, 0], size: 1, tone: "hi" });

// ------------------------------------------------------------ zekering: huis
S.setPart("huis");
prism(S, PT.HOUSING, PT.Y.back, PT.Y.wall, "hb");
{
  const Hh = PT.HOUSING, inset = 5;
  for (let i = 0; i < Hh.length; i++) {
    const p = Hh[i], q = Hh[(i + 1) % Hh.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nIn = [-(q[1] - p[1]) / len, (q[0] - p[0]) / len];
    prism(S, [p, q, [q[0] + nIn[0] * inset, q[1] + nIn[1] * inset], [p[0] + nIn[0] * inset, p[1] + nIn[1] * inset]], PT.Y.wall, PT.Y.cut, "hw", { front: "hc" });
  }
}
for (const [x, z] of [[100, 20], [100, 340], [295, 20], [295, 340]]) S.dotAt(w3([x, z], PT.Y.wall + 0.2), { n: [0, 1, 0], size: 1.3, tone: "hi", bias: 1 });
// aansluitklemmen rechts, met schroefgleuf
S.setPart("klemmen");
for (const t of [PT.TERM_TOP, PT.TERM_BOT]) {
  prism(S, rect(t.x, t.z), -30, -6, "br");
  prism(S, rect([t.x[0] + 10, t.x[1] - 4], [t.z[0] + 12, t.z[1] - 12]), -6, -5, "dk");
}
// vaste contactstrip met zilveren contactplaatje
S.setPart("contact");
prism(S, PT.FIXED, -24, -12, "br");
prism(S, rect([200, 214], [263, 266]), -24, -12, "ag2");
// spoel (s): verticale spoel met flenzen en windingen
S.setPart("spoel");
{
  const C = PT.COIL, cen = w3([C.cx, C.z0], -18);
  const F = G.frameOf([cen[0], cen[1], cen[2]], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const coil = k.solidSvg(G.disc(0, C.z1 - C.z0, C.r, F, P), { tone: "hi", className: "copper" });
  const fl = (s0) => k.solidSvg(G.disc(s0, s0 + 5, C.r + 5, F, P), { tone: "mid", className: "bob" });
  const wind = k.lineSvg(Array.from({ length: 22 }, (_, i) => G.arcOf(F, 6 + (C.z1 - C.z0 - 12) * i / 21, C.r + 0.2, P)).join(""), { tone: "lo", className: "wind" });
  S.raw(fl(-5) + coil + wind + fl(C.z1 - C.z0), S.depth(w3([C.cx, (C.z0 + C.z1) / 2], -18)) + 60);
}
// ------------------------------------------------------------ snoeren en stekkerdoos
const cableR = 3;
const cab = (pts, cls, part) => { S.setPart(part); const route = G.fillet(pts, 36, 12); for (const pc of tubePieces(route, cableR, P, { maxLength: 20 })) S.raw(`<g class="cable ${cls}">${tubeSvg(pc, { tone: "hi" })}</g>`, G.dot3(pc.mid, S.V) + 2); return route; };
const tTop = w3([368, 270], -18), tBot = w3([368, 54], -18);
cab([tTop, [tTop[0] + 60, tTop[1], tTop[2]], [tTop[0] + 90, tTop[1], tTop[2] + 30], [tTop[0] + 90, tTop[1], 470]], "brown", "snoeren");
const STRIP = { x: [90, 320], y: [120, 166], z: [0, 22] };
cab([tBot, [tBot[0] + 50, tBot[1], tBot[2] - 6], [tBot[0] + 80, tBot[1] + 30, 3], [STRIP.x[0] + 40, STRIP.y[0] - 50, 3], [STRIP.x[0] + 30, STRIP.y[0] - 6, 6], [STRIP.x[0] + 30, STRIP.y[0] + 1, 11]], "grey", "snoeren");
S.setPart("stekkerdoos");
box(S, STRIP.x, STRIP.y, STRIP.z, "sd");
const SOCK = [140, 190, 240, 290];
for (const x of SOCK) {
  const pts = Array.from({ length: 25 }, (_, i) => [x + 17 * Math.cos(i / 24 * 2 * Math.PI), 143 + 17 * Math.sin(i / 24 * 2 * Math.PI), 22.05]);
  for (let i = 0; i < 24; i++) S.line([pts[i], pts[i + 1]], { tone: "mid", n: [0, 0, 1] });
  S.dotAt([x - 6, 143, 22.1], { size: 1.8, tone: "hi", n: [0, 0, 1] }); S.dotAt([x + 6, 143, 22.1], { size: 1.8, tone: "hi", n: [0, 0, 1] });
}
const plugSvg = SOCK.map((x, i) => {
  const route = G.fillet([[x, 143, 42], [x, 143, 54], [x, 185, 54], [x + 6, 228, 3]], 10, 8);
  const c = tubePieces(route, 2.6, P, { maxLength: 400 }).map((pc) => `<g class="cable white">${tubeSvg(pc, { tone: "hi" })}</g>`).join("");
  return `<g data-part="plug${i}" opacity="0">${k.solidSvg(k.cylinder(x, 143, 15, 22, 20, P, 32, 0.6), { tone: "hi", className: "plug" })}${c}</g>`;
});
S.raw(plugSvg.join(""), S.depth([200, 143, 30]) + 400);

const fig = `<g data-p="tafel">${back.join("")}</g><g class="s">${S0.render()}</g><g class="s">${S.render()}</g>
<g data-part="moving" class="s"></g>
<path data-part="pathI" class="flowI" d=""/>
<g data-part="arc" class="arc"></g>`;
const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Automatische zekering</title><desc id="d">Een opengewerkte automatische zekering op een paneel. Links steekt de knop uit het huis, rechts zitten de aansluitklemmen. Binnenin: de contactarm met een openveer, een scharnierstangetje naar de knop, een spoel met eronder een ijzeren anker op een vergrendelhefboom met een terugtrekveer. Een snoer gaat naar een stekkerdoos op tafel.</desc>
<defs><radialGradient id="arcGrad"><stop offset="0" stop-color="#fffbe6"/><stop offset=".3" stop-color="#ffd24a" stop-opacity=".9"/><stop offset="1" stop-color="#ff8a1e" stop-opacity="0"/></radialGradient>
<marker id="arrM" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1f7f86"/></marker></defs>
<g class="fig">${fig}</g></svg>`;

const DATA = { P, MX, MZ };
const side = `
      <div class="action-row">
        <button class="btn-accent" id="lever">Knop indrukken (inschakelen)</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Uitgeschakeld</span></div>
        <div class="row"><span>Uitvoering</span></div>
        <div class="toggles" id="type"><button data-t="veer">spoel + veer</button><button data-t="thermisch">spoel + veer + bimetaal</button></div>
        <div class="ctl" id="springCtl"><div class="row"><span>Veerspanning: anker wordt aangetrokken boven</span><b id="vTrip">20 A</b></div><input type="range" id="itrip" min="16" max="40" step="1" value="20" aria-label="Uitschakelstroom in ampère"></div>
        <div class="row"><span>Toestellen op de stekkerdoos</span></div>
        <div class="toggles" id="loads"></div>
        <button class="btn-secondary" id="short" style="min-height:38px;border-color:#b8311f;color:#b8311f;font-weight:600">Kortsluiting maken</button>
        <div class="row"><span>Stroom I</span><b id="rI">–</b></div>
        <div class="row"><span id="rBl">Kracht van de spoel op het anker</span><b id="rB">–</b></div>
        <div class="row"><span>Uitschakelen</span><b id="rT">–</b></div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps" id="steps">
          <li><span>Je drukt de knop (k) in. Via het stangetje duwt hij de contactarm tegen het vaste contact; de hefboom vergrendelt het stangetje. De openveer staat gespannen.</span></li>
          <li><span>De stroom loopt van de bovenste klem over de contacten, door de spoel (s) naar de onderste klem en zo naar de toestellen.</span></li>
          <li><span>De spoel is een elektromagneet: ze trekt aan het ijzeren anker (p). De terugtrekveer houdt de hefboom tegen. Bij een te grote stroom wint de magneet: het anker schiet omhoog en de hefboom kantelt.</span></li>
          <li><span>De vergrendeling laat los: de openveer trekt de contactarm weg, de stroom is onderbroken en de knop springt naar buiten.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;
const legend = `
        <span><i class="bar" style="background:#e0a020"></i>stroom</span>
        <span><i class="bar" style="background:#1f7f86"></i>magnetisch veld van de spoel</span>
        <span><i class="bar" style="background:#b8733a"></i>spoel (s)</span>
        <span><i class="bar" style="background:#5b6573"></i>ijzeren anker (p)</span>
        <span><i class="bar" style="background:#ff9a2a"></i>vonk</span>`;
const css = `
  .s path{stroke-width:.45;stroke-linejoin:round}
  .pw0,.pw1,.pw2,.pw3,.pwt{fill:#e9d7b6;stroke:#e9d7b6}.pw2,.pw3{fill:#efdfc2;stroke:#efdfc2}.pwt{fill:#f3e6cf;stroke:#f3e6cf}
  .hb{fill:#eeebe3;stroke:#eeebe3}.hw0,.hw1{fill:#d8d3c6;stroke:#d8d3c6}.hw2,.hw3,.hwt{fill:#efebe2;stroke:#efebe2}.hc{fill:#c7c0b0;stroke:#c7c0b0}
  .br0,.br1{fill:#c9ab5c;stroke:#c9ab5c}.br2,.br3,.brt{fill:#dcc27c;stroke:#dcc27c}.br{fill:#e6cf8e;stroke:#e6cf8e}
  .dk0,.dk1,.dk2,.dk3,.dkt,.dk{fill:#8a7440;stroke:#8a7440}
  .ag20,.ag21,.ag22,.ag23,.ag2t,.ag2{fill:#e6e8ea;stroke:#e6e8ea}
  .copper>.iso-top{fill:#e0a575}.copper>.iso-shade{fill:#cf8f59}.copper>.iso-shade[data-shade="0"]{fill:#b8733a}.copper>.iso-shade[data-shade="1"]{fill:#c4834b}
  .bob>.iso-top{fill:#f3f1ea}.bob>.iso-shade{fill:#d9d5ca}
  .wind{stroke:#8a4f22 !important;stroke-width:.8 !important}
  .ar0,.ar1,.ar2,.ar3,.art{fill:#3a414a;stroke:#3a414a}.ar{fill:#4d5560;stroke:#4d5560}
  .kn0,.kn1,.kn2,.kn3,.knt{fill:#b9bfc6;stroke:#b9bfc6}.kn{fill:#d0d5da;stroke:#d0d5da}
  .lk0,.lk1,.lk2,.lk3,.lkt{fill:#d8d3c6;stroke:#d8d3c6}.lk{fill:#fbf8f1;stroke:#fbf8f1}
  .fe0,.fe1,.fe2,.fe3,.fet{fill:#3f4650;stroke:#3f4650}.fe{fill:#5b6573;stroke:#5b6573}
  .bm0,.bm1,.bm2,.bm3,.bmt{fill:var(--bm-side);stroke:var(--bm-side)}.bm{fill:var(--bm);stroke:var(--bm)}
  .sd0,.sd1{fill:#d6d9dc;stroke:#d6d9dc}.sd2,.sd3{fill:#e6e8ea;stroke:#e6e8ea}.sdt{fill:#f3f4f5;stroke:#f3f4f5}
  .lh,.lm,.ll,.lf{fill:none;stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .lh{stroke:var(--anatomy-hi)}.lm{stroke:var(--anatomy-mid)}.ll{stroke:var(--anatomy-lo)}.lf{stroke:var(--anatomy-faint)}
  .dt{fill:var(--anatomy-dot);opacity:.6}.dt[data-tone="hi"]{opacity:.85}
  .wood>.iso-top{fill:#f3e6cf}.wood>.iso-shade{fill:#e2cda9}
  .plug>.iso-top{fill:#fafafa}.plug>.iso-shade{fill:#e1e3e5}
  .cable .tb-body{fill:#7b8692}.cable .tb-shine{fill:#a7b0ba}.cable .tb-shade{fill:#5d6772}
  .cable.brown .tb-body{fill:#8a5a3a}.cable.brown .tb-shine{fill:#b07e5c}.cable.brown .tb-shade{fill:#6a4228}
  .cable.white .tb-body{fill:#e3e5e7}.cable.white .tb-shine{fill:#fafafa}.cable.white .tb-shade{fill:#c7cbcf}
  .flowI{fill:none;stroke:#f2b631;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 7;opacity:0;vector-effect:non-scaling-stroke}
  .arc circle{fill:url(#arcGrad);mix-blend-mode:multiply}
  .s path.spring{fill:none;stroke:#1d2a3a;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
  .s path.lead{fill:none;stroke:#b8733a;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1.6 0.9;vector-effect:non-scaling-stroke}
  .s path.wire{fill:none;stroke:#2a3442;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .s path.bfield{fill:none;stroke:#1f7f86;stroke-width:1.4;stroke-dasharray:4 3;vector-effect:non-scaling-stroke}
  .tagk{font-family:var(--font-mono);font-size:13px;font-weight:600;fill:#1d2a3a;paint-order:stroke;stroke:#fbf8f1;stroke-width:3px}
  .fig{--bm:#c9ced4;--bm-side:#aeb5bd}
`;
const PARTS = [
  { id: "knop", name: "k · knop", text: "Met de knop schakel je de zekering in. Een stangetje duwt de contactarm tegen het vaste contact en spant zo de openveer. Na het uitschakelen steekt de knop naar buiten: zo zie je welke zekering 'gesprongen' is.", fact: "" },
  { id: "contact", name: "Contacten en contactarm", text: "Een vast contact (aan de bovenste klem) en een beweegbare contactarm. Zolang ze tegen elkaar drukken, is de kring gesloten.", fact: "" },
  { id: "veren", name: "Openveer en terugtrekveer", text: "De openveer (linksboven) trekt de contactarm altijd naar de open stand: hij wacht alleen tot de vergrendeling loslaat. De terugtrekveer (linksonder) houdt de hefboom in de vergrendelde stand, tegen de kracht van de spoel in. Hoe sterker die veer, hoe groter de stroom moet zijn om uit te schakelen.", fact: "veerkracht F = k · u" },
  { id: "spoel", name: "s · spoel", text: "Alle stroom van de kring loopt door deze spoel. Ze werkt als een elektromagneet: hoe groter de stroom, hoe sterker ze het ijzeren anker aantrekt.", fact: "magnetische kracht groeit met I²" },
  { id: "anker", name: "p · anker en hefboom", text: "Het ijzeren anker (p) zit op de voet van de vergrendelhefboom, net onder de spoel. Wordt de magneetkracht groter dan de kracht van de terugtrekveer, dan wordt het anker omhoog getrokken, kantelt de hefboom en laat het stangetje van de knop los.", fact: "" },
  { id: "bimetaal", name: "Bimetaal (optie)", text: "In de uitvoering met bimetaal loopt de stroom ook door een strip van twee metalen die verschillend uitzetten. Bij een kleine, aanhoudende overbelasting wordt de strip warm, buigt hij door en duwt hij na een tijdje de hefboom om, ook al is de spoel nog niet sterk genoeg.", fact: "traag bij kleine overbelasting, de spoel meteen bij kortsluiting" },
  { id: "stekkerdoos", name: "Stekkerdoos", text: "Alle toestellen op één kring tellen samen: de stromen tellen op. Een waterkoker van 2000 W trekt alleen al I = P / U = 2000 W / 230 V ≈ 8,7 A.", fact: "I = P / U" },
];
const page = pageHtml({
  title: "Automatische zekering", h1: "Automatische zekering", hue: 150, icon: "zekering", W, H, svg, legend, side, css,
  corners: { tl: "opengewerkt · (k) knop · (s) spoel · (p) anker", bl: "klik op een onderdeel voor uitleg", br: "uit" },
  script: `${kitScript()}\n${moduleScript("painter.mjs", "PA", "const k = { iso, cameraOf };")}\n${moduleScript("lathe.mjs", "G")}\n${readFileSync(join(HERE, "parts.mjs"), "utf8").replace(/^export /gm, "")}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\nconst prismSrc = ${prism.toString()};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
