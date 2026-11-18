// Bouwt ../../generator.dc.html: een generator op een plankje, met dezelfde tekening als de gelijkstroommotor.
//   node tools/generator/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pageHtml, kitScript, moduleScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";
import { W, H, D, projection, buildScene, SCENE_CSS, DEFS } from "../motor/scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "generator.dc.html");
const P = projection();
const scene = buildScene(P, { box: "meter" });

const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Generator</title><desc id="d">Een generator op een plankje. Een zwengel draait een rechthoekige spoel rond tussen de noord- en de zuidpool van een hoefijzermagneet. Vooraan op de as zitten twee sleepringen of een commutator waar twee koolborstels tegen slepen. Snoeren verbinden de borstels met een meter.</desc>
${DEFS}
<g class="fig" data-mag="1">${scene.back}<g data-part="rotor" class="s"></g>${scene.front}<g data-part="crank" class="s"></g><g data-part="over"></g></g></svg>`;

const scope = (id, col, titleId, title) => `
        <div class="row"><span id="${titleId}">${title}</span></div>
        <svg viewBox="0 0 300 110" style="width:100%;height:auto;display:block;background:#fbf8f1;border:1px solid var(--rule);border-radius:4px">
          <g stroke="#e9e2d2" stroke-width="1">${Array.from({ length: 5 }, (_, i) => `<path d="M${15 + i * 67.5} 8V102"/>`).join("")}<path d="M15 11H285M15 99H285"/></g>
          <path d="M15 55H285" stroke="#cfc6b3" stroke-width="1"/>
          <path id="${id}" d="" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
          <text x="18" y="20" font-family="IBM Plex Mono" font-size="11" fill="#4f5b69">+max</text>
          <text x="18" y="97" font-family="IBM Plex Mono" font-size="11" fill="#4f5b69">−max</text>
          <text x="282" y="97" font-family="IBM Plex Mono" font-size="11" fill="#4f5b69" text-anchor="end">laatste 4 s</text>
        </svg>`;

const side = `
      <div class="action-row">
        <button class="btn-ink" id="run">Pauze</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">–</span></div>
        <div class="ctl"><div class="row"><span>Aantal windingen N</span><b id="vN">100</b></div><input type="range" id="n" min="10" max="500" step="10" value="100" aria-label="Aantal windingen"></div>
        <div class="ctl"><div class="row"><span>Magnetische inductie B</span><b id="vB">0,40 T</b></div><input type="range" id="b" min="0.05" max="1" step="0.05" value="0.4" aria-label="Magnetische inductie in tesla"></div>
        <div class="ctl"><div class="row"><span>Oppervlakte van de spoel A</span><b id="vA">100 cm²</b></div><input type="range" id="a" min="10" max="200" step="5" value="100" aria-label="Oppervlakte in vierkante centimeter"></div>
        <div class="ctl"><div class="row"><span>Frequentie f (omwentelingen per seconde)</span><b id="vF">0,5 Hz</b></div><input type="range" id="f" min="0.2" max="3" step="0.1" value="0.5" aria-label="Frequentie in hertz"></div>
        <div class="row"><span>Aansluiting</span></div>
        <div class="toggles" id="mode"><button data-m="rings">sleepringen</button><button data-m="comm">commutator</button></div>
        <div class="toggles"><button class="toggle" id="tField">Magneetveld</button><button class="toggle" id="tCur">Zin van de inductiestroom</button></div>
      </div>
      <div class="panel-card">
        <div class="row"><span>Hoeksnelheid ω = 2π·f</span><b id="rW">–</b></div>
        <div class="row"><span>Maximale flux N·B·A</span><b id="rPhi">–</b></div>
        <div class="row"><span>Topspanning U<sub>max</sub> = N·B·A·ω</span><b id="rUmax">–</b></div>
        <div class="row"><span>Spanning nu</span><b id="rU">–</b></div>
        <div class="eq">Φ = B·A·cos(ωt) &nbsp;·&nbsp; U = N·B·A·ω·sin(ωt)</div>
      </div>
      <div class="panel-card">
        <div class="card-head">Flux en spanning</div>
        ${scope("gPhi", "#1f7f86", "gPhiTitle", "Flux N·Φ door de spoel")}
        ${scope("gU", "#c9822c", "gUtitle", "Inductiespanning U (wisselspanning)")}
        <div class="help">De spanning is nul waar de flux maximaal is, en maximaal waar de flux door nul gaat: daar verandert de flux het snelst.</div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps">
          <li><span>Je draait aan de zwengel: de spoel draait rond in het magneetveld.</span></li>
          <li><span>De flux door de spoel verandert voortdurend. Ze is maximaal als de spoel loodrecht op het veld staat en nul als de spoel evenwijdig met het veld ligt.</span></li>
          <li><span>Een veranderende flux wekt een inductiespanning op: U = −N·ΔΦ/Δt. Ze is het grootst waar de flux het snelst verandert.</span></li>
          <li><span>Sleepringen geven die wisselspanning ongewijzigd door. Een commutator keert elke halve omwenteling de aansluiting om: de spanning houdt dan hetzelfde teken (pulserende gelijkspanning).</span></li>
        </ol>
      </div>
${PARTS_CARD}`;

const legend = `
        <span><i class="bar" style="background:#c8534a"></i>noordpool</span>
        <span><i class="bar" style="background:#4a74c8"></i>zuidpool</span>
        <span><i class="bar" style="background:#1f7f86"></i>magnetisch veld (van N naar Z)</span>
        <span><i class="bar" style="background:#e0a020"></i>inductiestroom</span>
        <span><i class="bar" style="background:#b8733a"></i>koper</span>`;

const PARTS = [
  { id: "magneet", name: "Hoefijzermagneet", text: "Een permanente magneet in U-vorm. Tussen de noordpool en de zuidpool staat een bijna homogeen magneetveld, van noord naar zuid. Hoe sterker het veld, hoe groter de flux door de spoel en hoe groter de spanning.", fact: "Φ = B · A · cos(ωt)" },
  { id: "spoel", name: "Spoel", text: "Een rechthoekige spoel met N windingen (getekend als één lus) die in het veld ronddraait. In elke winding wekt de veranderende flux dezelfde spanning op; de N windingen staan in serie, dus hun spanningen tellen op.", fact: "U = −N · ΔΦ / Δt" },
  { id: "commutator", name: "Sleepringen of commutator", text: "Sleepringen zijn twee volle koperen ringen, elk verbonden met één uiteinde van de spoel: de borstels krijgen de wisselspanning van de spoel. Een commutator is één ring in twee helften: bij elke halve omwenteling wisselen de helften van borstel, zodat de spanning aan de borstels altijd hetzelfde teken heeft.", fact: "sleepringen: wisselspanning · commutator: pulserende gelijkspanning" },
  { id: "borstels", name: "Koolborstels", text: "Twee blokjes koolstof die tegen de draaiende ringen slepen. Ze staan stil en nemen de spanning van de draaiende spoel af.", fact: "sleepcontact tussen draaiend en stilstaand deel" },
  { id: "as", name: "As, lagers en zwengel", text: "De spoel zit vast op een as die in twee lagers draait. Met de zwengel lever je arbeid: de generator zet bewegingsenergie om in elektrische energie. In een centrale doet een turbine dat.", fact: "sneller draaien: grotere ω, dus grotere spanning én hogere frequentie" },
  { id: "meter", name: "Meter", text: "Een voltmeter met het nulpunt in het midden. Bij sleepringen slaat de naald beurtelings naar links en naar rechts uit; bij een commutator alleen naar één kant.", fact: "" },
  { id: "draden", name: "Snoeren", text: "Ze verbinden de borstelhouders met de meter. Met de laag Zin van de inductiestroom zie je de stroom lopen; bij sleepringen keert hij telkens om.", fact: "" },
];

const page = pageHtml({
  title: "Generator", h1: "Generator", hue: 150, icon: "generator", W, H, svg, legend, side, css: SCENE_CSS,
  corners: { tl: "N windingen als één lus getekend", bl: "klik op een onderdeel voor uitleg", br: "stil" },
  script: `${kitScript()}\n${moduleScript("painter.mjs", "PA", "const k = { iso, cameraOf };")}\nconst DATA = ${JSON.stringify({ P, D })};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "..", "motor", "rotor.js"), "utf8")}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
