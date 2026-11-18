// Levend deel: het 0D-model (model.mjs, hierboven ingevoegd) drijft plasma, deeltjes, meter en panelen.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const liveG = svg.querySelector('[data-part="live"]');
  const needle = svg.querySelector('[data-part="needle"]');
  const fieldPath = svg.querySelector('[data-part="field"]');
  const layers = [...svg.querySelectorAll(".pl")];
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";
  const P = DATA.P;
  const TAU = Math.PI * 2;
  const TIME = 2; // het plasma loopt 2x sneller dan in het echt

  // camera, gelijk aan iso() van de kit
  const a = P.azimuth * Math.PI / 180, e = P.elevation * Math.PI / 180;
  const sA = Math.sin(a), cA = Math.cos(a), sE = Math.sin(e), cE = Math.cos(e), K = DATA.K;
  const iso = ([x, y, z]) => [P.origin[0] + (x * sA - y * cA) * K, P.origin[1] + ((x * cA + y * sA) * sE - z * cE) * K];
  const dPoint = (r, th) => {
    const kz = r <= DATA.A ? DATA.KAPPA * r : DATA.KAPPA * DATA.A + (r - DATA.A);
    const tri = r <= DATA.A ? DATA.DELTA * (r / DATA.A) : DATA.DELTA * (DATA.A / r);
    return [DATA.R0 + r * Math.cos(th + tri * Math.sin(th)), kz * Math.sin(th)];
  };
  const torus = (rho, th, phi) => { const [R, Z] = dPoint(rho * DATA.A, th); return [R * Math.cos(phi), R * Math.sin(phi), Z]; };
  const smooth = (a0, a1, x) => { const t = Math.min(1, Math.max(0, (x - a0) / (a1 - a0))); return t * t * (3 - 2 * t); };
  const EDGE = 9 * Math.PI / 180;
  const sectorFade = (phi) => smooth(DATA.PHI1, DATA.PHI1 + EDGE, phi) * smooth(DATA.PHI2, DATA.PHI2 - EDGE, phi);
  const span = DATA.PHI2 - DATA.PHI1;
  const wrap = (phi) => DATA.PHI1 + ((((phi - DATA.PHI1) % span) + span) % span);

  // ------------------------------------------------------------ toestand
  const DEF = { Pheat: 50, n: 1, B: 5.3 };
  let s = { on: false, T: 0.05, nEff: 0, ...DEF, disrupt: 0, glow: 0, fieldOn: false };
  let ions = [], alphas = [], neutrons = [], flashes = [], hits = [];
  let fusionDebt = 0, last = 0, frame = 0, visible = true, shown = null, warnTimer = 0;

  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); liveG.appendChild(n); return n; };
  const ION_COL = { D: "#2f62c8", T: "#27894f" };

  function spawnIon(kind, anywhere) {
    const rho = Math.sqrt(Math.random()) * 0.92;
    const phi = anywhere ? DATA.PHI1 + Math.random() * span : (Math.random() < 0.5 ? DATA.PHI1 : DATA.PHI2);
    const node = el("circle", { r: 3.6, fill: ION_COL[kind], stroke: "#fffdf7", "stroke-width": 0.5, opacity: 0 });
    ions.push({ kind, rho, th: Math.random() * TAU, phi, dir: Math.random() < 0.5 ? 1 : -1, sp: 0.6 + Math.random() * 0.8, node, a: 0, dying: false });
  }

  // ------------------------------------------------------------ model
  function physics(dt) {
    const target = s.on ? s.n : 0;
    s.nEff += (target - s.nEff) * (1 - Math.exp(-dt / (s.on ? 1.2 : 0.5)));
    if (s.nEff < 0.004) { s.nEff = 0; }
    const nUse = Math.max(s.nEff, 0.02);
    const sub = 8;
    for (let i = 0; i < sub; i++) {
      const st = step({ n: nUse, T: s.T, B: s.B, Pheat: s.on ? s.Pheat : 0 }, dt / sub);
      s.T = st.T;
    }
    if (!s.on) s.T += (0.05 - s.T) * (1 - Math.exp(-dt / 0.8));
    const r = rates({ n: s.nEff, T: s.T, B: s.B, Pheat: s.on ? s.Pheat : 0 });
    if (s.on && r.beta > BETA_MAX) disrupt(r.beta);
    return r;
  }
  function disrupt(beta) {
    s.on = false; s.disrupt = 1; s.T = 0.05; s.nEff *= 0.3;
    warn("Disruptie: β = " + fmt(beta * 100, 1) + " %. De plasmadruk werd te groot voor het magneetveld.");
    syncRun();
  }
  function warn(text) {
    const w = $("warn"); w.textContent = text; w.setAttribute("data-on", "");
    clearTimeout(warnTimer); warnTimer = setTimeout(() => w.removeAttribute("data-on"), 6000);
  }

  // ------------------------------------------------------------ beeld
  const fmt = (v, d = 1) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const sci = (v, unit = "") => {
    if (!(v > 0)) return "0" + unit;
    const ex = Math.floor(Math.log10(v)); const m = v / 10 ** ex;
    const sup = String(ex).replace(/[-0-9]/g, (c) => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(c)]);
    return fmt(m, 1) + "·10" + sup + unit;
  };
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };

  function plasmaLook(dt) {
    const hot = s.nEff > 0.01 ? smooth(Math.log10(0.25), Math.log10(25), Math.log10(Math.max(s.T, 0.01))) : 0;
    const dense = Math.min(1, s.nEff / 0.6);
    s.glow += ((hot * 0.85 + 0.15) * dense * (s.nEff > 0 ? 1 : 0) - s.glow) * (1 - Math.exp(-dt / 0.25));
    s.disrupt = Math.max(0, s.disrupt - dt / 0.9);
    const g = s.glow, f = s.disrupt;
    // buitenste lagen: koel plasma; naar binnen toe heter en bleker (kern)
    const N = layers.length;
    layers.forEach((n, i) => {
      const depth = i / (N - 1);
      const op = g * (0.26 + 0.1 * depth) * (depth < 0.35 ? 1 : smooth(depth - 0.35, depth + 0.1, hot * 1.1));
      n.setAttribute("opacity", Math.min(1, op + (i < 2 ? 0.5 * f * f : 0)).toFixed(3));
    });
    return hot;
  }

  function particles(dt, r, hot) {
    const want = s.nEff > 0.01 ? Math.round(34 * s.nEff) : 0;
    const alive = ions.filter((p) => !p.dying);
    for (let i = alive.length; i < want; i++) spawnIon(i % 2 ? "T" : "D", true);
    for (let i = want; i < alive.length; i++) alive[i].dying = true;
    const speed = still.matches ? 0 : 0.12 + 0.5 * Math.sqrt(Math.min(s.T, 40) / 10);
    for (const p of ions) {
      p.phi = wrap(p.phi + p.dir * p.sp * speed * dt);
      p.th += p.dir * p.sp * speed * dt * 6 / (1 + 2 * p.rho * p.rho);
      p.a += ((p.dying ? 0 : 1) - p.a) * (1 - Math.exp(-dt / 0.35));
      const [x, y] = iso(torus(p.rho, p.th, p.phi));
      p.node.setAttribute("cx", x.toFixed(1)); p.node.setAttribute("cy", y.toFixed(1));
      p.node.setAttribute("opacity", (p.a * sectorFade(p.phi)).toFixed(2));
    }
    ions = ions.filter((p) => { if (p.dying && p.a < 0.02) { p.node.remove(); return false; } return true; });

    // fusies: zichtbaar tempo groeit met het vermogen (niet op schaal)
    if (!still.matches && s.nEff > 0.01) fusionDebt += Math.min(14, r.Pfus / 32) * dt;
    while (fusionDebt >= 1) { fusionDebt -= 1; fuse(); }

    for (const f of flashes) {
      f.age += dt; const t = f.age / 0.45;
      f.node.setAttribute("r", (3 + 14 * t).toFixed(1)); f.node.setAttribute("opacity", Math.max(0, 0.9 * (1 - t)).toFixed(2));
    }
    flashes = flashes.filter((f) => { if (f.age > 0.45) { f.node.remove(); return false; } return true; });

    for (const p of alphas) {
      p.age += dt;
      p.phi = wrap(p.phi + p.dir * 0.9 * dt); p.th += p.dir * 3.2 * dt;
      const [x, y] = iso(torus(p.rho, p.th, p.phi));
      p.node.setAttribute("cx", x.toFixed(1)); p.node.setAttribute("cy", y.toFixed(1));
      const life = smooth(0, 0.2, p.age) * smooth(3.2, 2.2, p.age);
      p.node.setAttribute("opacity", (life * sectorFade(p.phi)).toFixed(2));
    }
    alphas = alphas.filter((p) => { if (p.age > 3.2) { p.node.remove(); return false; } return true; });

    for (const nn of neutrons) {
      nn.age += dt;
      if (!nn.stopped) {
        nn.p = [nn.p[0] + nn.v[0] * dt, nn.p[1] + nn.v[1] * dt, nn.p[2] + nn.v[2] * dt];
        const R = Math.hypot(nn.p[0], nn.p[1]), phi = Math.atan2(nn.p[1], nn.p[0]);
        const depth = Math.hypot(R - DATA.R0, nn.p[2] / 1.45);
        const phiU = DATA.PHI1 + ((((phi - DATA.PHI1) % TAU) + TAU) % TAU);
        if (depth > DATA.R_BL + 4 || phiU > DATA.PHI2) { nn.stopped = nn.age; hit(nn.p); }
      }
      const tail = [nn.p[0] - nn.v[0] * 0.05, nn.p[1] - nn.v[1] * 0.05, nn.p[2] - nn.v[2] * 0.05];
      const [x0, y0] = iso(tail), [x1, y1] = iso(nn.p);
      nn.node.setAttribute("x1", x0.toFixed(1)); nn.node.setAttribute("y1", y0.toFixed(1));
      nn.node.setAttribute("x2", x1.toFixed(1)); nn.node.setAttribute("y2", y1.toFixed(1));
      const out = nn.stopped ? 1 - (nn.age - nn.stopped) / 0.15 : 1;
      nn.node.setAttribute("opacity", Math.max(0, out * smooth(0, 0.05, nn.age)).toFixed(2));
    }
    neutrons = neutrons.filter((nn) => { if (nn.stopped && nn.age - nn.stopped > 0.15) { nn.node.remove(); return false; } return true; });

    for (const h of hits) {
      h.age += dt; const t = h.age / 0.6;
      h.node.setAttribute("r", (2.5 + 6 * t).toFixed(1)); h.node.setAttribute("opacity", Math.max(0, 0.8 * (1 - t)).toFixed(2));
    }
    hits = hits.filter((h) => { if (h.age > 0.6) { h.node.remove(); return false; } return true; });
  }
  function fuse() {
    const rho = Math.sqrt(Math.random()) * 0.55, th = Math.random() * TAU;
    const phi = DATA.PHI1 + EDGE + Math.random() * (span - 2 * EDGE);
    const p = torus(rho, th, phi);
    const [x, y] = iso(p);
    flashes.push({ age: 0, node: el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 2, fill: "none", stroke: "#d08a10", "stroke-width": 1.8 }) });
    alphas.push({ rho: Math.max(0.15, rho), th, phi, dir: Math.random() < 0.5 ? 1 : -1, age: 0, node: el("circle", { r: 4.2, fill: "#d08a10", stroke: "#fffdf7", "stroke-width": 0.8, opacity: 0 }) });
    // isotrope richting
    const u = Math.random() * 2 - 1, w = Math.random() * TAU, q = Math.sqrt(1 - u * u);
    const v = 330;
    neutrons.push({ p, v: [q * Math.cos(w) * v, q * Math.sin(w) * v, u * v], age: 0, stopped: 0, node: el("line", { stroke: "#5b6573", "stroke-width": 2.2, "stroke-linecap": "round", opacity: 0 }) });
  }
  function hit(p) {
    const [x, y] = iso(p);
    hits.push({ age: 0, node: el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 1.5, fill: "#e8742f", opacity: 0.8 }) });
  }

  function dial(Pfus, dt) {
    s.needle = s.needle ?? 0;
    const target = Math.min(1, Pfus / 1000);
    s.needle += (target - s.needle) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.35));
    const ang = -0.75 * Math.PI + s.needle * 1.5 * Math.PI;
    const [cx, cy] = DATA.DIAL, z = DATA.DIAL_TOP + 0.2, L = DATA.DIAL_R - 4;
    const p0 = iso([cx - Math.sin(ang) * 3.4, cy + Math.cos(ang) * 3.4, z]);
    const p1 = iso([cx + Math.sin(ang) * L, cy - Math.cos(ang) * L, z]);
    needle.setAttribute("d", `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`);
  }

  function panels(r) {
    const on = s.nEff > 0.01;
    const mk = s.T * MK_PER_KEV;
    setText("rT", on ? fmt(mk, 0) + " miljoen K" : "–");
    setText("rP", on ? fmt(r.Pfus, r.Pfus < 10 ? 1 : 0) + " MW" : "–");
    setText("rQ", on && s.on && s.Pheat > 0.5 ? fmt(r.Q, r.Q < 10 ? 2 : 1) : on && s.on ? "∞ (ontstoken)" : "–");
    setText("rR", on ? sci(r.reacts, " /s") : "–");
    setText("rTau", on ? fmt(r.tau, 2) + " s" : "–");
    let status, col;
    if (s.disrupt > 0.05 && !s.on) { status = "Disruptie: plasma verloren"; col = "#b8311f"; }
    else if (!s.on && on) { status = "Plasma dooft uit"; col = "#9aa1a9"; }
    else if (!on) { status = "Plasma uit"; col = "#9aa1a9"; }
    else if (s.T < 2) { status = "Opwarmen: te koud voor fusie"; col = "#6e7783"; }
    else if (r.Q < 1) { status = "Fusie, maar Q < 1: kost meer dan het oplevert"; col = "#c9822c"; }
    else if (s.Pheat < 0.5 || r.Palpha >= r.Pcond + r.Pbrem - 0.5) { status = "Ontsteking: het plasma houdt zichzelf heet"; col = "#27894f"; }
    else { status = "Brandend plasma: Q > 1"; col = "#27894f"; }
    setText("status", status); $("dot").style.background = col;
    setText("cornerRead", on ? fmt(mk, 0) + " miljoen K · " + fmt(r.Pfus, 0) + " MW" : "plasma uit");
    const heat = (Math.round(Math.min(70, (on ? r.Pfus : 0) / 900 * 70) / 5) * 5) + "%";
    if (heat !== svg.__heat) { svg.__heat = heat; svg.style.setProperty("--heat", heat); }
  }

  function tick(now) {
    const real = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    const dt = real;
    last = now;
    const r = physics(dt * TIME);
    const hot = plasmaLook(dt);
    particles(dt, r, hot);
    dial(s.nEff > 0.01 ? r.Pfus : 0, dt);
    panels(r);
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });

  // ------------------------------------------------------------ bediening
  function syncRun() {
    const b = $("run");
    b.textContent = s.on ? "Plasma stoppen" : "Plasma starten";
    b.className = s.on ? "btn-ink" : "btn-accent";
  }
  $("run").addEventListener("click", () => {
    s.on = !s.on;
    if (s.on) { s.T = Math.max(s.T, 0.3); $("warn").removeAttribute("data-on"); }
    syncRun(); run();
  });
  $("reset").addEventListener("click", () => {
    Object.assign(s, { on: false, T: 0.05, nEff: 0, ...DEF, disrupt: 0, glow: 0, needle: 0 });
    for (const list of [ions, alphas, neutrons, flashes, hits]) list.forEach((p) => p.node.remove());
    ions = []; alphas = []; neutrons = []; flashes = []; hits = [];
    $("warn").removeAttribute("data-on");
    select(null); syncRun(); run();
  });

  // ------------------------------------------------------------ onderdelen
  const H2 = "²H", H3 = "³H";
  const PARTS = [
    { id: "plasma", name: "Plasma", text: "Een gas van " + H2 + "- en " + H3 + "-kernen en losse elektronen, heter dan 100 miljoen kelvin. Het raakt de wand nergens: het magneetveld houdt het zwevend in een ring.", fact: "ITER: 830 m³ plasma, maar minder dan een halve gram brandstof" },
    { id: "wand", name: "Eerste wand", text: "Tegels van beryllium die het plasma rechtstreeks zien. Ze vangen de warmte en de deeltjes op die toch ontsnappen; onderaan in de divertor zijn ze van wolfraam.", fact: "warmtestroom tot enkele MW per m²" },
    { id: "mantel", name: "Mantel (blanket)", text: "Dikke modules achter de eerste wand. De neutronen (14,1 MeV) zijn neutraal, ontsnappen aan het magneetveld en remmen hier af: hun bewegingsenergie wordt warmte, die in een centrale een stoomturbine aandrijft. Met lithium kweekt de mantel ook nieuw tritium.", fact: "n + ⁶Li → ³H + ⁴He + 4,8 MeV" },
    { id: "vat", name: "Vacuümvat", text: "Een dubbelwandige ring van roestvrij staal. Binnenin is het vacuüm, zodat het plasma niet afkoelt tegen lucht. Tussen de wanden stroomt koelwater.", fact: "ITER: ruim 5000 ton staal" },
    { id: "tf", name: "Toroïdale veldspoelen", text: "D-vormige supergeleidende spoelen rond het vat. Hun stroom maakt een sterk magneetveld langs de ring. Geladen deeltjes kunnen niet dwars op de veldlijnen bewegen en blijven er rond spiralen (lorentzkracht).", fact: "ITER: 18 spoelen, 5,3 T in het plasma, gekoeld tot −269 °C" },
    { id: "pf", name: "Poloïdale veldspoelen", text: "Horizontale ringen buiten de veldspoelen. Hun veld duwt het plasma op zijn plaats en geeft het de D-vorm. Hier zijn er vier getekend.", fact: "ITER: zes ringen, de grootste 24 m breed" },
    { id: "cs", name: "Centrale solenoïde", text: "De spoel in het midden werkt als een transformator: een veranderende stroom erin wekt een stroom op in het plasma, dat de secundaire winding is. Die plasmastroom maakt een tweede veld; samen met het toroïdale veld lopen de veldlijnen schroefvormig rond.", fact: "ITER: 15 MA stroom in het plasma" },
    { id: "nbi", name: "Neutralebundelinjector", text: "Versnelt " + H2 + "-ionen tot 1 MeV en maakt ze dan neutraal, want geladen deeltjes zou het magneetveld afbuigen. De snelle atomen schieten het plasma in en verwarmen het door botsingen. Radiogolven helpen mee.", fact: "ITER: 2 injectoren van 16,5 MW" },
    { id: "brandstof", name: "Brandstof: " + H2 + " en " + H3, text: "Deuterium (" + H2 + ") haal je uit zeewater. Tritium (" + H3 + ") is radioactief en komt in de natuur bijna niet voor; het wordt gekweekt in de mantel. Het gas wordt via een poort in het vat geblazen.", fact: H3 + ": halveringstijd 12,3 jaar (β⁻-verval)" },
  ];
  const partsBox = $("parts");
  const btns = {};
  for (const p of PARTS) {
    const b = document.createElement("button");
    b.className = "toggle"; b.textContent = p.name; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => select(current === p.id ? null : p.id));
    partsBox.appendChild(b); btns[p.id] = b;
  }
  let current = null;
  const stageEl = $("stage");
  function select(id) {
    current = id;
    svg.querySelectorAll(".sel").forEach((n) => n.classList.remove("sel"));
    for (const k in btns) btns[k].setAttribute("aria-pressed", String(k === id));
    const p = PARTS.find((q) => q.id === id);
    if (p) {
      stageEl.setAttribute("data-sel", id);
      svg.querySelectorAll('[data-p="' + id + '"]').forEach((n) => n.classList.add("sel"));
      setText("infoName", p.name); setText("infoText", p.text); setText("infoFact", p.fact);
    } else {
      stageEl.removeAttribute("data-sel");
      setText("infoName", "Niets gekozen");
      setText("infoText", "Elk onderdeel licht op in de tekening, met uitleg over wat het doet.");
      setText("infoFact", "");
    }
    const field = ["tf", "pf", "cs", "plasma"].includes(id);
    if (field) fieldPath.setAttribute("data-on", ""); else fieldPath.removeAttribute("data-on");
    const lf = $("legField"); lf.classList.toggle("off", !field);
    lf.querySelector("em").textContent = field ? "magnetische veldlijn" : "magnetische veldlijn (uit)";
  }
  svg.addEventListener("click", (ev) => {
    const hit = ev.target.closest("[data-p]");
    const id = hit && hit.getAttribute("data-p");
    if (id && btns[id]) select(current === id ? null : id);
  });
  syncRun(); run();
  window.__fusie = { s, rates, step };
})();
