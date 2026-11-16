// Bouwt ../../mri.dc.html: een MRI-scanner in halve doorsnede, met een fantoom (fles water) op de tafel.
//   node tools/mri/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../shared/iso-kit.mjs";
import * as G from "../shared/lathe.mjs";
import { painter } from "../shared/painter.mjs";
import { halfBody } from "../shared/revolve.mjs";
import { pageHtml, kitScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "mri.dc.html");
const W = 900, H = 580;
const AZ = 45, EL = 22, TILT = 30 * Math.PI / 180, RAD = Math.PI / 180;
const ZC = 170;

const a0 = AZ * RAD;
const right = [Math.sin(a0), -Math.cos(a0), 0], toward = [Math.cos(a0), Math.sin(a0), 0];
const ax = [right[0] * Math.cos(TILT) + toward[0] * Math.sin(TILT), right[1] * Math.cos(TILT) + toward[1] * Math.sin(TILT), 0];
const nv = [-right[0] * Math.sin(TILT) + toward[0] * Math.cos(TILT), -right[1] * Math.sin(TILT) + toward[1] * Math.cos(TILT), 0];
const back = [-nv[0], -nv[1], 0];
const FR = { o: [0, 0, ZC], ax, up: [0, 0, 1], back };
const L = (a, b, z) => [ax[0] * a + back[0] * b, ax[1] * a + back[1] * b, z];
const A0 = -260, A1 = 250;
const P = k.fitProjection([L(A0, -60, -12), L(A1, -60, -12), L(A0, 180, -12), L(A1, 180, -12), L(80, 0, ZC + 160), L(80, 160, ZC + 160), L(-40, 0, ZC + 160)], W, H, { pad: 14, azimuth: AZ, elevation: EL });
const S = painter(P);
const ring = (a0_, a1_, r0, r1) => [[a0_, r0], [a1_, r0], [a1_, r1], [a0_, r1]];

function lbox(Sx, a, b, z, cls, cell = 12) {
  const n = (x0, x1) => Math.max(1, Math.round((x1 - x0) / cell));
  Sx.patch((u, v) => L(a[1], b[0] + (b[1] - b[0]) * u, z[0] + (z[1] - z[0]) * v), n(...b), n(...z), { cls, toward: () => ax });
  Sx.patch((u, v) => L(a[0], b[0] + (b[1] - b[0]) * u, z[0] + (z[1] - z[0]) * v), n(...b), n(...z), { cls, toward: () => ax.map((x) => -x) });
  Sx.patch((u, v) => L(a[0] + (a[1] - a[0]) * u, b[0], z[0] + (z[1] - z[0]) * v), n(...a), n(...z), { cls, toward: () => nv });
  Sx.patch((u, v) => L(a[0] + (a[1] - a[0]) * u, b[0] + (b[1] - b[0]) * v, z[1]), n(...a), n(...b), { cls, toward: () => [0, 0, 1] });
}

// ------------------------------------------------------------ vloer
const back0 = [];
{
  const rg = [[A0, -60], [A1, -60], [A1, 180], [A0, 180]].map(([a, b]) => L(a, b, 0).slice(0, 2));
  back0.push(`<path class="iso-halo" d="${k.pathOf(rg.map(([x, y]) => k.iso([x, y, -12], P)), true)}"/>`);
  back0.push(k.solidSvg(k.extrude(rg, -12, 12, P, { bevel: 1.2 }), { tone: "hi", className: "floor" }));
  for (let a = A0 + 40; a < A1; a += 60) back0.push(k.lineSvg(k.pathOf([L(a, -60, 0), L(a, 180, 0)].map((p) => k.iso(p, P))), { tone: "faint" }));
}

// ------------------------------------------------------------ de magneet (van buiten naar binnen)
const LEN = 180;
S.setPart("behuizing");
halfBody(S, FR, ring(0, LEN, 152, 156), { cls: "cv", cut: "xcv", steps: 40 });
halfBody(S, FR, [[-6, 62], [0, 62], [0, 156], [-6, 150]], { cls: "cv", cut: "xcv", steps: 40 });
halfBody(S, FR, [[LEN, 62], [LEN + 6, 62], [LEN + 6, 150], [LEN, 156]], { cls: "cv", cut: "xcv", steps: 40 });
S.setPart("cryostaat");
for (const pr of [ring(8, LEN - 8, 82, 85), ring(8, LEN - 8, 143, 146), ring(8, 11, 85, 143), ring(LEN - 11, LEN - 8, 85, 143)]) halfBody(S, FR, pr, { cls: "st", cut: "xst", steps: 36 });
S.setPart("helium");
for (const pr of [ring(20, LEN - 20, 92, 94), ring(20, LEN - 20, 134, 136), ring(20, 22, 94, 134), ring(LEN - 22, LEN - 20, 94, 134)]) halfBody(S, FR, pr, { cls: "st", cut: "xst", steps: 36 });
halfBody(S, FR, ring(22, LEN - 22, 94, 134), { cls: "he", cut: "xhe", steps: 36, shells: false });
S.setPart("spoelen");
const MAIN = [32, 58, 80, 100, 122, 148];
for (const a of MAIN) halfBody(S, FR, ring(a - 6, a + 6, 100, 114), { shells: false, cut: "xsc", cutBias: 400 });
for (const a of [30, LEN - 30]) halfBody(S, FR, ring(a - 7, a + 7, 122, 130), { shells: false, cut: "xsc", cutBias: 400 });
// draaddoorsneden in de supergeleidende spoelen
for (const psi of [0, Math.PI]) for (const a of MAIN) for (let r = 101.5; r < 114; r += 3) for (let da = -4.5; da <= 4.5; da += 3) {
  S.dotAt([FR.o[0] + ax[0] * (a + da), FR.o[1] + ax[1] * (a + da), ZC + r * Math.cos(psi)], { n: nv, size: 0.7, tone: "lo", bias: 402 });
}
S.setPart("gradient");
halfBody(S, FR, ring(18, LEN - 18, 68, 78), { cls: "gr", cut: "xgr", steps: 36 });
for (const psi of [0, Math.PI]) for (let a = 24; a < LEN - 20; a += 8) S.dotAt([FR.o[0] + ax[0] * a, FR.o[1] + ax[1] * a, ZC + 73 * Math.cos(psi)], { n: nv, size: 0.8, tone: "lo", bias: 3 });
S.setPart("rf");
halfBody(S, FR, ring(40, LEN - 40, 64.5, 66.5), { cls: "rfc", cut: "xrf", steps: 36 });
for (let i = 0; i <= 12; i++) { const psi = Math.PI * i / 12; const p0 = [FR.o[0] + ax[0] * 40 + 64.4 * Math.sin(psi) * back[0], FR.o[1] + ax[1] * 40 + 64.4 * Math.sin(psi) * back[1], ZC + 64.4 * Math.cos(psi)]; const p1 = [p0[0] + ax[0] * (LEN - 80), p0[1] + ax[1] * (LEN - 80), p0[2]]; S.line([p0, p1], { tone: "lo", bias: 0.2 }); }
S.setPart("behuizing");
halfBody(S, FR, ring(-6, LEN + 6, 60, 62), { cls: "ln", cut: "xln", steps: 40 });

// ------------------------------------------------------------ tafel en fantoom
S.setPart("tafel");
const TZ = ZC - 44;
lbox(S, [-250, -40], [-40, 40], [0, TZ - 40], "tb", 16);
lbox(S, [-250, 150], [-34, 34], [TZ - 6, TZ], "tt", 16);
lbox(S, [-240, 140], [-38, -34], [TZ - 8, TZ + 2], "tr", 16);
S.setPart("fantoom");
const PH = { a0: 40, a1: 130, r: 30, z: TZ + 30 };
const PF = { o: [0, 0, PH.z], ax, up: [0, 0, 1], back };
halfBody(S, PF, [[PH.a0, 0], [PH.a0, PH.r], [PH.a1, PH.r], [PH.a1, 0]], { cls: "ph", cut: "xwa", steps: 30 });
halfBody(S, PF, [[PH.a0 - 4, 0], [PH.a0 - 4, PH.r + 1], [PH.a0, PH.r + 1], [PH.a0, 0]], { cls: "cp", cut: "xcp", steps: 30 });
// kunststof blok in het water: bevat geen waterstof in vrije watermoleculen, dus geen signaal
S.setPart("fantoom");
{
  const BX = { a: [74, 92], b: [0, 16], z: [-14, 14] };
  const Lp = (aa, bb, zz) => [PF.o[0] + ax[0] * aa + back[0] * bb, PF.o[1] + ax[1] * aa + back[1] * bb, PF.o[2] + zz];
  S.patch((u, v) => Lp(BX.a[0] + (BX.a[1] - BX.a[0]) * u, 0, BX.z[0] + (BX.z[1] - BX.z[0]) * v), 2, 3, { cls: "pb", toward: () => nv, bias: 30 });
  S.patch((u, v) => Lp(BX.a[0] + (BX.a[1] - BX.a[0]) * u, BX.b[1] * v, BX.z[1]), 2, 2, { cls: "pb", toward: () => [0, 0, 1], bias: 30 });
  S.patch((u, v) => Lp(BX.a[0], BX.b[1] * u, BX.z[0] + (BX.z[1] - BX.z[0]) * v), 2, 3, { cls: "pb", toward: () => ax.map((x) => -x), bias: 30 });
}

const svg = `<svg class="iso-svg base" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">MRI-scanner in doorsnede</title><desc id="d">Een MRI-scanner, overlangs doorgesneden. Rond de tunnel liggen van binnen naar buiten: de RF-spoel, de gradiëntspoelen, en een cryostaat met vloeibaar helium waarin de supergeleidende hoofdspoelen zitten. Op de tafel ligt een fantoom: een fles water. In het water zijn de spins van de waterstofkernen getekend.</desc>
<g class="fig"><g data-p="vloer">${back0.join("")}</g><g class="s">${S.render()}</g></g></svg>
<svg class="iso-svg overlay" viewBox="0 0 ${W} ${H}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arrS" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c8534a"/></marker>
<marker id="arrM" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1d2a3a"/></marker>
<marker id="arrB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1f7f86"/></marker></defs>
<g class="fig"><g data-part="rfglow" class="rfglow" data-p="rf" opacity="0"></g><path data-part="b0" class="b0" data-p="spoelen" d=""/><g data-part="spins" class="spins" data-p="fantoom"></g></g></svg>`;

const DATA = { P, FR, PF, PH, LEN, ZC };
const side = `
      <div class="action-row">
        <button class="btn-accent" id="pulse">RF-puls (90°)</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Spins in evenwicht langs B₀</span></div>
        <div class="row"><span>Hoofdveld B₀</span></div>
        <div class="toggles" id="field"><button data-b="1.5">1,5 T</button><button data-b="3">3 T</button></div>
        <div class="row"><span>Weefsel in het fantoom</span></div>
        <div class="toggles" id="tissue"><button data-t="water">water</button><button data-t="vet">vet</button><button data-t="grijs">grijze stof</button></div>
        <div class="row"><span>Larmorfrequentie f = γ·B₀</span><b id="rF">63,9 MHz</b></div>
        <div class="row"><span>Relaxatietijden T₁ / T₂</span><b id="rR">–</b></div>
        <div class="row"><span>Tijd na de puls</span><b id="rT">–</b></div>
      </div>
      <div class="panel-card">
        <div class="card-head">Beeldvorming</div>
        <div class="toggles"><button class="toggle" id="grad">Gradiëntveld aan</button></div>
        <svg id="prof" viewBox="0 0 300 150" style="width:100%;height:auto;display:block;background:#fbf8f1;border:1px solid var(--rule);border-radius:4px">
          <text x="10" y="14" font-family="IBM Plex Mono" font-size="10.5" fill="#1f7f86">veld B langs het fantoom</text>
          <path d="M20 60H290M20 20V60" stroke="#cfc6b3"/><path id="bLine" d="" fill="none" stroke="#1f7f86" stroke-width="2"/>
          <text x="10" y="84" font-family="IBM Plex Mono" font-size="10.5" fill="#c9822c">signaal per frequentie</text>
          <path d="M20 140H290" stroke="#cfc6b3"/><g id="bars"></g>
          <text id="fLow" x="20" y="150" font-family="IBM Plex Mono" font-size="9.5" fill="#4f5b69">lage f</text>
          <text x="290" y="150" font-family="IBM Plex Mono" font-size="9.5" fill="#4f5b69" text-anchor="end">hoge f</text>
        </svg>
        <div class="help" id="gradHelp">Zonder gradiënt hebben alle spins dezelfde larmorfrequentie: je meet één piek en weet niet waar het signaal vandaan komt.</div>
        <div class="row"><span>Beeld uit meetrichtingen</span><b id="vN">1</b></div>
        <input type="range" id="nproj" min="1" max="60" step="1" value="1" aria-label="Aantal meetrichtingen">
        <div style="display:flex;gap:12px;align-items:center">
          <canvas id="recon" width="96" height="96" style="width:132px;height:132px;border:1px solid var(--rule);border-radius:4px;background:#000"></canvas>
          <div class="help">Met de gradiënt in telkens een andere richting meet je het profiel vanuit veel hoeken. De computer telt ze terug op tot een doorsnede: water is licht, het kunststof blok en de lucht zijn donker.</div>
        </div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps">
          <li><span>In het sterke veld B₀ richten de spins van de waterstofkernen zich een beetje langs het veld en tollen er rond (precessie) met de larmorfrequentie f = γ·B₀.</span></li>
          <li><span>Een korte radiogolf met precies die frequentie (resonantie) kantelt ze 90°: ze draaien nu samen in het vlak loodrecht op B₀.</span></li>
          <li><span>Die draaiende magnetisatie wekt een spanning op in de RF-spoel: het MRI-signaal (inductie!).</span></li>
          <li><span>De gradiëntspoelen maken het veld een beetje plaatsafhankelijk: elke plaats zendt dan op een eigen frequentie. Zo krijgt het signaal een plaats. Elk weefsel keert in zijn eigen tempo terug (T₁, T₂): dat geeft het contrast in het beeld.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;
const legend = `
        <span><i class="bar" style="background:#c8534a"></i>spin van een waterstofkern</span>
        <span><i class="bar" style="background:#1f7f86"></i>hoofdveld B₀</span>
        <span><i class="bar" style="background:#9ec5e8"></i>vloeibaar helium (−269 °C)</span>
        <span><i class="bar" style="background:#c08a57"></i>supergeleidende spoel</span>`;
const css = `
  .s path{stroke-width:.45;stroke-linejoin:round}
  .floor>.iso-top{fill:#ebe8e1}.floor>.iso-shade{fill:#d8d3c8}
  .cv0,.cv1{fill:#d9dcdf;stroke:#d9dcdf}.cv2,.cv3,.cvt{fill:#f1f2f3;stroke:#f1f2f3}.xcv{fill:#e6e8ea;stroke:#e6e8ea}
  .st0,.st1{fill:#aeb5bd;stroke:#aeb5bd}.st2,.st3,.stt{fill:#c9ced4;stroke:#c9ced4}.xst{fill:#9aa2ab;stroke:#9aa2ab}
  .xhe{fill:#9ec5e8;stroke:#9ec5e8}.xsc{fill:#c08a57;stroke:#c08a57}
  .gr0,.gr1{fill:#7f9b86;stroke:#7f9b86}.gr2,.gr3,.grt{fill:#9bb5a2;stroke:#9bb5a2}.xgr{fill:#8aa894;stroke:#8aa894}
  .rfc0,.rfc1,.rfc2,.rfc3,.rfct{fill:#e9e5da;stroke:#e9e5da}.xrf{fill:#cf8f59;stroke:#cf8f59}
  .ln0,.ln1{fill:#e3e5e8;stroke:#e3e5e8}.ln2,.ln3,.lnt{fill:#f3f4f5;stroke:#f3f4f5}.xln{fill:#dfe2e5;stroke:#dfe2e5}
  .tb0,.tb1{fill:#c5cad0;stroke:#c5cad0}.tb2,.tb3,.tbt{fill:#dde0e3;stroke:#dde0e3}
  .tt0,.tt1,.tt2,.tt3{fill:#5d7a9a;stroke:#5d7a9a}.ttt{fill:#7f9ab8;stroke:#7f9ab8}
  .tr0,.tr1,.tr2,.tr3,.trt{fill:#9aa2ab;stroke:#9aa2ab}
  .ph0,.ph1,.ph2,.ph3,.pht{fill:#cfe3f0;stroke:#cfe3f0}.xwa{fill:#b7d5ee;stroke:#b7d5ee}
  .cp0,.cp1,.cp2,.cp3,.cpt,.xcp{fill:#3f4650;stroke:#3f4650}
  .pb0,.pb1,.pb2,.pb3,.pbt{fill:#e9e2cf;stroke:#e9e2cf}.pbt{fill:#f4efe2;stroke:#f4efe2}
  .lh,.lm,.ll,.lf{fill:none;stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
  .lh{stroke:var(--anatomy-hi)}.lm{stroke:var(--anatomy-mid)}.ll{stroke:var(--anatomy-lo)}.lf{stroke:var(--anatomy-faint)}
  .dt{fill:var(--anatomy-dot);opacity:.6}.dt[data-tone="lo"]{fill:#6b4423;opacity:.55}
  .spins path{fill:none;stroke:#c8534a;stroke-width:1.5;stroke-linecap:round;vector-effect:non-scaling-stroke}
  .spins path.cone{stroke:#c8534a;stroke-width:.6;opacity:.35;stroke-dasharray:2 2}
  .spins path.net{stroke:#1d2a3a;stroke-width:2.6}
  .b0{fill:none;stroke:#1f7f86;stroke-width:2;stroke-dasharray:6 5;vector-effect:non-scaling-stroke}
  .rfglow path{fill:none;stroke:#e0a020;stroke-width:2;vector-effect:non-scaling-stroke}
`;
const PARTS = [
  { id: "spoelen", name: "Supergeleidende spoelen", text: "De hoofdspoelen maken het sterke, homogene veld B₀ in de tunnel. Ze zijn gewikkeld uit niobium-titaandraad, dat onder −264 °C supergeleidend is: zonder weerstand blijft de stroom eeuwig rondlopen, ook zonder voeding. De buitenste spoelen schermen het veld buiten de scanner af.", fact: "B₀ = 1,5 T of 3 T: 30 000 tot 60 000 keer het aardmagnetisch veld" },
  { id: "helium", name: "Vloeibaar helium", text: "De spoelen liggen in een bad van vloeibaar helium van −269 °C (4 K). Alleen zo blijven ze supergeleidend.", fact: "kookpunt helium: 4,2 K" },
  { id: "gradient", name: "Gradiëntspoelen", text: "Drie extra spoelen die het veld in de x-, y- of z-richting een beetje laten toenemen. Dan heeft elke plaats een iets andere larmorfrequentie, en kan de computer uit het signaal afleiden waar het vandaan komt. Ze schakelen heel snel: daarom maakt een MRI zo'n lawaai (lorentzkracht op de spoelen).", fact: "" },
  { id: "rf", name: "RF-spoel", text: "Een antenne vlak rond de tunnel. Ze zendt de korte radiopuls met de larmorfrequentie uit en vangt daarna het zwakke signaal van de draaiende spins op.", fact: "1,5 T → 63,9 MHz, ongeveer de frequentie van FM-radio" },
  { id: "fantoom", name: "Fantoom", text: "Een fles water om de scanner mee te testen. Elk watermolecule heeft twee waterstofkernen (protonen); hun spin maakt van elk een minimagneetje.", fact: "γ / 2π = 42,58 MHz per tesla (proton)" },
];
const page = pageHtml({
  title: "MRI-scanner", h1: "MRI-scanner", hue: 150, icon: "mri", W, H, svg, legend, side, css,
  corners: { tl: "overlangs doorgesneden", bl: "precessie sterk vertraagd", br: "evenwicht" },
  script: `${kitScript()}\nconst DATA = ${JSON.stringify(DATA)};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
