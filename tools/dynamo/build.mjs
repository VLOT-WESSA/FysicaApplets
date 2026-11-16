// Bouwt ../../fietsdynamo.dc.html: een voorwiel in een vork op een standaard, met een flesdynamo en een lamp.
//   node tools/dynamo/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";
import { painter } from "../shared/painter.mjs";
import { halfBody } from "../shared/revolve.mjs";
import { pageHtml, kitScript, moduleScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "fietsdynamo.dc.html");
const W = 880, H = 600;
const AZ = 40, EL = 24, RAD = Math.PI / 180;
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const sum = (...t) => t.reduce((p, [v, s]) => add(p, v, s), [0, 0, 0]);
const unit = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };

// wielvlak: as (naaf) nw wijst schuin naar de kijker, eh ligt horizontaal in het wielvlak
const vh = [Math.cos(AZ * RAD), Math.sin(AZ * RAD), 0];
const rot = (v, d) => [v[0] * Math.cos(d) - v[1] * Math.sin(d), v[0] * Math.sin(d) + v[1] * Math.cos(d), 0];
const nw = rot(vh, -38 * RAD);
let eh = [-nw[1], nw[0], 0];
const Z = [0, 0, 1];
const C = [0, 0, 206 + 17 + 12];                          // naaf
const RT = 206, TR = 17, RIM = [166, 194];      // band (middellijn, dikte) en velg
const dirW = (b) => add([Math.sin(b) * eh[0], Math.sin(b) * eh[1], 0], Z, Math.cos(b));   // in het wielvlak, b=0 boven
const BASE_Z = 0;

// flesdynamo: op de vork, rolletje tegen de zijwand van de band
const ALPHA = -30 * RAD, TILT = 22 * RAD, SA = 1.3, SR = 1.35;
const ROLL = { r0: 8, L: 13 };
ROLL.r1 = ((10 + ROLL.r0 * Math.cos(TILT) - 10) + ROLL.L * Math.sin(TILT)) / Math.cos(TILT);
const rd = dirW(ALPHA);
const tdir = dirW(ALPHA + Math.PI / 2);
const dax = unit(sum([rd, -Math.cos(TILT)], [nw, Math.sin(TILT)]));
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
let dback = unit(cr(tdir, dax)); if (G.dot3(dback, nw) > 0) dback = dback.map((x) => -x);
const DYN = { o: sum([C, 1], [rd, 187], [nw, 10 + ROLL.r0 * Math.cos(TILT)]), ax: dax, up: tdir, back: dback };
const scp = (prof) => prof.map(([a, R]) => [a * SA, R * SR]);
const dpt = (a, R, psi) => sum([DYN.o, 1], [DYN.ax, a], [DYN.up, R * Math.cos(psi)], [DYN.back, R * Math.sin(psi)]);

const P = k.fitProjection(
  [add(C, Z, RT + TR + 120), ...[[-250, -150], [250, -150], [250, 215], [-250, 215]].map(([a, b]) => { const p = sum([[C[0], C[1], 0], 1], [eh, a], [nw, b]); return [p[0], p[1], -14]; })],
  W, H, { pad: 16, azimuth: AZ, elevation: EL });
const V = G.viewOf(P);
const depth = (p) => G.dot3(p, V);
const r1 = (v) => Math.round(v * 10) / 10;

// ------------------------------------------------------------ tafel
const BASEPLAN = [[-250, -150], [250, -150], [250, 215], [-250, 215]].map(([a, b]) => [C[0] + a * eh[0] + b * nw[0], C[1] + a * eh[1] + b * nw[1]]);
const tafel = [`<path class="iso-halo" d="${k.pathOf([-1,1].flatMap((sg)=>[0,1].map((t)=>{const p=sum([C,1],[eh,(t?1:-1)*sg*150],[nw,sg*30]);return k.iso([p[0],p[1],0],P)})),true)}" style="filter:blur(10px)"/>`, `<path class="iso-halo" d="${k.pathOf(BASEPLAN.map(([x, y]) => k.iso([x, y, -14], P)), true)}"/>`,
  k.solidSvg(k.extrude(BASEPLAN, -14, 14, P, { bevel: 1.2 }), { tone: "hi", className: "wood" })];

// ------------------------------------------------------------ wiel (band en velg in twee helften rond het wielvlak)
const back = painter(P), front = painter(P), mid = painter(P);
const tyre = (b, ph, r = TR) => sum([C, 1], [dirW(b), RT + r * Math.cos(ph)], [nw, r * Math.sin(ph)]);
for (const [S, half] of [[back, -1], [front, 1]]) {
  S.setPart("band");
  S.patch((u, v) => tyre(u * 2 * Math.PI, half * (v * Math.PI) - (half < 0 ? 0 : 0)), 96, 9, { wrapU: true, cls: "t", toward: (m) => { const rel = add(m, C, -1); const ra = G.dot3(rel, nw); const pl = add(rel, nw, -ra); const rl = Math.hypot(...pl); const c = add(C, pl, RT / rl); return add(m, c, -1); }, crease: 0.4, edges: true, hideEdges: { j0: true, j1: true } });
  S.setPart("velg");
  S.patch((u, v) => sum([C, 1], [dirW(u * 2 * Math.PI), RIM[0]], [nw, half * 10 * v]), 96, 2, { wrapU: true, cls: "s", toward: (m) => sub(C, m), crease: 0.5 });
  // vlakke zijkant van de velg (remvlak), waar het rolletje over wrijft
  S.patch((u, v) => sum([C, 1], [dirW(u * 2 * Math.PI), RIM[0] + (RIM[1] - RIM[0]) * v], [nw, half * 10]), 96, 3, { wrapU: true, cls: "s", toward: () => nw.map((x) => x * half), crease: 0.5 });
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
// ventiel
front.setPart("velg");
front.dotAt(sum([C, 1], [dirW(2.4), RIM[0] - 1], [nw, 0]), { size: 1.1, tone: "hi" });

// naaf langs de as
const HUB = G.frameAlong(add(C, nw, -32), nw);
const hubSvg = k.solidSvg(G.disc(0, 64, 11, HUB, P), { tone: "hi", className: "steel" }) +
  k.solidSvg(G.disc(6, 9, 22, HUB, P), { tone: "mid", className: "steel" }) + k.solidSvg(G.disc(55, 58, 22, HUB, P), { tone: "mid", className: "steel" });
// as en moeren
const AXLE = G.frameAlong(add(C, nw, -50), nw);
const axleSvg = k.solidSvg(G.disc(0, 100, 4, AXLE, P), { tone: "mid", className: "steel" });
const nutSvg = (s) => k.solidSvg(G.disc(s, s + 5, 7.5, AXLE, P, { steps: 6 }), { tone: "mid", className: "steel" });

// ------------------------------------------------------------ vork en standaard
const CROWN = add(C, Z, RT + TR + 38);
const legPts = (side) => [add(add(C, nw, side * 46), Z, 0), add(add(C, nw, side * 46), Z, RT + TR + 30), add(CROWN, nw, side * 30)];
const forkSvg = (side) => tubePieces(G.fillet(legPts(side), 30, 10), 6.5, P, { maxLength: 30 }).map((pc) => ({ key: depth(pc.mid), svg: tubeSvg(pc, { tone: "hi" }) }));
const crownSvg = k.solidSvg(G.disc(0, 72, 9, G.frameAlong(add(CROWN, nw, -36), nw), P), { tone: "hi", className: "paint" });
const steer = G.frameAlong(add(CROWN, Z, 4), Z);
const steerSvg = k.solidSvg(G.disc(0, 70, 7, steer, P), { tone: "hi", className: "paint" });
// standaard: zuil achter het wiel, arm die de stuurbuis klemt
const POST = add([C[0], C[1], 0], nw, -110);
const postSvg = k.solidSvg(k.cylinder(POST[0], POST[1], 16, 0, 6, P, 32, 0.6), { tone: "mid" }) + k.solidSvg(k.cylinder(POST[0], POST[1], 6, 6, CROWN[2] + 50, P, 24), { tone: "mid", className: "steel" });
const armPts = [add(POST, Z, CROWN[2] + 48), add(add(CROWN, Z, 48), nw, 0)];
const armSvg = tubePieces(armPts, 4, P, { maxLength: 200 }).map((pc) => tubeSvg(pc, { tone: "hi" })).join("") +
  k.solidSvg(G.disc(0, 14, 10, G.frameAlong(add(CROWN, Z, 41), Z), P), { tone: "mid", className: "steel" });

// ------------------------------------------------------------ flesdynamo (halve doorsnede) + beugel
const DS = painter(P), DC = painter(P);
const PROF = {
  cap: scp([[10, 2], [10, 15], [16, 16.5], [16, 2]]),
  shell: scp([[16, 14.5], [16, 16.5], [70, 16.5], [74, 13], [74, 2], [72, 2], [72, 12], [68, 14.5]]),
  claw: scp([[22, 9.6], [22, 13.8], [26, 13.8], [26, 10.6], [54, 10.6], [54, 13.8], [58, 13.8], [58, 9.6]]),
  coil: scp([[27, 10.8], [27, 14.3], [53, 14.3], [53, 10.8]]),
};
DS.setPart("dynamo"); halfBody(DS, DYN, PROF.cap, { cls: "pt", cuts: false }); halfBody(DS, DYN, PROF.shell, { cls: "pt", cuts: false, steps: 30 });
DS.setPart("spoel"); halfBody(DS, DYN, PROF.coil, { cls: "cu", cuts: false });
DS.setPart("stator"); halfBody(DS, DYN, PROF.claw, { cls: "fe", cuts: false });
DC.setPart("dynamo"); halfBody(DC, DYN, PROF.cap, { shells: false, cut: "xg" }); halfBody(DC, DYN, PROF.shell, { shells: false, cut: "xg" });
DC.setPart("spoel"); halfBody(DC, DYN, PROF.coil, { shells: false, cut: "xc" });
DC.setPart("stator"); halfBody(DC, DYN, PROF.claw, { shells: false, cut: "xi" });
// windingen op het snijvlak van de spoel: rijtjes draaddoorsneden
for (const psi of [0, Math.PI]) for (let a = 28.5; a < 53; a += 2.3) for (const R of [11.5, 12.6, 13.7]) DC.dotAt(dpt(a * SA, R * SR, psi), { size: 0.75, tone: "lo", bias: 2 });
// beugel van de dynamo naar de vork
const legNear = (t) => add(add(C, nw, 46), Z, t);
const bracketFrom = dpt(66, 16.5, Math.PI * 0.5);
const BR0 = dpt(64 * SA, 0, 0), BR1 = [C[0] + nw[0] * 46, C[1] + nw[1] * 46, BR0[2] - 10];
const bracketSvg = tubePieces(G.fillet([BR0, add(BR0, nw, 30), BR1], 8, 6), 3.6, P, { maxLength: 100 }).map((pc) => tubeSvg(pc, { tone: "hi" })).join("") +
  k.solidSvg(G.disc(0, 12, 8.5, G.frameAlong(add(BR1, Z, -6), Z), P), { tone: "mid", className: "steel" });
void bracketFrom; void legNear;
// aansluiting onderaan de dynamo
const TERM = dpt(76 * SA, 0, 0);
const termSvg = k.solidSvg(G.disc(74 * SA, 79 * SA, 4, G.frameAlong(DYN.o, DYN.ax), P), { tone: "hi", className: "brass" });

// ------------------------------------------------------------ lamp op een paaltje
const LAMP = [C[0] + 175 * eh[0] + 160 * nw[0], C[1] + 175 * eh[1] + 160 * nw[1]];
const LZ = 96;
const LF = G.frameAlong([LAMP[0], LAMP[1], LZ], unit([vh[0] - 0.55 * eh[0], vh[1] - 0.55 * eh[1], 0]));
const lampSvg = k.solidSvg(k.cylinder(LAMP[0], LAMP[1], 14, 0, 4, P, 28, 0.5), { tone: "mid" }) + k.solidSvg(k.cylinder(LAMP[0], LAMP[1], 3, 4, LZ - 18, P, 16), { tone: "mid", className: "steel" }) +
  k.solidSvg(G.solidOf([[-22, 10, 1], [-14, 16, 1], [0, 18], [6, 18]], LF, P), { tone: "hi", className: "paint" }) +
  k.solidSvg(G.disc(6, 8, 19, LF, P), { tone: "mid", className: "steel" });
const lens = G.pointOf(LF, 8.2, 0, 0);
const lensC = k.iso(lens, P);
const lensSvg = `<path class="lens" d="${G.circleOf(LF, 8.2, 16, P)}"/><path class="lensring" d="${G.circleOf(LF, 8.2, 10, P)}"/>`;

// draden: van de dynamo naar de lamp (heen) en terug via de vork (massa)
const wireA = G.fillet([TERM, add(TERM, rd.map((x) => -x), 14), [TERM[0] - 20 * rd[0], TERM[1] - 20 * rd[1], 150], [LAMP[0] - 40 * vh[0], LAMP[1] - 40 * vh[1], 150], add([LAMP[0], LAMP[1], LZ], LF.a, -22)], 14, 8);
const wireB = G.fillet([add(add(C, nw, 46), Z, -14), add(add(C, nw, 52), Z, -40), [LAMP[0] - 30 * eh[0], LAMP[1] - 30 * eh[1], 40], [LAMP[0], LAMP[1], 8]], 16, 8);
const wires = [];
for (const [route, cls] of [[wireA, "cable red"], [wireB, "cable"]]) {
  for (const pc of tubePieces(route, 1.6, P, { maxLength: 24 })) wires.push({ key: depth(pc.mid), svg: `<g class="${cls}">${tubeSvg(pc, { tone: "hi" })}</g>` });
}
const flowD = [wireA, wireB].map((r) => k.pathOf(r.map((p) => k.iso(p, P))));

// ------------------------------------------------------------ samenstellen (achter → voor)
const farLeg = forkSvg(-1), nearLeg = forkSvg(1);
const items = [];
const put = (p, key, svg) => items.push({ p, key, svg });
put("standaard", -1e4, postSvg);
for (const it of farLeg) put("vork", it.key - 2000, it.svg);
put("band", -900, `<g class="s">${back.render()}</g>`);
put("naaf", -800, axleSvg + nutSvg(0));
put("spaken", -700, `<g data-part="spokesBack"></g>`);
put("naaf", -600, hubSvg);
put("spaken", -500, `<g data-part="spokesFront"></g>`);
put("band", -400, `<g class="s">${front.render()}</g>`);
put("naaf", -390, nutSvg(95));
put("vork", -300, crownSvg + steerSvg + armSvg);
for (const it of nearLeg) put("vork", -200 + it.key * 0.001, it.svg);
put("dynamo", -100, bracketSvg);
put("dynamo", -90, `<g class="s">${DS.render()}</g>`);
put("magneet", -80, `<g data-part="magnet"></g>`);
put("dynamo", -70, `<g class="s">${DC.render()}</g>`);
put("rol", -60, `<g data-part="roller"></g>`);
put("dynamo", -50, termSvg);
for (const w of wires) put("draden", -40 + w.key * 0.0001, w.svg);
put("draden", -30, flowD.map((d) => `<path class="flow" d="${d}"/>`).join(""));
put("lamp", -20, lampSvg + lensSvg + `<circle data-part="glow" class="glow" cx="${r1(lensC[0])}" cy="${r1(lensC[1])}" r="34" opacity="0"/>`);
items.sort((a, b) => a.key - b.key);

const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Fietsdynamo</title><desc id="d">Een fietswiel in een vork op een standaard. Tegen de zijwand van de band rolt het wieltje van een flesdynamo, die opengesneden is: binnenin draait een cilindermagneet met noord- en zuidpolen in een ijzeren stator met een spoel. Een draad gaat naar een koplamp; de vork dient als terugleiding.</desc>
<defs><radialGradient id="glowGrad"><stop offset="0" stop-color="#fff6c8"/><stop offset=".35" stop-color="#ffd84a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb020" stop-opacity="0"/></radialGradient></defs>
<g class="fig"><g data-p="tafel">${tafel.join("")}</g>${items.map((it) => `<g data-p="${it.p}">${it.svg}</g>`).join("")}</g></svg>`;

const DATA = { P, C, RT, TR, RIM, nw, eh, DYN, POLE: 2, ROLL, MAG: { a0: 26.5 * SA, a1: 53.5 * SA, r: 8.8 * SR } };

const side = `
      <div class="action-row">
        <button class="btn-accent" id="run">Fietsen</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Het wiel staat stil</span></div>
        <div class="ctl">
          <div class="row"><span>Snelheid van de fiets</span><b id="vV">15 km/h</b></div>
          <input type="range" id="speed" min="2" max="40" step="1" value="15" aria-label="Snelheid in km per uur">
        </div>
        <div class="row"><span>Toerental magneet</span><b id="rN">–</b></div>
        <div class="row"><span>Frequentie wisselspanning</span><b id="rF">–</b></div>
        <div class="row"><span>Spanning over de lamp (effectief)</span><b id="rU">–</b></div>
        <div class="row"><span>Stroom</span><b id="rI">–</b></div>
        <div class="row"><span>Vermogen van de lamp</span><b id="rP">–</b></div>
      </div>
      <div class="panel-card">
        <div class="card-head">Spanning over de lamp</div>
        <svg id="scope" viewBox="0 0 300 110" style="width:100%;height:auto;display:block;background:#fbf8f1;border:1px solid var(--rule);border-radius:4px">
          <g stroke="#e9e2d2" stroke-width="1">${Array.from({ length: 11 }, (_, i) => `<path d="M${15 + i * 27} 8V102"/>`).join("")}${Array.from({ length: 5 }, (_, i) => `<path d="M15 ${8 + i * 23.5}H285"/>`).join("")}</g>
          <path d="M15 55H285" stroke="#cfc6b3" stroke-width="1"/>
          <path id="scopeTrace" d="" fill="none" stroke="#c9822c" stroke-width="2"/>
          <text x="18" y="18" font-family="IBM Plex Mono" font-size="11" fill="#4f5b69">±10 V</text>
          <text x="282" y="98" font-family="IBM Plex Mono" font-size="11" fill="#4f5b69" text-anchor="end">20 ms</text>
        </svg>
        <div class="help">Een wisselspanning: telkens als een noordpool en daarna een zuidpool langs de spoel draait, keert de spanning om.</div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps" id="steps">
          <li><span>Het wiel draait het rolletje rond. Het rolletje is klein, dus de magneet draait veel sneller dan het wiel.</span></li>
          <li><span>De magneet draait in de spoel: de magnetische flux door de spoel verandert voortdurend van grootte en richting.</span></li>
          <li><span>Een veranderende flux wekt een inductiespanning op (wet van Faraday): U = −N·ΔΦ/Δt.</span></li>
          <li><span>Sneller fietsen: de flux verandert sneller, dus de spanning en de frequentie worden groter en de lamp brandt feller.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;

const legend = `
        <span><i class="bar" style="background:#c8534a"></i>noordpool</span>
        <span><i class="bar" style="background:#4a74c8"></i>zuidpool</span>
        <span><i class="bar" style="background:#b8733a"></i>spoel (koperdraad)</span>
        <span><i class="bar" style="background:#e0a020"></i>stroom (wisselt van zin)</span>`;

const css = `
  .s path{stroke-width:.45;stroke-linejoin:round}
  .t0{fill:#434a53;stroke:#434a53}.t1{fill:#4a525c;stroke:#4a525c}.t2{fill:#525a65;stroke:#525a65}.t3{fill:#5a636e;stroke:#5a636e}.tt{fill:#626b76;stroke:#626b76}
  .s0{fill:#b9bfc6;stroke:#b9bfc6}.s1{fill:#c9ced4;stroke:#c9ced4}.s2{fill:#d7dbe0;stroke:#d7dbe0}.s3{fill:#e4e7ea;stroke:#e4e7ea}.st{fill:#eef0f2;stroke:#eef0f2}
  .pt0{fill:#c7c9c4;stroke:#c7c9c4}.pt1{fill:#d3d5d0;stroke:#d3d5d0}.pt2{fill:#dfe1dc;stroke:#dfe1dc}.pt3{fill:#e9eae6;stroke:#e9eae6}.ptt{fill:#f1f2ee;stroke:#f1f2ee}
  .cu0{fill:#b8733a;stroke:#b8733a}.cu1{fill:#c4834b;stroke:#c4834b}.cu2,.cu3,.cut{fill:#cf8f59;stroke:#cf8f59}
  .fe0{fill:#a9b0b8;stroke:#a9b0b8}.fe1{fill:#b7bdc4;stroke:#b7bdc4}.fe2,.fe3,.fet{fill:#c5cad0;stroke:#c5cad0}
  .xg{fill:#e3e4df;stroke:#e3e4df}.xc{fill:#d08a4c;stroke:#d08a4c}.xi{fill:#bcc2c9;stroke:#bcc2c9}
  .lh,.lm,.ll,.lf{fill:none;stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .lh{stroke:var(--anatomy-hi)}.lm{stroke:var(--anatomy-mid)}.ll{stroke:var(--anatomy-lo)}.lf{stroke:var(--anatomy-faint)}
  .dt{fill:var(--anatomy-dot);opacity:.5}.dt[data-tone="hi"]{opacity:.85}.dt[data-tone="lo"]{opacity:.35}
  .wood>.iso-top{fill:#f3e6cf}.wood>.iso-shade{fill:#e2cda9}
  .steel>.iso-top,.steel .iso-top{fill:#eef0f2}.steel>.iso-shade{fill:#cfd4d9}.steel>.iso-shade[data-shade="0"]{fill:#b3bac2}
  .paint>.iso-top,.paint .iso-top{fill:#5f8fc4}.paint .iso-shade{fill:#3f6ea6;stroke:#3f6ea6}.paint .iso-shade[data-shade="3"],.paint .iso-shade[data-shade="2"]{fill:#4d7db4;stroke:#4d7db4}
  .brass>.iso-top,.brass .iso-shade{fill:#dcc27c}
  .rubber .iso-top,.rubber>.iso-top{fill:#5a5f66}.rubber .iso-shade{fill:#3b4047;stroke:#3b4047}.rubber .iso-shade[data-shade="3"],.rubber .iso-shade[data-shade="2"]{fill:#4a5058;stroke:#4a5058}
  .cable .tb-body{fill:#4d5866}.cable .tb-shine{fill:#7d8896}.cable .tb-shade{fill:#36404b}
  .cable.red .tb-body{fill:#b8453a}.cable.red .tb-shine{fill:#d8776c}.cable.red .tb-shade{fill:#8f2f27}
  .flow{fill:none;stroke:#f2b631;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:3 8;opacity:0;vector-effect:non-scaling-stroke}
  .spoke{fill:none;stroke:#8e969f;stroke-width:.8;vector-effect:non-scaling-stroke}
  .lens{fill:#f4f1e2;stroke:#1d2a3a;stroke-width:.7}.lensring{fill:none;stroke:#cfc6b3;stroke-width:.6}
  .glow{fill:url(#glowGrad);mix-blend-mode:multiply;pointer-events:none}
`;

const PARTS = [
  { id: "rol", name: "Rolletje", text: "Het gekartelde wieltje drukt tegen de zijwand van de band en wordt door de band meegenomen. Omdat het veel kleiner is dan het wiel, draait het veel sneller.", fact: "toerental × (R_wiel / r_rol) ≈ 36×" },
  { id: "magneet", name: "Draaiende magneet", text: "Een cilindermagneet op de as van het rolletje, met afwisselend noord- en zuidpolen rondom. Hij draait mee en is het bewegende deel: de rotor.", fact: "2 poolparen: 2 spanningsperiodes per omwenteling" },
  { id: "stator", name: "IJzeren stator", text: "Weekijzeren klauwpolen rond de magneet leiden zijn veld door de spoel. Draait er een noordpool voorbij, dan loopt de flux door de spoel de ene kant op; bij een zuidpool de andere kant op.", fact: "" },
  { id: "spoel", name: "Spoel", text: "Een spoel met veel windingen dun koperdraad, vast in de behuizing. De veranderende flux wekt er een inductiespanning in op.", fact: "U = −N · ΔΦ / Δt" },
  { id: "draden", name: "Draden", text: "Eén draad gaat van de aansluiting van de dynamo naar de lamp; de stroom komt terug via het metalen frame (hier de zwarte draad vanaf de vork). De gele streepjes keren telkens van richting: wisselstroom.", fact: "" },
  { id: "lamp", name: "Koplamp", text: "Een gloeilampje van 6 V en 3 W. Hoe groter de spanning, hoe meer vermogen en hoe feller het brandt. De zelfinductie van de spoel begrenst de stroom bij hoge snelheid, zodat het lampje niet doorbrandt.", fact: "P = U · I = U² / R" },
  { id: "velg", name: "Velg", text: "Het rolletje van de dynamo wrijft tegen de zijkant van de draaiende velg en wordt zo meegenomen. Het rolt zonder te slippen: de omtreksnelheid van het rolletje is gelijk aan die van de velg.", fact: "v = ω · r, dus ω_rol = ω_wiel · R_velg / r_rol" },
];

const page = pageHtml({
  title: "Fietsdynamo", h1: "Fietsdynamo", hue: 150, icon: "fietsdynamo", W, H, svg, legend, side, css,
  corners: { tl: "dynamo groter getekend en opengesneden", bl: "draaiing vertraagd", br: "stil" },
  script: `${kitScript()}\n${moduleScript("lathe.mjs", "G")}\n${moduleScript("painter.mjs", "PA", "const k = { iso, cameraOf };")}\n${readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "")}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
