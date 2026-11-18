// Levend deel van de fietsdynamo: wiel, rolletje, magneet, stroom, lamp en scoop.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const spB = q("spokesBack"), spF = q("spokesFront"), magG = q("magnet"), rollG = q("roller"), glow = q("glow");
  const flows = [...svg.querySelectorAll(".flow")];
  const P = DATA.P, D = DATA.DYN, C = DATA.C, nw = DATA.nw, eh = DATA.eh;
  const at = (p) => iso(p, P);
  const fmt = (v, d = 1) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  const dirW = (b) => [Math.sin(b) * eh[0], Math.sin(b) * eh[1], Math.cos(b)];
  const dpt = (a, R, psi) => [0, 1, 2].map((i) => D.o[i] + D.ax[i] * a + R * (Math.cos(psi) * D.up[i] + Math.sin(psi) * D.back[i]));
  const V = G.viewOf(P), Lt = G.lightOf(P);
  const SLOW = 1 / 40;
  let kmh = 15, on = false, spin = 0, thW = 0, thM = 0, last = 0, frame = 0, visible = true, flowOff = 0;

  const ptxt = (pts) => "M" + pts.map((p) => { const s = at(p); return s[0].toFixed(1) + " " + s[1].toFixed(1); }).join("L");
  function spokes() {
    const out = [[], []];
    for (let i = 0; i < 32; i++) {
      const side = i % 2 ? 1 : -1, b = (i / 32) * Math.PI * 2 + thW, lace = (i % 4 < 2 ? 1 : -1) * 0.32;
      const hub = add(add(C, nw, side * 24), dirW(b), 20), rim = add(add(C, nw, side * 3), dirW(b + lace), DATA.RIM[0] - 1);
      out[side > 0 ? 1 : 0].push(ptxt([hub, rim]));
    }
    spB.innerHTML = `<path class="spoke" d="${out[0].join("")}"/>`;
    spF.innerHTML = `<path class="spoke" d="${out[1].join("")}"/>`;
  }
  const shadeOf = (n) => 0.55 + 0.45 * Math.max(0, G.dot3(n, Lt));
  function magnet() {
    const M = DATA.MAG, N = 48, faces = [];
    for (let i = 0; i < N; i++) {
      const p0 = (i / N) * 2 * Math.PI, p1 = ((i + 1) / N) * 2 * Math.PI, pm = (p0 + p1) / 2;
      const nrm = [0, 1, 2].map((j) => Math.cos(pm) * D.up[j] + Math.sin(pm) * D.back[j]);
      if (G.dot3(nrm, V) <= 0) continue;
      const pole = Math.floor((((pm + thM) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / DATA.POLE)) % 2;
      const l = shadeOf(nrm);
      const col = pole ? `hsl(220 45% ${(38 + 30 * l).toFixed(0)}%)` : `hsl(5 50% ${(40 + 28 * l).toFixed(0)}%)`;
      faces.push(`<path d="${ptxt([dpt(M.a0, M.r, p0), dpt(M.a1, M.r, p0), dpt(M.a1, M.r, p1), dpt(M.a0, M.r, p1)])}Z" fill="${col}" stroke="${col}" stroke-width=".4"/>`);
    }
    let cap = "";
    const capN = D.ax.map((x) => -x);
    if (G.dot3(capN, V) > 0) {
      for (let s = 0; s < 2 * DATA.POLE; s++) {
        const pts = [dpt(M.a0, 0, 0)];
        for (let j = 0; j <= 8; j++) pts.push(dpt(M.a0, M.r, (s + j / 8) * Math.PI / DATA.POLE - thM));
        const c = s % 2 ? "#7f9bd3" : "#d98b84";
        cap += `<path d="${ptxt(pts)}Z" fill="${c}" stroke="${c}" stroke-width=".4"/>`;
      }
    }
    magG.innerHTML = faces.join("") + cap;
  }
  const RF = G.frameOf(D.o, D.ax, D.up, D.back);
  const R0 = DATA.ROLL;
  const rollBody = solidSvg(G.solidOf([[0, R0.r0], [R0.L, R0.r1]], RF, P), { tone: "hi", className: "rubber" }) + solidSvg(G.disc(R0.L, R0.L + 3, 4, RF, P), { tone: "mid", className: "steel" });
  function roller() { rollG.innerHTML = rollBody + lineSvg(G.ribsOf(RF, 0.6, R0.L - 0.6, R0.r0 + 0.3, 30, P, { phase: thM, r1: R0.r1 - 0.3 }), { tone: "lo" }); }

  function scope(st) {
    let d = "";
    const Upk = st.U * Math.SQRT2 * spin;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120 * 0.02;
      const u = Upk * Math.sin(2 * Math.PI * st.f * spin * t - DATA.POLE * thM);
      d += (i ? "L" : "M") + (15 + 270 * i / 120).toFixed(1) + " " + (55 - Math.max(-12, Math.min(12, u)) * 47 / 12).toFixed(1);
    }
    $("scopeTrace").setAttribute("d", d);
  }
  function panels(st) {
    const live = spin > 0.05;
    setText("rN", live ? fmt(st.rps * spin, 0) + " omw/s" : "–");
    setText("rF", live ? fmt(st.f * spin, 0) + " Hz" : "–");
    setText("rU", live ? fmt(st.U * spin, 2) + " V" : "–");
    setText("rI", live ? fmt(st.I * spin, 2) + " A" : "–");
    setText("rP", live ? fmt(st.P * spin * spin, 2) + " W" : "–");
    setText("status", !live ? "Het wiel staat stil" : st.P * spin * spin < 1 ? "De lamp gloeit zwak" : st.P * spin * spin < 3.5 ? "De lamp brandt" : "De lamp brandt fel");
    $("dot").style.background = live ? "#27894f" : "#9aa1a9";
    setText("cornerRead", live ? fmt(kmh * spin, 0) + " km/h · " + fmt(st.U * spin, 1) + " V · " + fmt(st.f * spin, 0) + " Hz" : "stil");
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    spin += ((on ? 1 : 0) - spin) * (1 - Math.exp(-dt / 0.6));
    if (!on && spin < 0.002) spin = 0;
    const st = state(kmh);
    thW -= st.wWheel * spin * dt * SLOW * 6;         // wiel extra versneld, anders zie je het niet draaien
    thM += st.wMag * spin * dt * SLOW;
    spokes(); magnet(); roller();
    const I = Math.sin(DATA.POLE * thM);
    flowOff += I * dt * 40 * spin;
    for (const f of flows) { f.style.opacity = (spin * Math.abs(I)).toFixed(2); f.style.strokeDashoffset = flowOff.toFixed(1); }
    glow.setAttribute("opacity", Math.min(1, spin * spin * st.P / 3).toFixed(2));
    glow.setAttribute("r", (18 + 22 * Math.min(1.6, st.P / 3)).toFixed(1));
    scope(st);
    panels(st);
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
  function setOn(v) { on = v; const b = $("run"); b.textContent = on ? "Stoppen" : "Fietsen"; b.className = on ? "btn-ink" : "btn-accent"; run(); }
  $("run").addEventListener("click", () => setOn(!on));
  $("speed").addEventListener("input", (e) => { kmh = +e.target.value; setText("vV", fmt(kmh, 0) + " km/h"); });
  $("reset").addEventListener("click", () => { kmh = 15; $("speed").value = 15; setText("vV", "15 km/h"); setOn(false); parts.select(null); });
  const parts = setupParts(PARTS, svg);
  setOn(false);
  window.__dyn = { get spin() { return spin; } };
})();
