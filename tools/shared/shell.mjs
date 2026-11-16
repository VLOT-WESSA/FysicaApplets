// Gedeelde paginaschil voor de getekende applets (huisstijl: ruitjespapier, inkt, harde schaduw).
import * as k from "./iso-kit.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const kitScript = () => readFileSync(join(HERE, "iso-kit.mjs"), "utf8").replace(/^export /gm, "").split("</script").join("<\\/script");

export const BASE_CSS = `
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;height:100%}
  a{color:var(--muted)} a:hover{color:var(--ink)}
  button{font-family:inherit}
  .applet-root{font-family:var(--font-body);color:var(--ink);height:100vh;display:flex;flex-direction:column;padding:16px 22px 18px;overflow:hidden}
  .top{display:flex;align-items:baseline;gap:14px;flex:none;margin-bottom:12px;flex-wrap:wrap}
  .back{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:500;color:var(--muted);text-decoration:none}
  h1{font-size:22px;font-weight:700;margin:0;letter-spacing:-.01em}
  .applet-main{flex:1;display:flex;gap:18px;min-height:0;align-items:stretch}
  .left{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:12px}
  .stage{position:relative;flex:1;min-height:0;background:var(--stage);border:1px solid var(--ink);border-radius:4px;padding:8px;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;overflow:hidden}
  .stage svg{width:100%;height:100%;max-width:1400px;display:block}
  .stage svg.overlay{position:absolute;inset:8px;width:calc(100% - 16px);height:calc(100% - 16px);margin:auto;pointer-events:none}
  .stage svg.overlay [data-p]{pointer-events:auto}
  .stage svg.base{will-change:transform}
  .corner{position:absolute;font-family:var(--font-mono);font-size:12px;color:var(--muted);pointer-events:none}
  .corner.tl{top:10px;left:12px}.corner.tr{top:10px;right:12px}.corner.bl{bottom:10px;left:12px}.corner.br{bottom:10px;right:12px;color:var(--ink)}
  .legend{flex:none;background:var(--card);border:1px solid var(--ink);border-radius:4px;box-shadow:var(--shadow);padding:9px 14px;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:var(--ink-2)}
  .legend span{display:inline-flex;align-items:center;gap:7px}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:50%}
  .legend i.bar{width:18px;height:4px;border-radius:2px}
  .legend .off{opacity:.45}
  .side{flex:none;width:358px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding:0 4px 4px 0}
  .action-row button{padding:10px 14px;font-size:14px}
  .btn-ink{background:var(--ink);color:#fff;border:1px solid var(--ink);border-radius:4px;font-weight:600;cursor:pointer}
  .btn-ink:hover{background:#2c3b4f}
  .row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:13px;color:var(--muted)}
  .row b{font-family:var(--font-mono);font-weight:500;font-size:14px;color:var(--ink);text-align:right;white-space:nowrap}
  .status{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600}
  .status i{width:12px;height:12px;border-radius:50%;flex:none;background:#9aa1a9}
  .side button{transition:none !important}
  .toggles{display:flex;gap:8px;flex-wrap:wrap}
  .toggles button{padding:8px 12px;font-size:13px;min-height:36px}
  .ctl{display:flex;flex-direction:column;gap:6px}
  .ctl .row span{color:var(--ink-2)}
  .ctl input{width:100%}
  .steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;counter-reset:st}
  .steps li{counter-increment:st;display:grid;grid-template-columns:22px 1fr;gap:8px;font-size:13px;line-height:1.45;color:var(--ink-2);padding:6px 8px;border:1px solid transparent;border-radius:4px}
  .steps li::before{content:counter(st);font-family:var(--font-mono);font-weight:600;font-size:12px;width:20px;height:20px;border-radius:50%;border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;color:var(--muted);background:#fff}
  .steps li[data-on]{border-color:var(--ink);background:var(--accent-soft);color:var(--ink)}
  .steps li[data-on]::before{background:var(--accent);border-color:var(--accent);color:#fff}
  .parts{display:flex;flex-wrap:wrap;gap:6px}
  .parts button{padding:6px 10px;font-size:13px;min-height:34px}
  .info{border-top:1px solid #efe9dd;padding-top:10px;display:flex;flex-direction:column;gap:6px}
  .info-name{font-family:var(--font-display);font-weight:700;font-size:15px}
  .info-text{font-size:13px;line-height:1.5;color:var(--ink-2)}
  .info-fact{font-family:var(--font-mono);font-size:12.5px;color:var(--ink);background:#f6f1e6;border:1px solid var(--rule);border-radius:4px;padding:6px 9px}
  .info-fact:empty{display:none}
  .eq{font-family:var(--font-mono);font-size:13px;color:var(--ink);background:#f6f1e6;border:1px solid var(--rule);border-radius:4px;padding:7px 10px;text-align:center}
  .iso[data-theme="light"]{
    --anatomy-paper:#fbf8f1;--anatomy-face:#fffdf7;--anatomy-top:#fffdf7;
    --anatomy-shade-0:#d6d0c2;--anatomy-shade-1:#e2ddd1;--anatomy-shade-2:#ebe6dc;--anatomy-shade-3:#f4f0e7;
    --anatomy-lit-top:#fffdf7;--anatomy-lit-shade:#efeadf;
    --anatomy-hi:#1d2a3a;--anatomy-mid:#6e7783;--anatomy-lo:#a3a6a6;--anatomy-faint:#cfc9bc;--anatomy-lit:#1d2a3a;
    --anatomy-halo:#8a826f;--anatomy-halo-opacity:.3;--anatomy-dot:#1d2a3a;--anatomy-weight:.7px;
    --anatomy-mono:'IBM Plex Mono',ui-monospace,monospace;
  }
  /* gekozen onderdeel: de rest wordt bleek papier, het onderdeel krijgt de onderwerptint */
  #stage svg [data-p]{cursor:pointer}
  #stage[data-sel] .fig g[data-p]:not(.sel),#stage[data-sel] .fig circle[data-p]:not(.sel){opacity:.22}
  #stage[data-sel] .fig path[data-p]:not(.sel):not([class^="l"]){fill:#f7f3ea;stroke:#f7f3ea}
  #stage[data-sel] .fig path[data-p][class^="l"]:not(.sel){stroke:#d9d2c3}
  #stage[data-sel] .fig path[data-p].sel[class^="l"]{stroke:oklch(0.38 0.1 var(--h))}
  #stage[data-sel] .fig .sel :is(.iso-top,.iso-fill){fill:oklch(0.95 0.035 var(--h))}
  #stage[data-sel] .fig .sel .iso-shade{fill:oklch(0.86 0.06 var(--h))}
  #stage[data-sel] .fig .sel :is(.tb-body,.tb-shade){fill:oklch(0.82 0.07 var(--h))}
  #stage[data-sel] .fig .sel .tb-shine{fill:oklch(0.93 0.04 var(--h))}
  #stage[data-sel] .fig .sel :is(.iso-edge,.iso-line[data-tone="hi"]){stroke:oklch(0.38 0.1 var(--h))}
  @media(max-width:760px){
    html,body{height:auto}
    .applet-root{height:auto;min-height:100vh;overflow:visible;padding:12px 14px 22px}
    .applet-main{flex-direction:column}
    .applet-main>*{width:100% !important;flex:0 0 auto !important;min-width:0 !important;overflow:visible !important}
    .stage{aspect-ratio:var(--aspect);flex:none}
    .corner.bl,.corner.tr{display:none}
  }
`;

// Kaart met onderdelen + uitleg; de live code vult de knoppen (partsScript).
export const PARTS_CARD = `
      <div class="panel-card">
        <div class="card-head">Onderdelen</div>
        <div class="help">Kies een onderdeel of klik erop in de tekening.</div>
        <div class="parts" id="parts" role="group" aria-label="Onderdelen"></div>
        <div class="info" aria-live="polite">
          <div class="info-name" id="infoName">Niets gekozen</div>
          <div class="info-text" id="infoText">Elk onderdeel licht op in de tekening, met uitleg over wat het doet.</div>
          <div class="info-fact" id="infoFact"></div>
        </div>
      </div>`;

export const PARTS_SCRIPT = `
// Zet een CSS-variabele alleen als de waarde verandert (een gewijzigde variabele herberekent de hele tekening).
const __vars = new WeakMap();
function setVar(el, name, val) {
  let m = __vars.get(el); if (!m) { m = {}; __vars.set(el, m); }
  if (m[name] === val) return; m[name] = val; el.style.setProperty(name, val);
}
// Toestand van een schakelknop, ook inline: applet-core.js leest de inline kleur om aria-pressed te bepalen.
let ACCENT_RGB = null;
function accentRgb() {
  if (ACCENT_RGB) return ACCENT_RGB;
  const h = getComputedStyle(document.documentElement).getPropertyValue("--h").trim() || "150";
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const x = c.getContext("2d"); x.fillStyle = "oklch(0.5 0.12 " + h + ")"; x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1).data;
  return (ACCENT_RGB = "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")");
}
function pressBtn(b, on) {
  b.setAttribute("aria-pressed", String(on));
  b.style.background = on ? accentRgb() : "rgb(255,255,255)";
  b.style.color = on ? "rgb(255,255,255)" : "rgb(79,91,105)";
  b.style.borderColor = on ? accentRgb() : "";
}
function setupParts(PARTS, svg, onSelect) {
  const stage = document.getElementById("stage"), box = document.getElementById("parts"), btns = {};
  let current = null;
  const put = (id, t) => { const n = document.getElementById(id); if (n.textContent !== t) n.textContent = t; };
  function select(id) {
    current = id;
    stage.querySelectorAll(".sel").forEach((n) => n.classList.remove("sel"));
    for (const k in btns) pressBtn(btns[k], k === id);
    const p = PARTS.find((q) => q.id === id);
    if (p) {
      stage.setAttribute("data-sel", id);
      stage.querySelectorAll('[data-p="' + id + '"]').forEach((n) => n.classList.add("sel"));
      put("infoName", p.name); put("infoText", p.text); put("infoFact", p.fact || "");
    } else {
      stage.removeAttribute("data-sel");
      put("infoName", "Niets gekozen"); put("infoText", "Elk onderdeel licht op in de tekening, met uitleg over wat het doet."); put("infoFact", "");
    }
    if (onSelect) onSelect(id);
  }
  for (const p of PARTS) {
    const b = document.createElement("button");
    b.className = "toggle"; b.textContent = p.name; pressBtn(b, false);
    b.addEventListener("click", () => select(current === p.id ? null : p.id));
    box.appendChild(b); btns[p.id] = b;
  }
  stage.addEventListener("click", (ev) => {
    const hit = ev.target.closest("[data-p]"); const id = hit && hit.getAttribute("data-p");
    if (id && btns[id]) select(current === id ? null : id);
  });
  return { select, get current() { return current; } };
}
`;

export function pageHtml({ title, h1, hue, icon, W, H, svg, corners = {}, legend = "", side = "", css = "", script = "" }) {
  const c = (pos) => corners[pos] ? `<div class="corner ${pos}"${pos === "br" ? ' id="cornerRead"' : ""}>${corners[pos]}</div>` : "";
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Natuurkunde simulaties</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="icons/${icon}.svg">
<link rel="stylesheet" href="applet.css?v=4">
<style>:root{--h:${hue};--aspect:${W}/${H}}</style>
<style>${k.ISO_CSS}</style>
<style>${BASE_CSS}${css}</style>
</head>
<body>
<div class="applet-root">
  <div class="top">
    <a class="back" href="index.html">&larr; Alle simulaties</a>
    <h1>${h1}</h1>
  </div>
  <div class="applet-main">
    <div class="left">
      <div class="stage iso" data-theme="light" id="stage">
        ${svg}
        ${c("tl")}${c("tr")}${c("bl")}${c("br")}
      </div>
      <div class="legend" aria-label="Legenda">${legend}</div>
    </div>
    <div class="side">${side}
    </div>
  </div>
</div>
<script src="./applet-core.js?v=8"></script>
<script>
${script}
</script>
</body>
</html>
`;
}

// Een gedeelde module als naamruimte in de pagina: const NS = (() => { …; return { export1, … }; })();
// Afhankelijkheden van de kit (iso, cameraOf, pathOf …) zijn globaal; die import-regels vallen weg.
export function moduleScript(file, ns, prelude = "") {
  const src = readFileSync(join(HERE, file), "utf8");
  const names = [...src.matchAll(/^export (?:async )?(?:function\*?|const|let|class) ([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const body = src.replace(/^import .*$/gm, "").replace(/^export /gm, "");
  return `const ${ns} = (() => {\n${prelude}\n${body}\nreturn { ${names.join(", ")} };\n})();`;
}
