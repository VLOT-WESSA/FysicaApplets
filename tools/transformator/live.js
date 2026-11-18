// Levend deel van de transformator: windingen, flux, stromen en lamp.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const fluxes = [...svg.querySelectorAll(".flux")], glow = q("glow"), filament = q("filament"), psuText = q("psuText");
  const flows = Object.fromEntries([...svg.querySelectorAll(".flow")].map((f) => [f.dataset.w, f]));
  const P = DATA.P;
  const fmt = (v, d = 1) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const NS = [100, 200, 400, 800], R_LAMP = 12, F_VIS = 0.6;
  const s = { on: false, dc: false, U1: 12, N1: 400, N2: 200, broken: false };
  let phase = 0, amp = 0, pulse = 0, last = 0, frame = 0, visible = true, offP = 0, offS = 0, offF = 0;

  function windings() {
    for (const [plan, N, id] of [[DATA.planL, s.N1, "primair"], [DATA.planR, s.N2, "secundair"]]) {
      const n = Math.round(N / 20), z0 = DATA.COIL.z0 + 1.2, z1 = DATA.COIL.z1 - 1.2;
      let d = "";
      for (let i = 0; i < n; i++) d += sideSeam(plan, z0 + (z1 - z0) * (i + 0.5) / n, P, 6);
      q("wind-" + id).innerHTML = `<g class="wind"><path d="${d}"/></g>`;
    }
  }
  function buttons(box, key) {
    for (const n of NS) {
      const b = document.createElement("button");
      b.className = "toggle"; b.textContent = String(n);
      b.addEventListener("click", () => { s[key] = n; sync(); });
      $(box).appendChild(b);
    }
  }
  function sync() {
    for (const [box, key] of [["n1", "N1"], ["n2", "N2"]]) [...$(box).children].forEach((b) => pressBtn(b, +b.textContent === s[key]));
    pressBtn($("dc"), s.dc);
    setText("vU", fmt(s.U1, 1) + " V");
    psuText.textContent = s.on ? fmt(s.U1, 1) + (s.dc ? " V =" : " V ~") : "uit";
    windings();
    const b = $("run"); b.textContent = s.on ? "Voeding uit" : "Voeding aan"; b.className = s.on ? "btn-ink" : "btn-accent";
  }
  function values() {
    const U2 = s.dc ? 0 : s.U1 * s.N2 / s.N1;
    const I2 = s.broken ? 0 : U2 / R_LAMP;
    const I1 = I2 * s.N2 / s.N1;
    return { U2, I2, I1, P: U2 * I2 };
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    amp += ((s.on ? 1 : 0) - amp) * (1 - Math.exp(-dt / 0.15));
    pulse *= Math.exp(-dt / 0.35);
    phase += dt * F_VIS * 2 * Math.PI;
    const v = values();
    if (s.on && !s.broken && v.U2 > 9) { s.broken = true; setText("status", ""); }
    const wave = s.dc ? 1 : Math.sin(phase);
    const fluxA = amp * (s.U1 > 0 ? 1 : 0);
    for (const f of fluxes) f.style.opacity = (fluxA * (s.dc ? 0.9 : 0.25 + 0.75 * Math.abs(wave))).toFixed(2);
    offF -= dt * 30 * fluxA * (s.dc ? 0 : Math.cos(phase));
    fluxes.forEach((f, i) => { f.style.strokeDashoffset = (i ? -offF : offF).toFixed(1); });
    // stromen: primair in fase met U1, secundair met U2 (tegengesteld gewonden: Lenz)
    const iP = s.dc ? amp * (s.U1 > 0 ? 1 : 0) : amp * wave * Math.min(1, (v.I1 + 0.05) / 0.25);
    const iS = s.dc ? pulse : amp * wave * Math.min(1, v.I2 / 0.25);
    offP -= dt * 40 * iP; offS += dt * 40 * iS;
    for (const id of ["p1", "p2"]) { flows[id].style.opacity = Math.min(1, Math.abs(iP)).toFixed(2); flows[id].style.strokeDashoffset = (id === "p1" ? offP : -offP).toFixed(1); }
    for (const id of ["s1", "s2"]) { flows[id].style.opacity = Math.min(1, Math.abs(iS)).toFixed(2); flows[id].style.strokeDashoffset = (id === "s1" ? offS : -offS).toFixed(1); }
    const bright = s.broken ? 0 : s.dc ? pulse * 0.3 : amp * Math.min(1.3, v.P / 3);
    glow.setAttribute("opacity", Math.min(1, bright).toFixed(2));
    glow.setAttribute("r", (20 + 26 * Math.min(1.3, bright)).toFixed(1));
    filament.style.stroke = s.broken ? "#9aa1a9" : bright > 0.1 ? "#d98a10" : "#6b5a3a";
    filament.style.strokeDasharray = s.broken ? "2 3" : "none";
    const live = s.on && amp > 0.5;
    setText("rU2", live ? fmt(v.U2, 1) + " V" : "–");
    setText("rI2", live ? fmt(v.I2, 2) + " A" : "–");
    setText("rI1", live ? fmt(s.dc ? s.U1 / 2 : v.I1, 2) + " A" + (s.dc ? " (alleen weerstand)" : "") : "–");
    setText("rP", live ? (s.dc ? "0 W naar de lamp" : fmt(v.P, 1) + " W") : "–");
    let st = "Voeding uit", col = "#9aa1a9";
    if (s.broken) { st = "Lampje doorgebrand: Uₛ was te groot"; col = "#b8311f"; }
    else if (live && s.dc) { st = "Gelijkspanning: flux constant, geen inductie"; col = "#c9822c"; }
    else if (live && v.U2 < 3) { st = "Lampje gloeit zwak"; col = "#27894f"; }
    else if (live) { st = v.U2 > 7 ? "Lampje brandt fel" : "Lampje brandt"; col = "#27894f"; }
    setText("status", st); $("dot").style.background = col;
    setText("cornerRead", live ? (s.dc ? fmt(s.U1, 1) + " V = · Uₛ = 0 V" : fmt(s.U1, 1) + " V → " + fmt(v.U2, 1) + " V") : "voeding uit");
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
  buttons("n1", "N1"); buttons("n2", "N2");
  $("run").addEventListener("click", () => { s.on = !s.on; if (s.on && s.dc) pulse = 1; sync(); run(); });
  $("dc").addEventListener("click", () => { s.dc = !s.dc; if (s.on) pulse = 1; sync(); });
  $("u1").addEventListener("input", (e) => { s.U1 = +e.target.value; sync(); });
  $("reset").addEventListener("click", () => { Object.assign(s, { on: false, dc: false, U1: 12, N1: 400, N2: 200, broken: false }); $("u1").value = 12; sync(); parts.select(null); });
  const parts = setupParts(PARTS, svg);
  sync(); run();
})();
