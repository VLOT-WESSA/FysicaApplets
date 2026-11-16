// Levend deel van de lineaire versneller: wisselspanning, veld in de spleten en protonen.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const q = (name) => document.querySelector('[data-part="' + name + '"]');
  const tintA = q("tintA"), tintB = q("tintB"), efG = q("efield"), beamG = q("beam"), dtext = q("dtext"), trace = q("trace"), gtext = q("gtext");
  const P = DATA.P, FR = DATA.FR;
  const at = (a, r = 0) => iso([FR.o[0] + FR.ax[0] * a, FR.o[1] + FR.ax[1] * a, FR.o[2] + r], P);
  const fmt = (v, d = 0) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const PERIOD_VIS = 0.9;                         // zichtbare duur van één periode (s)
  const s = { on: false, U: 50e3, f: 10e6 };
  let t = 0, last = 0, frame = 0, visible = true, ps = [], nextInj = 0, hits = [];
  const unitsPerSec = (eV) => vOf(eV) * 1000 / DATA.MM;   // eenheden per (echte) seconde

  const mix = (sgn, a) => sgn > 0 ? `color-mix(in oklab, #cf8f59, #e8584a ${(a * 70).toFixed(0)}%)` : `color-mix(in oklab, #cf8f59, #5b7fd0 ${(a * 70).toFixed(0)}%)`;
  function tick(now) {
    const dtv = last ? Math.min((now - last) / 1000, 1 / 10) : 1 / 60;
    last = now;
    const T = 1 / s.f, dt = dtv * T / PERIOD_VIS;
    const w = 2 * Math.PI * s.f;
    // injectie: 8 protonen per periode, net vóór de eerste spleet
    if (s.on) { nextInj -= dt; while (nextInj <= 0) { ps.push({ a: -30, E: E_INJ, n: 0 }); nextInj += T / 8; } }
    const sub = 6;
    for (let k = 0; k < sub; k++) {
      const h = dt / sub; t += h;
      for (const p of ps) {
        const a1 = p.a + unitsPerSec(p.E) * h;
        while (p.n < DATA.GAPS.length - 1 && a1 >= DATA.GAPS[p.n]) {
          const gain = (p.n % 2 === 0 ? 1 : -1) * s.U * Math.sin(w * t);
          p.E = Math.max(200, p.E + gain);
          p.n++;
        }
        p.a = a1;
      }
    }
    // aankomst in de detector
    ps = ps.filter((p) => { if (p.a > DATA.A_END + 30) { hits.push({ E: p.E, t }); return false; } return p.E > 4e3; });
    hits = hits.filter((h) => h.t > t - 2 * T);
    // kleur van de buizen: oneven buizen −sin, even buizen +sin
    const sn = Math.sin(w * t), a = Math.abs(sn) * (s.on ? 1 : 0.0001);
    for (const [g, sg] of [[tintA, -sn], [tintB, sn]]) {
      const sign = sg >= 0 ? "+" : "-";
      if (g.getAttribute("data-sign") !== sign) g.setAttribute("data-sign", sign);
      g.setAttribute("opacity", (0.55 * a).toFixed(2));
    }
    // veld in de spleten
    let d = "";
    if (s.on && Math.abs(sn) > 0.08) DATA.GAPS.slice(0, DATA.TUBES.length).forEach((g, n) => {
      const dir = (n % 2 === 0 ? 1 : -1) * Math.sign(sn);
      for (const r of [-5, 5]) { const p0 = at(g - 5 * dir, r), p1 = at(g + 5 * dir, r); d += `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`; }
    });
    efG.innerHTML = d ? `<path d="${d}" marker-end="url(#arrE)" opacity="${Math.abs(sn).toFixed(2)}"/>` : "";
    beamG.innerHTML = ps.map((p) => { const c = at(p.a); return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="4.2"/>`; }).join("");
    // generatorschermpje
    let tr = "";
    for (let i = 0; i <= 40; i++) tr += (i ? "L" : "M") + (9.5 + 41 * i / 40).toFixed(2) + " " + (22 - (s.on ? 6 : 0) * Math.sin(w * t - i / 40 * 4 * Math.PI)).toFixed(2);
    trace.setAttribute("d", tr);
    const gs = fmt(s.f / 1e6, 1) + " MHz"; if (gtext.textContent !== gs) gtext.textContent = gs;
    const Emax = hits.length ? Math.max(...hits.map((h) => h.E)) : 0;
    const design = E_INJ + 6 * U0;
    const dpos = iso([FR.o[0] + FR.ax[0] * (DATA.A_END + 63) - 2 * FR.back[0], FR.o[1] + FR.ax[1] * (DATA.A_END + 63) - 2 * FR.back[1], FR.o[2] + 50], P);
    dtext.innerHTML = `<text x="${dpos[0].toFixed(1)}" y="${dpos[1].toFixed(1)}" text-anchor="middle" class="dlabel">${Emax ? fmt(Emax / 1e3, 0) + " keV" : "– keV"}</text>`;
    setText("rE", Emax ? fmt(Emax / 1e3, 0) + " keV" : "–");
    setText("rV", Emax ? fmt(vOf(Emax) / 1e6, 2) + "·10⁶ m/s (" + fmt(vOf(Emax) / 3e8 * 100, 1) + " % van c)" : "–");
    setText("rT", fmt(T / 2 * 1e9, 0) + " ns");
    const tuned = Math.abs(s.f - F0) < 0.05e6;
    let st = "Bundel uit", col = "#9aa1a9";
    if (s.on && !Emax) { st = "De eerste protonen zijn onderweg"; col = "#6e7783"; }
    else if (s.on && Emax >= 0.96 * (E_INJ + 6 * s.U) && tuned) { st = "In de pas: elke spleet geeft q·U erbij"; col = "#27894f"; }
    else if (s.on) { st = "Uit de pas: de protonen komen te vroeg of te laat in de spleten"; col = "#c9822c"; }
    setText("status", st); $("dot").style.background = col;
    setText("cornerRead", s.on ? (Emax ? fmt(Emax / 1e3, 0) + " keV in de detector" : "bundel aan") : "uit");
    void design;
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
  function setOn(v) { s.on = v; const b = $("run"); b.textContent = v ? "Bundel uit" : "Bundel aan"; b.className = v ? "btn-ink" : "btn-accent"; run(); }
  $("run").addEventListener("click", () => setOn(!s.on));
  $("u").addEventListener("input", (e) => { s.U = +e.target.value * 1e3; setText("vU", fmt(+e.target.value, 0) + " kV"); });
  $("f").addEventListener("input", (e) => { s.f = +e.target.value * 1e6; setText("vF", fmt(+e.target.value, 1) + " MHz"); });
  $("reset").addEventListener("click", () => { s.U = 50e3; s.f = 10e6; $("u").value = 50; $("f").value = 10; setText("vU", "50 kV"); setText("vF", "10,0 MHz"); ps = []; hits = []; setOn(false); parts.select(null); });
  const parts = setupParts(PARTS, svg);
  setOn(false);
  window.__lin = { s, get hits() { return hits; } };
})();
