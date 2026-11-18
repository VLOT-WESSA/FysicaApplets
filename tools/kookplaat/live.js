// Levend deel van de inductiekookplaat: veld, wervelstromen, opwarming, bellen en damp.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const fig = svg.querySelector(".fig");
  const q = (name) => document.querySelector('[data-part="' + name + '"]');
  const fieldG = q("field"), eddyG = q("eddy"), bubG = q("bubbles"), steamG = q("steam"), dispG = q("display");
  const P = DATA.P, K = DATA.KEEP;
  const at = (p) => iso(p, P);
  const fmt = (v, d = 0) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const POWER = [0, 100, 200, 400, 600, 800, 1100, 1400, 1800, 2200];
  const ETA = { staal: 0.9, koper: 0.12, glas: 0 };
  const s = { on: false, level: 6, mat: "staal", T: 20, t: 0 };
  let phase = 0, amp = 0, last = 0, frame = 0, visible = true, bubbles = [], steam = [];
  const TIME = 20, F_VIS = 0.7;

  const inPlane = (psi, R, z) => [R * Math.cos(psi), R * Math.sin(psi), z];
  const pathPts = (pts) => "M" + pts.map((p) => { const s2 = at(p); return s2[0].toFixed(1) + " " + s2[1].toFixed(1); }).join("L");
  // veldlijnen in beide snijvlakken: lussen rond de windingen, door de panbodem en terug door het ferriet
  const LOOPS = [[8, 90, 13.5, 47], [18, 76, 17, 46.5], [30, 62, 20.5, 46]];
  function loopPts(psi, [r0, rr, z0, z1]) {
    const pts = [], n = 10;
    const corner = (cr, cz, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI / 2) * i / n; pts.push(inPlane(psi, cr + 4 * Math.cos(a), cz + 4 * Math.sin(a))); } };
    corner(rr - 4, z0 + 4, -Math.PI / 2); corner(rr - 4, z1 - 4, 0); corner(r0 + 4, z1 - 4, Math.PI / 2); corner(r0 + 4, z0 + 4, Math.PI);
    pts.push(pts[0]);
    return pts;
  }
  const fieldD = [K.psi0, K.psi1].flatMap((psi) => LOOPS.map((L) => pathPts(loopPts(psi, L)))).join("");
  fieldG.innerHTML = `<path d="${fieldD}"/>`;
  const fieldPath = fieldG.firstChild;
  const arcPts = (R, z) => Array.from({ length: 49 }, (_, i) => inPlane(K.psi0 + (K.psi1 - K.psi0) * i / 48, R, z));
  const eddyD = [20, 40, 62].map((R) => pathPts(arcPts(R, 49.3))).join("");

  function material() {
    fig.setAttribute("data-mat", s.mat);
    [...$("mat").children].forEach((b) => pressBtn(b, b.dataset.m === s.mat));
  }
  function display() {
    const m = topMatrix([-60, 112], DATA.GLASS_TOP, P, "y");
    dispG.innerHTML = s.on ? faceTextSvg(m, String(s.level), { size: 30, tone: "hi", anchor: "middle" }).replace("iso-face-text", "iso-face-text disp") : "";
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    amp += ((s.on ? 1 : 0) - amp) * (1 - Math.exp(-dt / 0.2));
    phase += dt * F_VIS * 2 * Math.PI;
    const Pin = s.on ? POWER[s.level] : 0, eta = ETA[s.mat];
    const Ppan = Pin * eta;
    const sim = dt * TIME;
    s.T += (Ppan - 6 * (s.T - 20)) * sim / 4186;
    s.T = Math.min(100, Math.max(20, s.T));
    if (s.on) s.t += sim;
    const wave = Math.sin(phase);
    fieldPath.style.opacity = (amp * (0.3 + 0.7 * Math.abs(wave))).toFixed(2);
    fieldPath.style.strokeDashoffset = ((Math.cos(phase) >= 0 ? -1 : 1) * (now / 40 % 9)).toFixed(1);
    // wervelstromen: alleen in een geleider; tegengesteld aan de spoelstroom (Lenz)
    const eddyA = s.mat === "glas" ? 0 : amp * Math.abs(Math.cos(phase)) * (s.mat === "koper" ? 1 : 0.9);
    if (eddyA > 0.02) {
      const sgn = Math.cos(phase) >= 0 ? 1 : -1;
      let m = `<path d="${eddyD}" style="opacity:${eddyA.toFixed(2)};stroke-dashoffset:${(sgn * now / 30 % 11).toFixed(1)}"/>`;
      for (const [psi, face] of [[K.psi0, -1], [K.psi1, 1]]) for (const R of [20, 40, 62]) {
        const c = at(inPlane(psi, R, 46.5)), out = sgn * face > 0;
        m += `<g opacity="${eddyA.toFixed(2)}"><circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3"/>` + (out ? `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="1" fill="#c9822c" stroke="none"/>` : `<path d="M${(c[0] - 1.8).toFixed(1)} ${(c[1] - 1.8).toFixed(1)}l3.6 3.6M${(c[0] + 1.8).toFixed(1)} ${(c[1] - 1.8).toFixed(1)}l-3.6 3.6" stroke="#c9822c" stroke-width="1" stroke-dasharray="none"/>`) + `</g>`;
      }
      eddyG.innerHTML = m;
    } else eddyG.innerHTML = "";
    // kleur van de hete bodem
    const Tpan = s.T + Ppan / 38;
    const hot = Math.min(1, (Tpan - 20) / 260);
    const hq = Math.round(hot * 20) / 20;
    setVar(fig, "--panhot", hq > 0.02 ? `color-mix(in oklab, var(--pancut), #e8742f ${(hq * 85).toFixed(0)}%)` : "var(--pancut)");
    // bellen in het water (in beide snijvlakken) en damp erboven
    const rate = s.T < 70 ? 0 : s.T < 99.5 ? (s.T - 70) / 30 * 6 : 26;
    if (Math.random() < rate * dt) bubbles.push({ psi: Math.random() < 0.5 ? K.psi0 : K.psi1, R: 6 + Math.random() * 74, z: 50, r: 1 + Math.random() * (s.T > 99 ? 2.6 : 1.4), v: 14 + Math.random() * 14 });
    bubbles.forEach((b) => { b.z += b.v * dt; if (s.T < 99) b.r *= 1 - 0.25 * dt; });
    bubbles = bubbles.filter((b) => b.z < DATA.WATER_Z - 1 && b.r > 0.5);
    bubG.innerHTML = bubbles.map((b) => { const c = at(inPlane(b.psi, b.R, b.z)); return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(b.r * 1.4).toFixed(1)}"/>`; }).join("");
    if (s.T > 80 && Math.random() < (s.T - 80) / 20 * 3 * dt) { const a = K.psi0 + Math.random() * (K.psi1 - K.psi0); steam.push({ x: Math.cos(a) * Math.random() * 70, y: Math.sin(a) * Math.random() * 70, age: 0 }); }
    steam.forEach((w) => (w.age += dt));
    steam = steam.filter((w) => w.age < 2.4);
    steamG.innerHTML = steam.map((w) => { const pts = []; for (let i = 0; i <= 8; i++) { const z = DATA.WATER_Z + 4 + w.age * 22 + i * 3; pts.push([w.x + 4 * Math.sin(i * 0.9 + w.age * 2), w.y, z]); } return `<path d="${pathPts(pts)}" opacity="${(0.6 * Math.sin(Math.PI * w.age / 2.4)).toFixed(2)}"/>`; }).join("");
    // panelen
    setText("rF", s.on ? "24 kHz" : "–");
    setText("rP", s.on ? fmt(Ppan, 0) + " W van " + fmt(Pin, 0) + " W" : "–");
    setText("rT", fmt(s.T, 0) + " °C");
    const mm = Math.floor(s.t / 60), ss = Math.floor(s.t % 60);
    setText("rt", mm + ":" + String(ss).padStart(2, "0"));
    let st = "Kookplaat uit", col = "#9aa1a9";
    if (s.on && s.mat === "glas") { st = "Glas geleidt niet: geen wervelstromen, geen warmte"; col = "#c9822c"; }
    else if (s.on && s.mat === "koper") { st = "Koper: grote stromen, maar weinig weerstand en dus weinig warmte"; col = "#c9822c"; }
    else if (s.on && s.T >= 99.5) { st = "Het water kookt"; col = "#27894f"; }
    else if (s.on) { st = "De panbodem warmt op door wervelstromen"; col = "#27894f"; }
    setText("status", st); $("dot").style.background = col;
    setText("cornerRead", s.on ? "stand " + s.level + " · " + fmt(s.T, 0) + " °C" : fmt(s.T, 0) + " °C · uit");
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
  function setOn(v) { s.on = v; const b = $("run"); b.textContent = v ? "Kookplaat uit" : "Kookplaat aan"; b.className = v ? "btn-ink" : "btn-accent"; display(); run(); }
  $("run").addEventListener("click", () => setOn(!s.on));
  $("level").addEventListener("input", (e) => { s.level = +e.target.value; setText("vL", String(s.level)); display(); });
  [...$("mat").children].forEach((b) => { b.className = "toggle"; b.addEventListener("click", () => { s.mat = b.dataset.m; material(); }); });
  $("reset").addEventListener("click", () => { Object.assign(s, { on: false, level: 6, mat: "staal", T: 20, t: 0 }); $("level").value = 6; setText("vL", "6"); bubbles = []; steam = []; material(); setOn(false); parts.select(null); });
  const parts = setupParts(PARTS, svg);
  material(); setOn(false);
  window.__kp = s;
})();
