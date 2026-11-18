// Bouwt ../../transformator.dc.html: een demonstratietransformator op een plankje.
//   node tools/transformator/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";
import { pageHtml, kitScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "transformator.dc.html");
const W = 880, H = 560;
const BOARD = { x: -215, y: -85, w: 430, d: 185, r: 6 };
const P = k.fitProjection([...k.boxCorners(BOARD, -16, 0), [-80, 0, 132], [80, 0, 132], [-170, 0, 70]], W, H, { pad: 18, azimuth: 40, elevation: 30 });
const S = (p, st) => k.solidSvg(p, st), Ln = (d, st) => k.lineSvg(d, st), at = (p) => k.iso(p, P);
const r1 = (v) => Math.round(v * 10) / 10;

const CZ = 10;                                           // onderkant van de kern
const LEG = 24, CW = 160, CH = 120, DY = 12;             // kern: benen 24 breed, buiten 160 × 120, dikte 24
const LEGX = [-CW / 2 + LEG / 2, CW / 2 - LEG / 2];
const COIL = { z0: CZ + 32, z1: CZ + CH - 30, pad: 7 };
const groups = [];
const put = (p, svg) => groups.push(`<g data-p="${p}">${svg}</g>`);

// ------------------------------------------------------------ plankje
{
  const o = [`<path class="iso-halo" d="${k.haloOf(BOARD, -16, 16, P)}"/>`];
  for (const [x, y] of k.corners(BOARD, 16)) o.push(S(k.cylinder(x, y, 7, -16, 4, P, 24), { tone: "mid" }));
  o.push(S(k.slabOf(BOARD, -12, 12, P, 8, 1.4), { tone: "hi", className: "wood" }));
  o.push(Ln(k.planOutline(k.insetPlan(BOARD, 5), 0, P), { tone: "lo" }));
  for (const y of [-60, -25, 15, 55, 85]) o.push(Ln(k.lineOnTop([BOARD.x + 5, y], [BOARD.x + BOARD.w - 5, y + 2], 0, P), { tone: "faint" }));
  const sc = k.corners(BOARD, 9); o.push(k.dotsSvg(sc.map(([x, y]) => at([x, y, 0])), { size: 0.55, tone: "hi" }));
  put("plankje", o.join(""));
}

// ------------------------------------------------------------ voeding
const PSU = { x: -205, y: -40, w: 62, d: 70, r: 3 }, PSU_H = 62;
{
  const o = [S(k.slabOf(PSU, 0, PSU_H, P, 3, 0.8), { tone: "hi", className: "psu" })];
  o.push(Ln(k.sideSeam(PSU, PSU_H - 6, P, 3), { tone: "lo" }));
  // voorkant (+x): schermpje en twee bussen
  const fx = PSU.x + PSU.w + 0.1;
  const M = (() => { const o0 = at([fx, PSU.y + PSU.d, PSU_H]), ex = at([fx, PSU.y + PSU.d - 1, PSU_H]), ey = at([fx, PSU.y + PSU.d, PSU_H - 1]); return [ex[0] - o0[0], ex[1] - o0[1], ey[0] - o0[0], ey[1] - o0[1], o0[0], o0[1]]; })();
  o.push(`<g transform="matrix(${M.map((v) => v.toFixed(4)).join(" ")})"><rect x="8" y="10" width="38" height="16" rx="1" class="bezel"/><rect x="9.4" y="11.4" width="35.2" height="13.2" class="lcd"/><text data-part="psuText" x="27" y="21" text-anchor="middle" class="lcdtext">12,0 V ~</text><circle cx="56" cy="18" r="6" class="knob"/><path d="M56 18L56 13" class="knobmark"/><circle cx="18" cy="44" r="3.2" class="jack"/><circle cx="36" cy="44" r="3.2" class="jack red"/></g>`);
  put("voeding", o.join(""));
}

// ------------------------------------------------------------ kern (gelamelleerd weekijzer)
const coreParts = {
  bottom: { x: -CW / 2, y: -DY, w: CW, d: 2 * DY, r: 0.6, z0: CZ, z1: CZ + LEG },
  top: { x: -CW / 2, y: -DY, w: CW, d: 2 * DY, r: 0.6, z0: CZ + CH - LEG, z1: CZ + CH },
  left: { x: -CW / 2, y: -DY, w: LEG, d: 2 * DY, r: 0.6, z0: CZ + LEG, z1: CZ + CH - LEG },
  right: { x: CW / 2 - LEG, y: -DY, w: LEG, d: 2 * DY, r: 0.6, z0: CZ + LEG, z1: CZ + CH - LEG },
};
const slab = (c, cls) => S(k.slabOf(c, c.z0, c.z1 - c.z0, P, 2, 0.4), { tone: "mid", className: cls });
const laminations = (c, z) => { let d = ""; for (let y = -DY + 2; y < DY; y += 2) d += k.lineOnTop([c.x + 0.6, y], [c.x + c.w - 0.6, y], z, P); return Ln(d, { tone: "lo", className: "lam" }); };
const sideLam = (c) => { let d = ""; for (let y = -DY + 2; y < DY; y += 2) d += k.pathOf([at([c.x + c.w + 0.05, y, c.z0 + 0.6]), at([c.x + c.w + 0.05, y, c.z1 - 0.6])]); return Ln(d, { tone: "lo", className: "lam" }); };
// voetjes onder de kern
put("kern", S(k.slabOf({ x: -CW / 2 + 6, y: -DY - 8, w: 18, d: 2 * DY + 16, r: 2 }, 0, CZ, P, 3, 0.5), { tone: "mid", className: "wood2" }) + S(k.slabOf({ x: CW / 2 - 24, y: -DY - 8, w: 18, d: 2 * DY + 16, r: 2 }, 0, CZ, P, 3, 0.5), { tone: "mid", className: "wood2" }));
put("kern", slab(coreParts.bottom, "iron") + sideLam(coreParts.bottom));
put("kern", slab(coreParts.left, "iron") + slab(coreParts.right, "iron") + sideLam(coreParts.right));
// flux in de kern: gesloten lus op de voorkant (y = +DY), achter de spoelen
const fluxLoop = (() => { const y = DY + 0.15, xs = [LEGX[0], LEGX[1]], z0 = CZ + LEG / 2, z1 = CZ + CH - LEG / 2; const pts = [[xs[0], y, z0], [xs[1], y, z0], [xs[1], y, z1], [xs[0], y, z1], [xs[0], y, z0]]; return k.pathOf(G.fillet(pts, 8, 6).map(at)); })();
put("kern", `<path class="flux" data-part="flux" d="${fluxLoop}"/>`);

// ------------------------------------------------------------ spoelen (op spoelvormen)
function coilSvg(cx, cls, part) {
  const plan = { x: cx - LEG / 2 - COIL.pad, y: -DY - COIL.pad, w: LEG + 2 * COIL.pad, d: 2 * DY + 2 * COIL.pad, r: 5 };
  const fl = k.insetPlan(plan, -3.5);
  const o = [S(k.slabOf(fl, COIL.z0 - 3, 3, P, 6, 0.4), { tone: "mid", className: "bobbin" })];
  o.push(S(k.slabOf(plan, COIL.z0, COIL.z1 - COIL.z0, P, 6), { tone: "hi", className: "copper" }));
  o.push(`<g data-part="wind-${part}"></g>`);
  o.push(S(k.slabOf(fl, COIL.z1, 3, P, 6, 0.4), { tone: "mid", className: "bobbin" }));
  // aansluitlipjes op de bovenflens
  o.splice(1, 0, ...[-8, 8].map((dx) => S(k.cylinder(cx + dx, plan.y + plan.d + 1.7, 1.9, COIL.z0, 4, P, 16), { tone: "hi", className: "brass" })));
  put(part, o.join(""));
  return plan;
}
const planL = coilSvg(LEGX[0], "copper", "primair");
const planR = coilSvg(LEGX[1], "copper", "secundair");
put("kern", slab(coreParts.top, "iron") + laminations(coreParts.top, CZ + CH) + sideLam(coreParts.top) + `<path class="flux" d="${k.pathOf([at([LEGX[0] + 8, DY + 0.15, CZ + CH - LEG / 2]), at([LEGX[1] - 8, DY + 0.15, CZ + CH - LEG / 2])])}"/>`);

// ------------------------------------------------------------ lamp
const LAMP = [175, 30], LZ = 46;
{
  const o = [S(k.cylinder(LAMP[0], LAMP[1], 16, 0, 5, P, 32, 0.6), { tone: "mid", className: "wood2" }), S(k.cylinder(LAMP[0], LAMP[1], 8, 5, 22, P, 28, 0.5), { tone: "hi", className: "bakelite" }),
    S(k.cylinder(LAMP[0], LAMP[1], 6, 27, 6, P, 24), { tone: "hi", className: "brass" })];
  const F = G.frameOf([LAMP[0], LAMP[1], 33], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  o.push(`<g data-part="bulb">` + S(G.solidOf([[0, 5], [3, 5.5, 1], [9, 11, 1], [15, 12, 1], [21, 9, 1], [25, 0]], F, P), { tone: "hi", className: "glass" }) + `</g>`);
  const fil = [[-3, 0, 44], [-1.5, 0, 47], [0, 0, 44], [1.5, 0, 47], [3, 0, 44]].map(([x, y, z]) => at([LAMP[0] + x, LAMP[1] + y, z]));
  o.push(`<path data-part="filament" class="filament" d="${k.pathOf(fil)}"/>`);
  const c = at([LAMP[0], LAMP[1], 45]);
  o.push(`<circle data-part="glow" class="glow" cx="${r1(c[0])}" cy="${r1(c[1])}" r="40" opacity="0"/>`);
  put("lamp", o.join(""));
}

// ------------------------------------------------------------ snoeren
const term = (plan, dx) => [plan.x + plan.w / 2 + dx, plan.y + plan.d + 1.7, COIL.z0 + 4];
const cable = (pts, cls, id) => {
  const route = G.fillet(pts, 8, 7);
  return `<g class="cable ${cls}">${tubePieces(route, 1.5, P, { maxLength: 400 }).map((pc) => tubeSvg(pc, { tone: "hi" })).join("")}</g><path class="flow" data-w="${id}" d="${k.pathOf(route.map(at))}"/>`;
};
const PJ = [[PSU.x + PSU.w + 1, PSU.y + PSU.d - 18, PSU_H - 44], [PSU.x + PSU.w + 1, PSU.y + PSU.d - 36, PSU_H - 44]];
put("snoeren", [
  cable([PJ[1], [-125, PJ[1][1], PJ[1][2]], [-125, PJ[1][1], 1.5], [-125, 36, 1.5], [term(planL, -8)[0], 36, 1.5], [term(planL, -8)[0], term(planL, -8)[1] + 2, 1.5], term(planL, -8)], "red", "p1"),
  cable([PJ[0], [-133, PJ[0][1], PJ[0][2]], [-133, PJ[0][1], 1.5], [-133, 48, 1.5], [term(planL, 8)[0], 48, 1.5], [term(planL, 8)[0], term(planL, 8)[1] + 2, 1.5], term(planL, 8)], "", "p2"),
  cable([term(planR, 8), [term(planR, 8)[0], term(planR, 8)[1] + 2, 1.5], [term(planR, 8)[0], 38, 1.5], [150, 38, 1.5], [150, 30, 1.5], [LAMP[0] - 8, LAMP[1], 6]], "red", "s1"),
  cable([term(planR, -8), [term(planR, -8)[0], term(planR, -8)[1] + 2, 1.5], [term(planR, -8)[0], 52, 1.5], [158, 52, 1.5], [158, 42, 1.5], [LAMP[0] - 4, LAMP[1] + 8, 6]], "", "s2"),
].join(""));

const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Transformator</title><desc id="d">Een demonstratietransformator op een plankje: een gesloten, gelamelleerde kern van weekijzer met links de primaire en rechts de secundaire spoel. Links staat een voeding, rechts een lampje op de secundaire kring.</desc>
<defs><radialGradient id="glowGrad"><stop offset="0" stop-color="#fff6c8"/><stop offset=".35" stop-color="#ffd84a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb020" stop-opacity="0"/></radialGradient></defs>
<g class="fig">${groups.join("")}</g></svg>`;

const DATA = { P, planL, planR, COIL, DY };
const side = `
      <div class="action-row">
        <button class="btn-accent" id="run">Voeding aan</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Voeding uit</span></div>
        <div class="ctl"><div class="row"><span>Primaire spanning Uₚ</span><b id="vU">12,0 V</b></div><input type="range" id="u1" min="0" max="24" step="0.5" value="12" aria-label="Primaire spanning"></div>
        <div class="row"><span>Primaire windingen Nₚ</span></div>
        <div class="toggles" id="n1"></div>
        <div class="row"><span>Secundaire windingen Nₛ</span></div>
        <div class="toggles" id="n2"></div>
        <div class="toggles"><button class="toggle" id="dc" aria-pressed="false">Gelijkspanning</button></div>
      </div>
      <div class="panel-card">
        <div class="row"><span>Secundaire spanning Uₛ</span><b id="rU2">–</b></div>
        <div class="row"><span>Stroom secundair Iₛ</span><b id="rI2">–</b></div>
        <div class="row"><span>Stroom primair Iₚ</span><b id="rI1">–</b></div>
        <div class="row"><span>Vermogen Pₚ = Pₛ</span><b id="rP">–</b></div>
        <div class="eq">Uₛ / Uₚ = Nₛ / Nₚ &nbsp;·&nbsp; Iₚ / Iₛ = Nₛ / Nₚ</div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps">
          <li><span>Een wisselstroom in de primaire spoel maakt een magnetisch veld dat steeds van grootte en zin verandert.</span></li>
          <li><span>De gesloten ijzeren kern leidt die wisselende flux ook door de secundaire spoel.</span></li>
          <li><span>In elke winding wekt de veranderende flux dezelfde spanning op. Meer windingen: meer spanning, Uₛ = Uₚ · Nₛ / Nₚ.</span></li>
          <li><span>Bij gelijkspanning verandert de flux niet: dan is er geen inductiespanning en blijft het lampje uit.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;
const legend = `
        <span><i class="bar" style="background:#1f7f86"></i>magnetische flux in de kern</span>
        <span><i class="bar" style="background:#e0a020"></i>stroom (wisselt van zin)</span>
        <span><i class="bar" style="background:#b8733a"></i>koperdraad</span>
        <span><i class="bar" style="background:#8f98a3"></i>weekijzer</span>`;
const css = `
  .wood>.iso-top{fill:#f3e6cf}.wood>.iso-shade{fill:#e2cda9}
  .wood2>.iso-top{fill:#e9d4ae}.wood2>.iso-shade{fill:#d6bb8f}
  .iron>.iso-top{fill:#dfe3e7}.iron>.iso-shade[data-shade="0"]{fill:#a2a9b1}.iron>.iso-shade[data-shade="1"]{fill:#b0b7be}.iron>.iso-shade[data-shade="2"]{fill:#bec4ca}.iron>.iso-shade[data-shade="3"]{fill:#ccd1d6}
  .lam{stroke:#8f98a3 !important;stroke-width:.5 !important}
  .copper>.iso-top{fill:#e0a575}.copper>.iso-shade{fill:#cf8f59}.copper>.iso-shade[data-shade="0"]{fill:#b8733a}.copper>.iso-shade[data-shade="1"]{fill:#c4834b}
  .bobbin>.iso-top{fill:#5b6573}.bobbin>.iso-shade{fill:#454e5a}
  .brass>.iso-top,.brass>.iso-shade{fill:#dcc27c}
  .bakelite>.iso-top{fill:#5b4a3e}.bakelite>.iso-shade{fill:#47392f}
  .glass .iso-shade,.glass .iso-top,.glass .iso-fill{fill:#f4f2e8;stroke:#f4f2e8;fill-opacity:.8}
  .psu>.iso-top{fill:#e8eaec}.psu>.iso-shade{fill:#cfd3d8}
  .bezel{fill:#5b6573}.lcd{fill:#dfe9d2}.lcdtext{font-family:var(--font-mono);font-size:7px;fill:#2d5a3a}
  .knob{fill:#fffdf7;stroke:#1d2a3a;stroke-width:.6}.knobmark{stroke:#1d2a3a;stroke-width:1;stroke-linecap:round}.jack{fill:#1d2a3a}.jack.red{fill:#b8453a}
  .cable .tb-body{fill:#4d5866}.cable .tb-shine{fill:#7d8896}.cable .tb-shade{fill:#36404b}
  .cable.red .tb-body{fill:#b8453a}.cable.red .tb-shine{fill:#d8776c}.cable.red .tb-shade{fill:#8f2f27}
  .flow{fill:none;stroke:#f2b631;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:3 8;opacity:0;vector-effect:non-scaling-stroke}
  .flux{fill:none;stroke:#1f7f86;stroke-width:3;stroke-linecap:round;stroke-dasharray:6 7;opacity:0;vector-effect:non-scaling-stroke}
  .wind path{fill:none;stroke:#8a4f22;stroke-width:.6;vector-effect:non-scaling-stroke}
  .filament{fill:none;stroke:#6b5a3a;stroke-width:1;vector-effect:non-scaling-stroke}
  .glow{fill:url(#glowGrad);mix-blend-mode:multiply;pointer-events:none}
`;
const PARTS = [
  { id: "kern", name: "Weekijzeren kern", text: "Een gesloten ring van weekijzer. Het ijzer bundelt de magnetische flux van de primaire spoel en leidt ze bijna volledig door de secundaire spoel. De kern bestaat uit dunne, geïsoleerde plaatjes (lamellen): zo kunnen er geen grote wervelstromen rondlopen die de kern zouden opwarmen.", fact: "gelamelleerd tegen wervelstroomverliezen" },
  { id: "primair", name: "Primaire spoel", text: "De spoel die op de voeding is aangesloten. De wisselstroom erin maakt een wisselend magnetisch veld in de kern.", fact: "Nₚ windingen" },
  { id: "secundair", name: "Secundaire spoel", text: "De spoel waarin de spanning opgewekt wordt. Ze is niet elektrisch verbonden met de primaire spoel: alleen via de flux in de kern.", fact: "Uₛ = Uₚ · Nₛ / Nₚ" },
  { id: "voeding", name: "Voeding", text: "Levert een instelbare wisselspanning van 50 Hz, of als je wilt een gelijkspanning.", fact: "50 Hz: de flux keert 100 keer per seconde om" },
  { id: "lamp", name: "Lampje", text: "Een lampje van 6 V en 3 W op de secundaire kring. Is Uₛ veel groter dan 6 V, dan brandt het door.", fact: "R = 12 Ω" },
];
const page = pageHtml({
  title: "Transformator", h1: "Transformator", hue: 150, icon: "transformator", W, H, svg, legend, side, css,
  corners: { tl: "ideale transformator", bl: "wisselstroom vertraagd", br: "voeding uit" },
  script: `${kitScript()}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
