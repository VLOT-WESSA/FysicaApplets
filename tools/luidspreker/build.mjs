// Bouwt ../../luidspreker.dc.html: een elektrodynamische luidspreker in doorsnede, in een klankbord.
//   node tools/luidspreker/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";
import { painter } from "../shared/painter.mjs";
import { halfBody } from "../shared/revolve.mjs";
import { pageHtml, kitScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";
import * as PT from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "luidspreker.dc.html");
const W = 880, H = 560;
const AZ = 45, EL = 26, TILT = 26 * Math.PI / 180;
const RAD = Math.PI / 180;

// assenstelsel van de luidspreker: as horizontaal, iets naar de kijker gedraaid
const a0 = AZ * RAD;
const right = [Math.sin(a0), -Math.cos(a0), 0], toward = [Math.cos(a0), Math.sin(a0), 0];
const ax = [right[0] * Math.cos(TILT) + toward[0] * Math.sin(TILT), right[1] * Math.cos(TILT) + toward[1] * Math.sin(TILT), 0];
const nv = [-right[0] * Math.sin(TILT) + toward[0] * Math.cos(TILT), -right[1] * Math.sin(TILT) + toward[1] * Math.cos(TILT), 0];
const back = [-nv[0], -nv[1], 0];
const FR = { o: [0, 0, PT.ZC], ax, up: [0, 0, 1], back };
const L = (a, b, z) => [ax[0] * a + back[0] * b, ax[1] * a + back[1] * b, z];   // lokaal (as, achter, hoogte) → wereld

const BASE = { a0: -175, a1: 300, b0: -46, b1: 150 };
const P = k.fitProjection(
  [L(BASE.a0, BASE.b0, -16), L(BASE.a1, BASE.b0, -16), L(BASE.a0, BASE.b1, 0), L(BASE.a1, BASE.b1, 0), L(99, 130, PT.ZC * 2), L(99, 0, PT.ZC * 2 + 4), L(-60, 100, 120)],
  W, H, { pad: 18, azimuth: AZ, elevation: EL });
const S1 = painter(P);      // statisch, achteraan
const S2 = painter(P);      // statisch, vóór de bewegende delen (poolkern, klankbord)
const S3 = painter(P);      // snijvlakken
const r1 = (v) => Math.round(v * 10) / 10;

// ------------------------------------------------------------ tafelblad
function lbox(S, a, b, z, cls, opt = {}) {               // doos in lokale assen: a=[a0,a1], b=[b0,b1], z=[z0,z1]
  const p = (u, v, w) => L(u, v, w);
  const faces = [
    [(u, v) => p(a[1], b[0] + (b[1] - b[0]) * u, z[0] + (z[1] - z[0]) * v), ax, b[1] - b[0], z[1] - z[0]],
    [(u, v) => p(a[0], b[0] + (b[1] - b[0]) * u, z[0] + (z[1] - z[0]) * v), [-ax[0], -ax[1], 0], b[1] - b[0], z[1] - z[0]],
    [(u, v) => p(a[0] + (a[1] - a[0]) * u, b[0], z[0] + (z[1] - z[0]) * v), nv, a[1] - a[0], z[1] - z[0]],
    [(u, v) => p(a[0] + (a[1] - a[0]) * u, b[1], z[0] + (z[1] - z[0]) * v), back, a[1] - a[0], z[1] - z[0]],
    [(u, v) => p(a[0] + (a[1] - a[0]) * u, b[0] + (b[1] - b[0]) * v, z[1]), [0, 0, 1], a[1] - a[0], b[1] - b[0]],
  ];
  for (const [fn, n, du, dv] of faces) S.patch(fn, Math.max(1, Math.round(du / (opt.cell || 9))), Math.max(1, Math.round(dv / (opt.cell || 9))), { cls, toward: () => n, bias: opt.bias || 0 });
}
const back0 = [];
{
  const ring = [[BASE.a0, BASE.b0], [BASE.a1, BASE.b0], [BASE.a1, BASE.b1], [BASE.a0, BASE.b1]].map(([a, b]) => L(a, b, 0).slice(0, 2));
  back0.push(`<path class="iso-halo" d="${k.pathOf(ring.map(([x, y]) => k.iso([x, y, -16], P)), true)}"/>`);
  back0.push(k.solidSvg(k.extrude(ring, -14, 14, P, { bevel: 1.2 }), { tone: "hi", className: "wood" }));
  for (const b of [-20, 20, 60, 100, 130]) back0.push(k.lineSvg(k.pathOf([L(BASE.a0 + 6, b, 0), L(BASE.a1 - 6, b + 3, 0)].map((p) => k.iso(p, P))), { tone: "faint" }));
}

// ------------------------------------------------------------ luidspreker (statisch)
S1.setPart("magneet");
halfBody(S1, FR, PT.MAG_S, { cls: "m", cut: "xs", shells: true, cuts: false });
halfBody(S1, FR, PT.MAG_N, { cls: "m", cut: "xn", shells: true, cuts: false });
S1.setPart("pool");
halfBody(S1, FR, PT.TOP, { cls: "m", cuts: false });
S1.setPart("frame");
halfBody(S1, FR, PT.FRAME, { cls: "m", cuts: false, steps: 36 });
S2.setPart("pool");
halfBody(S2, FR, PT.POLE, { cls: "m", cuts: false });
S3.setPart("magneet");
halfBody(S3, FR, PT.MAG_S, { shells: false, cut: "xs" });
halfBody(S3, FR, PT.MAG_N, { shells: false, cut: "xn" });
S3.setPart("pool");
halfBody(S3, FR, PT.TOP, { shells: false, cut: "xi" });
halfBody(S3, FR, PT.POLE, { shells: false, cut: "xi" });
S3.setPart("frame");
halfBody(S3, FR, PT.FRAME, { shells: false, cut: "xf" });

// klankbord: plank loodrecht op de as met een halve opening
{
  const B = PT.BAFFLE, zc = PT.ZC;
  S2.setPart("klankbord");
  const reach = (psi) => { const c = Math.cos(psi), s = Math.sin(psi); return Math.min(c > 1e-6 ? (B.up - 6) / c : c < -1e-6 ? zc / -c : 1e9, s > 1e-6 ? B.back / s : 1e9); };
  const onFace = (a, R, psi) => [FR.o[0] + ax[0] * a + R * Math.sin(psi) * back[0], FR.o[1] + ax[1] * a + R * Math.sin(psi) * back[1], zc + R * Math.cos(psi)];
  S2.patch((u, v) => { const psi = Math.PI * u; return onFace(B.a1, B.hole + (reach(psi) - B.hole) * v, psi); }, 36, 4, { cls: "w", toward: () => ax, edges: true, hideEdges: {} });
  S2.patch((u, v) => onFace(B.a0 + (B.a1 - B.a0) * v, B.hole, Math.PI * u), 36, 1, { cls: "w", toward: (m) => [FR.o[0] - m[0] + ax[0] * 0, FR.o[1] - m[1], zc - m[2]] });
  // bovenkant, zijkant
  S2.patch((u, v) => L(B.a0 + (B.a1 - B.a0) * u, B.back * v, zc + B.up - 6), 2, 12, { cls: "w", toward: () => [0, 0, 1] });
  S2.patch((u, v) => L(B.a0 + (B.a1 - B.a0) * u, B.back, (zc + B.up - 6) * v), 2, 16, { cls: "w", toward: () => back });
  // houtschroeven die het frame vasthouden
  for (const psi of [0.35, 1.2, 2.0, 2.8]) S2.dotAt(onFace(B.a1, 95, psi), { n: ax, size: 0.7, tone: "hi", bias: 0.5 });
  // snijvlak van de plank
  S3.setPart("klankbord");
  for (const [z0, z1] of [[zc + B.hole, zc + B.up - 6], [0, zc - B.hole]]) {
    const q = [L(B.a0, 0, z0), L(B.a1, 0, z0), L(B.a1, 0, z1), L(B.a0, 0, z1)].map((p) => [p[0], p[1], p[2]]);
    S3.poly(q, { cls: "xw!", n: nv, lines: q.map((p, i) => [[p, q[(i + 1) % 4]], "hi"]) });
  }
  // voetjes van het klankbord
  S1.setPart("klankbord");
  lbox(S1, [B.a0 - 22, B.a0], [10, 40], [0, 10], "w");
  lbox(S1, [B.a0 - 22, B.a0], [92, 122], [0, 10], "w");
}

// ------------------------------------------------------------ toongenerator en snoer
const GEN = { a: [-165, -95], b: [-6, 52], z: [0, 64] };
S1.setPart("generator");
lbox(S1, GEN.a, GEN.b, GEN.z, "m");
for (const da of [-160, -100]) S1.dotAt(L(da, GEN.b[0], 58), { n: nv, size: 0.6, tone: "hi" });
// schermpje en knoppen op de voorkant (voorkant kijkt naar de kijker: -back)
const face = (u, v) => L(GEN.a[0] + u, GEN.b[0] - 0.1, GEN.z[1] - v);
const M = (() => { const o = k.iso(face(0, 0), P), ex = k.iso(face(1, 0), P), ey = k.iso(face(0, 1), P); return [ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]]; })();
const SCREEN = { x: 8, y: 9, w: 40, h: 22 };
const gen2d = `<g transform="matrix(${M.map((v) => v.toFixed(4)).join(" ")})">
  <rect x="${SCREEN.x - 1.4}" y="${SCREEN.y - 1.4}" width="${SCREEN.w + 2.8}" height="${SCREEN.h + 2.8}" rx="1.2" class="bezel"/>
  <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" class="lcd"/>
  <path data-part="trace" class="trace" d=""/>
  <text data-part="ftext" x="${SCREEN.x + 2}" y="${SCREEN.y + 5.4}" class="lcdtext">440 Hz</text>
  <circle cx="58" cy="17" r="5.5" class="knob"/><path d="M58 17L58 12.4" class="knobmark"/>
  <circle cx="58" cy="35" r="3.6" class="knob"/>
  <circle cx="14" cy="45" r="2.2" class="jack"/><circle cx="24" cy="45" r="2.2" class="jack red"/>
</g>`;
S1.raw(gen2d, S1.depth(L(-130, GEN.b[0], 32)) + 40);
// snoer van de generator naar de aansluitlippen onderaan het frame
{
  const term = (a) => [FR.o[0] + ax[0] * a, FR.o[1] + ax[1] * a, PT.ZC - 47];
  const routes = [[L(-151, -6, 19), L(-151, -14, 6), L(-151, -14, 1.4), L(50, -14, 1.4), L(50, -2, 1.4), term(50)], [L(-141, -6, 19), L(-141, -20, 6), L(-141, -20, 1.4), L(58, -20, 1.4), L(58, -2, 1.4), term(58)]];
  routes.forEach((pts, i) => {
    const route = G.fillet(pts, 6, 7);
    S1.setPart("snoer");
    for (const piece of tubePieces(route, 1.3, P, { maxLength: 14 })) S1.raw(`<g class="${i ? "cable red" : "cable"}">${tubeSvg(piece, { tone: "hi" })}</g>`, G.dot3(piece.mid, S1.V) + 80);
  });
  S1.setPart("frame");
  for (const a of [50, 58]) { const p = term(a); S1.dotAt(p, { size: 1.2, tone: "hi", bias: 90 }); }
}

// ------------------------------------------------------------ luchtdeeltjes (raster op het snijvlak, vóór de luidspreker)
const AIR = [];
for (let a = 106; a <= 286; a += 7) for (let z = PT.ZC - 90; z <= PT.ZC + 90; z += 9) AIR.push([a, z]);

const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Luidspreker in doorsnede</title><desc id="d">Een elektrodynamische luidspreker, doormidden gezaagd, in een houten klankbord. Achteraan een ringmagneet tussen twee ijzeren platen met een poolkern; in de smalle spleet zit de spreekspoel, vast aan de papieren conus. Een toongenerator stuurt wisselstroom door de spoel; de conus trilt en duwt de lucht ervoor samen en uit elkaar.</desc>
<defs>
  <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V4" stroke="#1d2a3a" stroke-width=".5" opacity=".35"/></pattern>
  <marker id="arrF" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#a3302a"/></marker>
  <marker id="arrB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L10 5L0 9z" fill="#1f7f86"/></marker>
</defs>
<g class="fig">
<g data-p="tafel">${back0.join("")}</g>
<g class="s1">${S1.render()}</g>
<g data-part="mshell"></g>
<g class="s2">${S2.render()}</g>
<g class="s3">${S3.render()}</g>
<g data-part="mcut"></g>
<g data-part="field" class="gapfield" data-p="pool"></g>
<g data-part="air" class="air" data-p="lucht"></g>
<g data-part="marks" class="marks" data-p="spoel"></g>
</g></svg>`;

const ZOOM = (() => {
  const pts = [];
  for (const a of [-4, 62]) for (const R of [0, 56]) for (const psi of [0, Math.PI / 2, Math.PI]) pts.push(k.iso([FR.o[0] + ax[0] * a + R * Math.sin(psi) * back[0], FR.o[1] + ax[1] * a + R * Math.sin(psi) * back[1], FR.o[2] + R * Math.cos(psi)], P));
  let x0 = Math.min(...pts.map((p) => p[0])) - 24, x1 = Math.max(...pts.map((p) => p[0])) + 24, y0 = Math.min(...pts.map((p) => p[1])) - 24, y1 = Math.max(...pts.map((p) => p[1])) + 24;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < W / H) { const nw = h * W / H; x0 -= (nw - w) / 2; w = nw; } else { const nh = w * H / W; y0 -= (nh - h) / 2; h = nh; }
  return [x0, y0, w, h];
})();
const DATA = { P, FR, AIR, SCREEN, W, H, ZOOM };
const inline = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");
const sharedInline = (file) => readFileSync(join(HERE, "..", "shared", file), "utf8").replace(/^import .*$/gm, "").replace(/^export /gm, "");

const side = `
      <div class="action-row">
        <button class="btn-accent" id="run">Stroom aan</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Stil</span></div>
        <div class="toggles" id="mode"><button data-m="ac">wisselstroom</button><button data-m="dcp">gelijkstroom +</button><button data-m="dcm">gelijkstroom −</button></div>
        <div class="toggles"><button class="toggle" id="zoom">Inzoomen op magneet en spoel</button></div>
        <div class="ctl">
          <div class="row"><span>Frequentie</span><b id="vF">440 Hz</b></div>
          <input type="range" id="freq" min="0" max="1" step="0.001" value="0.6" aria-label="Frequentie">
        </div>
        <div class="ctl">
          <div class="row"><span>Volume (spanning)</span><b id="vU">2,0 V</b></div>
          <input type="range" id="vol" min="0" max="4" step="0.1" value="2" aria-label="Spanning in volt">
        </div>
        <div class="row"><span>Stroom door de spoel (piek)</span><b id="rI">–</b></div>
        <div class="row"><span>Kracht F = B·I·ℓ (piek)</span><b id="rF">–</b></div>
        <div class="row"><span>Uitwijking conus (echt)</span><b id="rX">–</b></div>
        <div class="row"><span>Golflengte λ = v / f</span><b id="rL">–</b></div>
      </div>
      <div class="panel-card">
        <div class="card-head">Lorentzkracht op één winding</div>
        <svg id="lfig" viewBox="0 0 300 124" style="width:100%;height:auto;display:block;background:#fbf8f1;border:1px solid var(--rule);border-radius:4px">
          <text x="10" y="16" font-family="IBM Plex Mono" font-size="10.5" fill="#4f5b69">doorsnede van de spleet, bovenkant</text>
          <rect x="128" y="22" width="44" height="12" fill="#bcc2c9"/><text x="178" y="32" font-family="IBM Plex Mono" font-size="10" fill="#4f5b69">bovenplaat (N)</text>
          <rect x="128" y="96" width="44" height="12" fill="#bcc2c9"/><text x="178" y="106" font-family="IBM Plex Mono" font-size="10" fill="#4f5b69">poolkern (Z)</text>
          <path d="M120 36V92M180 36V92" stroke="#1f7f86" stroke-width="1.8" marker-end="url(#lB)"/>
          <text x="188" y="72" font-family="IBM Plex Mono" font-size="12" font-weight="600" fill="#1f7f86">B</text>
          <g id="lI"></g>
          <path id="lF" d="" stroke="#a3302a" stroke-width="3" marker-end="url(#lFa)"/>
          <text id="lFt" x="0" y="58" font-family="IBM Plex Mono" font-size="12" font-weight="600" fill="#a3302a" text-anchor="middle">F</text>
          <text x="10" y="120" font-family="IBM Plex Mono" font-size="9.5" fill="#4f5b69">← naar de magneet · langs de as · naar de conus →</text>
          <defs><marker id="lB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L10 5L0 9z" fill="#1f7f86"/></marker><marker id="lFa" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#a3302a"/></marker></defs>
        </svg>
        <div class="help" id="lText">Geen stroom: geen kracht.</div>
        <div class="eq">F = B · I · ℓ &nbsp;(ℓ = totale draadlengte in de spleet)</div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps" id="steps">
          <li><span>De ringmagneet en de ijzeren platen sturen het magneetveld door een smalle spleet. Daar staat het veld radiaal: overal loodrecht op de draad van de spoel.</span></li>
          <li><span>Loopt er stroom door de spreekspoel, dan werkt op elke winding een lorentzkracht F = B·I·ℓ langs de as: de spoel schuift naar voor of naar achter.</span></li>
          <li><span>Keert de stroom om, dan keert ook de kracht om: spoel en conus trillen met de frequentie van de stroom.</span></li>
          <li><span>De conus duwt de lucht samen en trekt ze uit elkaar: er loopt een geluidsgolf weg.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;

const legend = `
        <span><i class="bar" style="background:#c8534a"></i>noordpool magneet</span>
        <span><i class="bar" style="background:#4a74c8"></i>zuidpool magneet</span>
        <span><i class="bar" style="background:#1f7f86"></i>magnetische veldlijnen</span>
        <span><i style="background:#e0a020"></i>stroomzin ⊙ uit / ⊗ in</span>
        <span><i class="bar" style="background:#a3302a"></i>kracht op de spoel</span>
        <span><i style="background:#1d2a3a"></i>luchtdeeltjes</span>`;

const css = `
  .s1 path,.s2 path,.s3 path{stroke-width:.45;stroke-linejoin:round}
  .m0{fill:var(--anatomy-shade-0);stroke:var(--anatomy-shade-0)}.m1{fill:var(--anatomy-shade-1);stroke:var(--anatomy-shade-1)}.m2{fill:var(--anatomy-shade-2);stroke:var(--anatomy-shade-2)}.m3{fill:var(--anatomy-shade-3);stroke:var(--anatomy-shade-3)}.mt{fill:var(--anatomy-top);stroke:var(--anatomy-top)}
  .w0{fill:#d9c29d;stroke:#d9c29d}.w1{fill:#e2cda9;stroke:#e2cda9}.w2{fill:#e9d7b6;stroke:#e9d7b6}.w3{fill:#efdfc2;stroke:#efdfc2}.wt{fill:#f3e6cf;stroke:#f3e6cf}
  .p0{fill:#d8ccb0;stroke:#d8ccb0}.p1{fill:#e1d6bc;stroke:#e1d6bc}.p2{fill:#e9dfc8;stroke:#e9dfc8}.p3{fill:#f0e8d5;stroke:#f0e8d5}.pt{fill:#f4eddd;stroke:#f4eddd}
  .r0,.r1,.r2,.r3,.rt{fill:#5b6573;stroke:#5b6573}
  .cu0{fill:#b8733a;stroke:#b8733a}.cu1{fill:#c4834b;stroke:#c4834b}.cu2,.cu3,.cut{fill:#cf8f59;stroke:#cf8f59}
  .xs{fill:#9fb3dc;stroke:#9fb3dc}.xn{fill:#e0a39d;stroke:#e0a39d}.xi{fill:#bcc2c9;stroke:#bcc2c9}.xf{fill:#cfd3d8;stroke:#cfd3d8}.xw{fill:#e6d2ad;stroke:#e6d2ad}
  .xp{fill:#d9cdb0;stroke:#d9cdb0}.xc{fill:#d08a4c;stroke:#d08a4c}.xr{fill:#6b7480;stroke:#6b7480}
  .hatch{fill:url(#hatch);stroke:none;pointer-events:none}
  .lh,.lm,.ll,.lf{fill:none;stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .lh{stroke:var(--anatomy-hi)}.lm{stroke:var(--anatomy-mid)}.ll{stroke:var(--anatomy-lo)}.lf{stroke:var(--anatomy-faint)}
  .dt{fill:var(--anatomy-dot);opacity:.5}.dt[data-tone="hi"]{opacity:.85}
  .wood>.iso-top{fill:#f3e6cf}.wood>.iso-shade{fill:#e2cda9}
  .cable .tb-body{fill:#4d5866}.cable .tb-shine{fill:#7d8896}.cable .tb-shade{fill:#36404b}
  .cable.red .tb-body{fill:#b8453a}.cable.red .tb-shine{fill:#d8776c}.cable.red .tb-shade{fill:#8f2f27}
  .bezel{fill:#5b6573}.lcd{fill:#dfe9d2}.trace{fill:none;stroke:#2d5a3a;stroke-width:.7}.lcdtext{font-family:var(--font-mono);font-size:4.6px;fill:#2d5a3a}
  .knob{fill:#fffdf7;stroke:#1d2a3a;stroke-width:.5}.knobmark{stroke:#1d2a3a;stroke-width:.8;stroke-linecap:round}.jack{fill:#1d2a3a}.jack.red{fill:#b8453a}
  .gapfield .loop{fill:none;stroke:#1f7f86;stroke-width:1.3;stroke-dasharray:4 3;vector-effect:non-scaling-stroke}
  .gapfield .gap{fill:none;stroke:#1f7f86;stroke-width:1.8;vector-effect:non-scaling-stroke}
  .gapfield .pole{font-family:var(--font-mono);font-size:10px;font-weight:700;fill:#1d2a3a;text-anchor:middle}
  .flab{font-family:var(--font-mono);font-size:10px;font-weight:700;fill:#a3302a}
  .ci{fill:#fffdf7;stroke:#e0a020;stroke-width:2}
  .air circle{fill:#1d2a3a}
  .marks circle{fill:#fffdf7;stroke:#e0a020;stroke-width:1.4}
  .marks .sym{fill:none;stroke:#b07a10;stroke-width:1.4;stroke-linecap:round}
  .marks .dotc{fill:#b07a10;stroke:none}
  .marks .force{stroke:#a3302a;stroke-width:2.6;fill:none;stroke-linecap:round;vector-effect:non-scaling-stroke}
  .marks circle{vector-effect:non-scaling-stroke}
`;

const PARTS = [
  { id: "magneet", name: "Ringmagneet", text: "Een permanente magneet van ferriet, in de lengte gemagnetiseerd: noord vooraan, zuid achteraan. Zijn veldlijnen lopen in een gesloten kring: door de bovenplaat naar binnen, dwars door de spleet, door de poolkern naar achter en via de achterplaat terug naar de magneet.", fact: "een permanente magneet: het veld staat er altijd, ook zonder stroom" },
  { id: "pool", name: "Poolkern en platen", text: "Weekijzer rond de magneet: de achterplaat met de poolkern in het midden en de bovenplaat met een gat. Tussen kern en plaat blijft een smalle ringvormige spleet over. Daar staat het veld radiaal: overal loodrecht op de draad van de spoel.", fact: "B in de spleet ≈ 1 T" },
  { id: "spoel", name: "Spreekspoel", text: "Een spoel van dun koperdraad op een kokertje, vrij hangend in de spleet. Elke winding loopt rond, loodrecht op het radiale veld. Daardoor werkt op elk stukje draad een kracht in dezelfde richting: langs de as. Keert de stroom om, dan keert de kracht om. De spoel is zelf geen magneet die aangetrokken wordt: het is een stroomgeleider in een veld.", fact: "F = B · I · ℓ, met ℓ de totale draadlengte in de spleet" },
  { id: "conus", name: "Conus en stofkapje", text: "Een lichte trechter van papier, vast aan de spoel. Hij beweegt mee en duwt met zijn grote oppervlak tegen de lucht. Het bolle kapje in het midden houdt stof uit de spleet.", fact: "hoe groter de conus, hoe beter voor lage tonen" },
  { id: "ophanging", name: "Spin en rand", text: "De gegolfde spin achteraan en de rubberen rand vooraan houden de conus netjes in het midden, en duwen hem terug naar de ruststand: ze werken als een veer.", fact: "eigenfrequentie f₀ = (1/2π)·√(k/m) ≈ 55 Hz" },
  { id: "generator", name: "Toongenerator", text: "Maakt een sinusvormige wisselspanning met een instelbare frequentie. Het schermpje toont het signaal.", fact: "I = U / R, met R = 8 Ω" },
  { id: "lucht", name: "Lucht", text: "De luchtdeeltjes bewegen heen en weer in de richting waarin de golf loopt: een longitudinale golf. Waar ze dicht opeen zitten is de druk hoger (verdichting), waar ze uiteen gaan lager (verdunning).", fact: "v = 343 m/s, λ = v / f" },
];

const page = pageHtml({
  title: "Luidspreker", h1: "Elektromagnetische luidspreker", hue: 150, icon: "luidspreker", W, H, svg, legend, side, css,
  corners: { tl: "doorsnede · motor groter getekend", bl: "beweging sterk vergroot en vertraagd", br: "stil" },
  script: `${kitScript()}\nconst k = { iso, cameraOf };\n${sharedInline("painter.mjs")}\n${sharedInline("revolve.mjs")}\n${inline("parts.mjs")}\n${inline("model.mjs")}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
