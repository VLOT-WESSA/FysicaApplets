// Bouwt ../../versneller.dc.html: een lineaire versneller (Wideröe) in halve doorsnede.
//   node tools/versneller/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { tubePieces, tubeSvg } from "../shared/tube.mjs";
import { painter } from "../shared/painter.mjs";
import { halfBody } from "../shared/revolve.mjs";
import { pageHtml, kitScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "versneller.dc.html");
const W = 900, H = 520;
const AZ = 45, EL = 24, TILT = 16 * Math.PI / 180, RAD = Math.PI / 180;
const ZC = 120, GAP = 14, R_PIPE = 30;

// opeenvolgende spleten: middens a_n, zodat het deeltje een halve periode vliegt tussen twee spleten
const GAPS = [0];
for (let n = 1; n <= M.N_TUBES; n++) GAPS.push(GAPS[n - 1] + M.tubeLen(n));
const A_END = GAPS[M.N_TUBES] + 40;               // einde van de laatste sleepbuis
const TUBES = Array.from({ length: M.N_TUBES }, (_, i) => ({ n: i + 1, a0: GAPS[i] + GAP / 2, a1: i + 1 < M.N_TUBES ? GAPS[i + 1] - GAP / 2 : A_END }));

const a0 = AZ * RAD;
const right = [Math.sin(a0), -Math.cos(a0), 0], toward = [Math.cos(a0), Math.sin(a0), 0];
const ax = [right[0] * Math.cos(TILT) + toward[0] * Math.sin(TILT), right[1] * Math.cos(TILT) + toward[1] * Math.sin(TILT), 0];
const nv = [-right[0] * Math.sin(TILT) + toward[0] * Math.cos(TILT), -right[1] * Math.sin(TILT) + toward[1] * Math.cos(TILT), 0];
const back = [-nv[0], -nv[1], 0];
const FR = { o: [0, 0, ZC], ax, up: [0, 0, 1], back };
const L = (a, b, z) => [ax[0] * a + back[0] * b, ax[1] * a + back[1] * b, z];
const A0 = -150, A1 = A_END + 120;
const P = k.fitProjection([L(A0, -40, -12), L(A1, -40, -12), L(A0, 150, -12), L(A1, 150, -12), L(A0, 0, ZC + 60), L(A1, 0, ZC + 60), L(300, 140, 150)], W, H, { pad: 16, azimuth: AZ, elevation: EL });
const S = painter(P);

function lbox(Sx, a, b, z, cls, cell = 10) {
  const n = (x0, x1) => Math.max(1, Math.round((x1 - x0) / cell));
  Sx.patch((u, v) => L(a[1], b[0] + (b[1] - b[0]) * u, z[0] + (z[1] - z[0]) * v), n(...b), n(...z), { cls, toward: () => ax });
  Sx.patch((u, v) => L(a[0], b[0] + (b[1] - b[0]) * u, z[0] + (z[1] - z[0]) * v), n(...b), n(...z), { cls, toward: () => ax.map((x) => -x) });
  Sx.patch((u, v) => L(a[0] + (a[1] - a[0]) * u, b[0], z[0] + (z[1] - z[0]) * v), n(...a), n(...z), { cls, toward: () => nv });
  Sx.patch((u, v) => L(a[0] + (a[1] - a[0]) * u, b[0] + (b[1] - b[0]) * v, z[1]), n(...a), n(...b), { cls, toward: () => [0, 0, 1] });
}

// ------------------------------------------------------------ tafel
const back0 = [];
{
  const ring = [[A0, -40], [A1, -40], [A1, 150], [A0, 150]].map(([a, b]) => L(a, b, 0).slice(0, 2));
  back0.push(`<path class="iso-halo" d="${k.pathOf(ring.map(([x, y]) => k.iso([x, y, -12], P)), true)}"/>`);
  back0.push(k.solidSvg(k.extrude(ring, -12, 12, P, { bevel: 1.2 }), { tone: "hi", className: "floor" }));
  for (let a = A0 + 60; a < A1; a += 120) back0.push(k.lineSvg(k.pathOf([L(a, -40, 0), L(a, 150, 0)].map((p) => k.iso(p, P))), { tone: "faint" }));
}

// ------------------------------------------------------------ vacuümbuis, flenzen, sleepbuizen
S.setPart("buis");
halfBody(S, FR, [[-40, R_PIPE], [A_END + 30, R_PIPE], [A_END + 30, R_PIPE + 3], [-40, R_PIPE + 3]], { cls: "v", cut: "xv", steps: 30 });
for (const a of [-40, A_END + 22]) halfBody(S, FR, [[a, R_PIPE + 3], [a + 8, R_PIPE + 3], [a + 8, R_PIPE + 10], [a, R_PIPE + 10]], { cls: "v", cut: "xv", steps: 30 });
S.setPart("sleepbuizen");
for (const t of TUBES) {
  const cls = t.n % 2 ? "ta" : "tb";
  halfBody(S, FR, [[t.a0, 8], [t.a1, 8], [t.a1 - 1.5, 12], [t.a0 + 1.5, 12]], { cls, cut: "x" + cls, steps: 24 });
  // steun naar de voedingsrail (door een isolator in de buiswand)
  const am = (t.a0 + t.a1) / 2;
  const SF = { o: [ax[0] * am, ax[1] * am, ZC - 12], ax: [0, 0, -1], up: ax, back };
  halfBody(S, SF, [[0, 0], [0, 2.4], [R_PIPE - 9, 2.4], [R_PIPE - 9, 0]], { cls: cls, cut: "x" + cls, steps: 12 });
  halfBody(S, SF, [[R_PIPE - 12, 0], [R_PIPE - 12, 6], [R_PIPE + 6, 6], [R_PIPE + 6, 0]], { cls: "ins", cut: "xins", steps: 14 });
  const zr = t.n % 2 ? ZC - 62 : ZC - 76;
  halfBody(S, SF, [[R_PIPE + 6, 0], [R_PIPE + 6, 2.4], [ZC - zr - 12, 2.4], [ZC - zr - 12, 0]], { cls: "cu", cut: "xcu", steps: 12 });
}
// ionenbron (links): elektrode, isolator met ribben, kast met waterstoffles
S.setPart("bron");
halfBody(S, FR, [[-34, 8], [-7, 8], [-8.5, 12], [-34, 12]], { cls: "tb", cut: "xtb", steps: 24 });
halfBody(S, FR, [[-150, 0], [-150, 42], [-100, 42], [-100, 0]], { cls: "src", cut: "xsrc", steps: 30 });
for (let i = 0; i < 5; i++) halfBody(S, FR, [[-98 + i * 11, 20], [-98 + i * 11, 30], [-92 + i * 11, 30], [-92 + i * 11, 20]], { cls: "ins", cut: "xins", steps: 24 });
halfBody(S, FR, [[-100, 18], [-40, 18], [-40, 21], [-100, 21]], { cls: "ins", cut: "xins", steps: 24 });
// doel en detector (rechts)
S.setPart("detector");
halfBody(S, FR, [[A_END + 30, 0], [A_END + 30, 42], [A_END + 96, 42], [A_END + 96, 0]], { cls: "det", cut: "xdet", steps: 30 });
halfBody(S, FR, [[A_END + 30, 0], [A_END + 30, 14], [A_END + 34, 14], [A_END + 34, 0]], { cls: "tg", cut: "xtg", steps: 20 });

// voedingsrails A en B onder de buis
S.setPart("voeding");
lbox(S, [-20, A_END], [-3, 4], [ZC - 66, ZC - 60], "cu", 20);
lbox(S, [-20, A_END], [-3, 4], [ZC - 80, ZC - 74], "cu", 20);
// staanders en voet van de versneller
S.setPart("onderstel");
for (const a of [60, 340, A_END - 40]) {
  lbox(S, [a - 8, a + 8], [-14, 40], [0, 8], "st");
  lbox(S, [a - 4, a + 4], [8, 22], [8, ZC - R_PIPE - 3], "st");
}
// HF-generator achteraan met twee kabels naar de rails
const GEN = { a: [-60, 20], b: [70, 130], z: [0, 70] };
S.setPart("voeding");
lbox(S, GEN.a, GEN.b, GEN.z, "gen", 12);
const face = (u, v) => L(GEN.a[0] + u, GEN.b[0] - 0.1, GEN.z[1] - v);
const Mx = (() => { const o = k.iso(face(0, 0), P), ex = k.iso(face(1, 0), P), ey = k.iso(face(0, 1), P); return [ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]]; })();
S.raw(`<g transform="matrix(${Mx.map((v) => v.toFixed(4)).join(" ")})"><rect x="8" y="8" width="44" height="24" rx="1" class="bezel"/><rect x="9.5" y="9.5" width="41" height="21" class="lcd"/><path data-part="trace" class="trace" d=""/><text data-part="gtext" x="11" y="15" class="lcdtext">10,0 MHz</text><circle cx="66" cy="18" r="6" class="knob"/><circle cx="66" cy="38" r="4" class="knob"/></g>`, S.depth(L(-20, GEN.b[0], 40)) + 30);
for (const [zr, dz, cls] of [[ZC - 63, 18, "cable red"], [ZC - 77, 28, "cable"]]) {
  const route = G.fillet([L(-20, GEN.b[0], dz), L(-20, GEN.b[0] - 20, dz), L(-20, 1, zr)], 10, 6);
  for (const pc of tubePieces(route, 1.8, P, { maxLength: 30 })) S.raw(`<g class="${cls}">${tubeSvg(pc, { tone: "hi" })}</g>`, G.dot3(pc.mid, S.V) + 3);
}

// tintlaag: per sleepbuis één vlak (de omhullende van de halve buis), waarvan alleen de doorzichtigheid verandert
const hullOfTube = (a0, a1) => {
  const pts = [];
  for (let i = 0; i <= 12; i++) for (const a of [a0, a1]) for (const R of [12]) { const psi = Math.PI * i / 12; pts.push(k.iso([FR.o[0] + ax[0] * a + R * Math.sin(psi) * back[0], FR.o[1] + ax[1] * a + R * Math.sin(psi) * back[1], ZC + R * Math.cos(psi)], P)); }
  return k.pathOf(G.hullOf(pts), true);
};
const tintPaths = (odd) => TUBES.filter((t) => (t.n % 2 === 1) === odd).map((t) => hullOfTube(t.a0, t.a1)).concat(odd ? [] : [hullOfTube(-34, -7)]).join("");
const svg = `<svg class="iso-svg base" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Lineaire versneller</title><desc id="d">Een lineaire versneller op een onderstel, overlangs doorgesneden. Links een ionenbron die protonen levert, in het midden een vacuümbuis met zes koperen sleepbuizen die steeds langer worden, rechts een doelwit met een detector. De sleepbuizen hangen afwisselend aan twee rails die een hoogfrequente wisselspanning krijgen van een generator.</desc>
<defs><radialGradient id="pGrad"><stop offset="0" stop-color="#fff2d6"/><stop offset=".45" stop-color="#e8492f"/><stop offset="1" stop-color="#e8492f" stop-opacity="0"/></radialGradient>
<marker id="arrE" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 1L10 5L0 9z" fill="#3e63dd"/></marker></defs>
<g class="fig"><g data-p="tafel">${back0.join("")}</g><g class="s">${S.render()}</g></g></svg>
<svg class="iso-svg overlay" viewBox="0 0 ${W} ${H}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g class="fig">
<path data-part="tintA" class="tint" data-p="sleepbuizen" opacity="0" d="${tintPaths(true)}"/><path data-part="tintB" class="tint" data-p="sleepbuizen" opacity="0" d="${tintPaths(false)}"/>
<g data-part="efield" class="efield" data-p="spleten"></g>
<g data-part="beam" class="beam" data-p="protonen"></g>
<g data-part="dtext" data-p="detector"></g>
</g></svg>`;

const DATA = { P, FR, GAPS, TUBES, A_END, GAP, MM: M.MM_PER_UNIT, DET: [A_END + 96, 0, 0] };
const side = `
      <div class="action-row">
        <button class="btn-accent" id="run">Bundel aan</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Bundel uit</span></div>
        <div class="ctl"><div class="row"><span>Spanning per spleet U</span><b id="vU">50 kV</b></div><input type="range" id="u" min="20" max="80" step="1" value="50" aria-label="Spanning per spleet in kV"></div>
        <div class="ctl"><div class="row"><span>Frequentie f</span><b id="vF">10,0 MHz</b></div><input type="range" id="f" min="8" max="12" step="0.1" value="10" aria-label="Frequentie in MHz"></div>
        <div class="row"><span>Energie bij injectie</span><b>20 keV</b></div>
        <div class="row"><span>Energie in de detector</span><b id="rE">–</b></div>
        <div class="row"><span>Snelheid aan het eind</span><b id="rV">–</b></div>
        <div class="row"><span>Halve periode T/2</span><b id="rT">50 ns</b></div>
        <div class="eq">ΔE = q·U per spleet &nbsp;·&nbsp; L = v · T/2</div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps">
          <li><span>De sleepbuizen zijn afwisselend + en −. In een spleet duwt het elektrisch veld het proton van de + buis naar de − buis: het krijgt een energie q·U erbij.</span></li>
          <li><span>Binnenin een buis is er geen veld: het proton vliegt met constante snelheid verder.</span></li>
          <li><span>Terwijl het in de buis zit, keert de wisselspanning om. Daardoor staat ook de volgende spleet weer juist om te versnellen.</span></li>
          <li><span>Het proton gaat steeds sneller, dus elke buis is langer: in elke buis zit het precies een halve periode. Pas je U of f aan, dan loopt het uit de pas.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;
const legend = `
        <span><i style="background:#e8492f"></i>proton</span>
        <span><i class="bar" style="background:#d9776a"></i>buis positief</span>
        <span><i class="bar" style="background:#7b97d6"></i>buis negatief</span>
        <span><i class="bar" style="background:#3e63dd"></i>elektrisch veld in de spleet</span>`;
const css = `
  .s path{stroke-width:.45;stroke-linejoin:round}
  .floor>.iso-top{fill:#e9e6df}.floor>.iso-shade{fill:#d6d1c6}
  .v0,.v1{fill:#b7bdc4;stroke:#b7bdc4}.v2,.v3,.vt{fill:#d6dade;stroke:#d6dade}.xv{fill:#c5cad0;stroke:#c5cad0}
  .ta0,.ta1,.tb0,.tb1{fill:#b8733a;stroke:#b8733a}.ta2,.ta3,.tat,.tb2,.tb3,.tbt{fill:#cf8f59;stroke:#cf8f59}.xta,.xtb{fill:#d99a68;stroke:#d99a68}
  .tint{fill:#e8584a;stroke:none;mix-blend-mode:multiply}.tint[data-sign="-"]{fill:#4f78d6}
  .ins0,.ins1,.ins2,.ins3,.inst{fill:#e8e2d2;stroke:#e8e2d2}.xins{fill:#f2ede0;stroke:#f2ede0}
  .cu0,.cu1{fill:#b8733a;stroke:#b8733a}.cu2,.cu3,.cut{fill:#cf8f59;stroke:#cf8f59}.xcu{fill:#d99a68;stroke:#d99a68}
  .src0,.src1,.src2,.src3,.srct{fill:#5d7a9a;stroke:#5d7a9a}.xsrc{fill:#7f9ab8;stroke:#7f9ab8}
  .det0,.det1,.det2,.det3,.dett{fill:#4f5a66;stroke:#4f5a66}.xdet{fill:#6c7784;stroke:#6c7784}
  .tg0,.tg1,.tg2,.tg3,.tgt,.xtg{fill:#e0c36a;stroke:#e0c36a}
  .st0,.st1{fill:#8d949c;stroke:#8d949c}.st2,.st3,.stt{fill:#aeb5bd;stroke:#aeb5bd}
  .gen0,.gen1{fill:#cfd3d8;stroke:#cfd3d8}.gen2,.gen3,.gent{fill:#e6e8eb;stroke:#e6e8eb}
  .lh,.lm,.ll,.lf{fill:none;stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .lh{stroke:var(--anatomy-hi)}.lm{stroke:var(--anatomy-mid)}.ll{stroke:var(--anatomy-lo)}.lf{stroke:var(--anatomy-faint)}
  .dt{fill:var(--anatomy-dot);opacity:.6}
  .cable .tb-body{fill:#4d5866}.cable .tb-shine{fill:#7d8896}.cable .tb-shade{fill:#36404b}
  .cable.red .tb-body{fill:#b8453a}.cable.red .tb-shine{fill:#d8776c}.cable.red .tb-shade{fill:#8f2f27}
  .bezel{fill:#5b6573}.lcd{fill:#dfe9d2}.trace{fill:none;stroke:#2d5a3a;stroke-width:.8}.lcdtext{font-family:var(--font-mono);font-size:5px;fill:#2d5a3a}
  .knob{fill:#fffdf7;stroke:#1d2a3a;stroke-width:.6}
  .efield path{stroke:#3e63dd;stroke-width:1.6;fill:none;vector-effect:non-scaling-stroke}
  .beam circle{fill:url(#pGrad)}
  .fig{--ta:#cf8f59;--tax:#d99a68;--tb:#cf8f59;--tbx:#d99a68}
  .dlabel{font-family:var(--font-mono);font-size:12px;font-weight:600;fill:#8ff0a4;paint-order:stroke;stroke:#2b323b;stroke-width:3px}
`;
const PARTS = [
  { id: "bron", name: "Ionenbron", text: "Hier wordt waterstofgas geïoniseerd: de elektronen worden van de atomen losgemaakt en er blijven protonen over. Een eerste spanning schiet ze met 20 keV de versneller in.", fact: "proton: q = +e, m = 1,67·10⁻²⁷ kg" },
  { id: "sleepbuizen", name: "Sleepbuizen", text: "Holle koperen buizen. Binnenin een geleider is er geen elektrisch veld, dus het proton vliegt er met constante snelheid doorheen. Ze zijn afwisselend met de twee rails verbonden en worden steeds langer.", fact: "L = v · T/2" },
  { id: "spleten", name: "Spleten", text: "Alleen in de spleten tussen twee buizen staat een elektrisch veld. Daar krijgt het proton een duw: zijn energie groeit met q·U.", fact: "ΔE = q · U" },
  { id: "protonen", name: "Protonen", text: "Ze komen in pakketjes aan, één per periode van de wisselspanning: alleen protonen die op het juiste moment in een spleet zijn, worden versneld.", fact: "" },
  { id: "buis", name: "Vacuümbuis", text: "Een stalen buis waaruit de lucht is weggepompt. Anders zouden de protonen botsen met luchtmoleculen en hun energie meteen weer kwijt zijn.", fact: "" },
  { id: "voeding", name: "HF-generator en rails", text: "Een generator maakt een wisselspanning van 10 MHz. Via twee koperen rails krijgen de oneven en de even buizen telkens een tegengestelde lading.", fact: "T = 1 / f = 100 ns" },
  { id: "detector", name: "Doelwit en detector", text: "Aan het eind botsen de protonen op een doelwit. De detector meet hoeveel energie ze meebrengen.", fact: "" },
];
const page = pageHtml({
  title: "Lineaire versneller", h1: "Deeltjesversneller (lineair)", hue: 150, icon: "versneller", W, H, svg, legend, side, css,
  corners: { tl: "Wideröe-versneller · overlangs doorgesneden", bl: "tijd 9 miljoen keer vertraagd", br: "uit" },
  script: `${kitScript()}\n${readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "")}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
