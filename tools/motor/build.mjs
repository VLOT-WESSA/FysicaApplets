// Bouwt ../../electromotor.dc.html: een gelijkstroommotor op een plankje (spoel, hoefijzermagneet, commutator).
//   node tools/motor/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pageHtml, kitScript, moduleScript, PARTS_CARD, PARTS_SCRIPT } from "../shared/shell.mjs";
import { W, H, D, projection, buildScene, SCENE_CSS, DEFS } from "./scene.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "electromotor.dc.html");
const P = projection();
const scene = buildScene(P, { box: "voeding" });

const svg = `<svg class="iso-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d" xmlns="http://www.w3.org/2000/svg"><title id="t">Gelijkstroommotor</title><desc id="d">Een gelijkstroommotor op een plankje. Een rechthoekige spoel draait om een as tussen de noord- en de zuidpool van een hoefijzermagneet. Vooraan op de as zit de commutator: twee halve koperen ringen waar twee koolborstels tegen slepen. Snoeren verbinden de borstels met een voeding.</desc>
${DEFS}
<g class="fig" data-mag="1">${scene.back}<g data-part="rotor" class="s"></g>${scene.front}<g data-part="over"></g></g></svg>`;

const side = `
      <div class="action-row">
        <button class="btn-accent" id="run">Inschakelen</button>
        <button class="btn-secondary" id="reset">Reset</button>
      </div>
      <div class="panel-card">
        <div class="status"><i id="dot"></i><span id="status">Motor staat stil</span></div>
        <div class="ctl"><div class="row"><span>Spanning van de voeding U</span><b id="vU">6,0 V</b></div><input type="range" id="u" min="0" max="12" step="0.5" value="6" aria-label="Spanning in volt"></div>
        <div class="help">Meer spanning: grotere stroom, grotere kracht, sneller draaien.</div>
        <div class="toggles"><button class="toggle" id="pol">Polariteit bron omkeren</button><button class="toggle" id="mag">Magneet omkeren (<span id="magLabel">N links</span>)</button></div>
        <div class="row"><span>Stroom I</span><b id="rI">0,00 A</b></div>
        <div class="row"><span>Toerental</span><b id="rN">0 /min</b></div>
        <div class="row"><span>Hoek van de spoel</span><b id="rA">–</b></div>
      </div>
      <div class="panel-card">
        <div class="card-head">Lagen (uit bij de start)</div>
        <div class="toggles"><button class="toggle" id="tField">Magneetveld</button><button class="toggle" id="tCur">Stroomzin</button><button class="toggle" id="tForce">Lorentzkracht</button></div>
        <div class="help">Rechterhandregel: wijsvinger volgens de stroom I, middelvinger volgens het veld B, dan wijst de duim de kracht F aan.</div>
        <div class="eq">F = B · I · ℓ</div>
      </div>
      <div class="panel-card">
        <div class="card-head">Hoe werkt het?</div>
        <ol class="steps" id="steps">
          <li><span>De voeding stuurt een stroom via de koolborstels en de commutator door de spoel.</span></li>
          <li><span>De twee lange zijden van de spoel liggen in het magneetveld. Op de ene werkt een lorentzkracht omhoog, op de andere omlaag: samen laten ze de spoel draaien.</span></li>
          <li><span>Staat de spoel verticaal, dan zouden de krachten haar alleen nog uitrekken. Net dan schuiven de spleten van de commutator onder de borstels: even geen stroom, de spoel draait door op haar vaart.</span></li>
          <li><span>Elke borstel raakt nu de andere helft van de commutator. De stroom in de spoel is omgekeerd, zodat de krachten in dezelfde draaizin blijven duwen.</span></li>
        </ol>
      </div>
${PARTS_CARD}`;

const legend = `
        <span><i class="bar" style="background:#c8534a"></i>noordpool</span>
        <span><i class="bar" style="background:#4a74c8"></i>zuidpool</span>
        <span><i class="bar" style="background:#1f7f86"></i>magnetisch veld (van N naar Z)</span>
        <span><i class="bar" style="background:#e0a020"></i>stroomzin</span>
        <span><i class="bar" style="background:#a3302a"></i>lorentzkracht</span>
        <span><i class="bar" style="background:#b8733a"></i>koper</span>`;

const PARTS = [
  { id: "magneet", name: "Hoefijzermagneet", text: "Een permanente magneet in U-vorm. Tussen de noordpool en de zuidpool staat een bijna homogeen magneetveld, van noord naar zuid. Daarin draait de spoel.", fact: "het veld staat er altijd, ook zonder stroom" },
  { id: "spoel", name: "Spoel", text: "Een rechthoekige winding van koperdraad die om de as kan draaien. Alleen op de twee lange zijden, die loodrecht op het veld liggen, werkt een kracht die de spoel doet draaien. In een echte motor telt de spoel veel windingen: dat vermenigvuldigt de kracht.", fact: "F = B · I · ℓ op elke lange zijde" },
  { id: "commutator", name: "Commutator", text: "Twee halve koperen ringen op de as, gescheiden door twee spleten. Elk uiteinde van de spoel zit vast aan één helft. Bij elke halve omwenteling wisselen de helften van borstel: zo keert de stroom in de spoel om, precies wanneer de spoel verticaal staat.", fact: "keert de stroom twee keer per omwenteling om" },
  { id: "borstels", name: "Koolborstels", text: "Twee blokjes koolstof die tegen de commutator slepen. Ze staan stil en brengen de stroom over naar de draaiende spoel. Koolstof geleidt goed en slijt zacht, zonder het koper te beschadigen.", fact: "sleepcontact tussen stilstaand en draaiend deel" },
  { id: "as", name: "As en lagers", text: "De spoel en de commutator zitten vast op een as, die in twee lagers kan draaien. Aan deze as zou je het werktuig koppelen dat de motor moet aandrijven.", fact: "" },
  { id: "voeding", name: "Voeding", text: "Een gelijkspanningsbron met regelbare spanning. Wissel je de plus- en de minklem, dan loopt de stroom andersom door de spoel en draait de motor in de andere zin.", fact: "I = U / R, met R = 2,4 Ω" },
  { id: "draden", name: "Snoeren", text: "Ze verbinden de klemmen van de voeding met de twee borstelhouders. Met de laag Stroomzin zie je de conventionele stroom lopen, van de plusklem door de motor naar de minklem.", fact: "" },
];

const page = pageHtml({
  title: "Gelijkstroommotor", h1: "Gelijkstroommotor", hue: 150, icon: "electromotor", W, H, svg, legend, side, css: SCENE_CSS,
  corners: { tl: "één winding getekend", bl: "klik op een onderdeel voor uitleg", br: "uit" },
  script: `${kitScript()}\n${moduleScript("painter.mjs", "PA", "const k = { iso, cameraOf };")}\nconst DATA = ${JSON.stringify({ P, D })};\nconst PARTS = ${JSON.stringify(PARTS)};\n${PARTS_SCRIPT}\n${readFileSync(join(HERE, "rotor.js"), "utf8")}\n${readFileSync(join(HERE, "live.js"), "utf8")}`,
});
writeFileSync(OUT, page);
console.log("wrote", OUT, (page.length / 1024).toFixed(0) + " KB");
