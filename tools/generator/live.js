// Levend deel van de generator: de zwengel draait de spoel in het veld, de veranderende flux wekt een spanning op.
// Zelfde tekening als de gelijkstroommotor (tools/motor), met sleepringen of een commutator en een meter.
// Assenstelsel linkshandig (x rechts, y naar de kijker, z omhoog): kracht op een lading q·(B × v) in deze coördinaten.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const rotG = q("rotor"), overG = q("over"), fieldG = q("field"), needle = q("needle"), crankG = q("crank");
  const flows = Object.fromEntries([...svg.querySelectorAll(".flow")].map((f) => [f.dataset.w, f]));
  const P = DATA.P, D0 = DATA.D;
  const at = (p) => iso(p, P);
  const fmt = (v, d = 1) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const volt = (u) => Math.abs(u) >= 1 ? fmt(u, 2) + " V" : fmt(u * 1000, 0) + " mV";
  const s = { run: true, N: 100, B: 0.4, A: 100, f: 0.5, mode: "rings", showField: false, showCur: false };
  // alfa = ωt: hoek tussen de normaal van de spoel en het veld; alfa = 0 is de spoel loodrecht op het veld
  let alfa = 0.6, last = 0, frame = 0, visible = true, flowOff = 0, hist = [], tNow = 0, drawn = "";

  const geom = () => ({ ...D0, R: 21 + Math.sqrt(s.A) * 0.95 });
  const model = () => {
    const w = 2 * Math.PI * s.f, flux = s.N * s.B * s.A * 1e-4, Umax = flux * w;
    const u = Umax * Math.sin(alfa);                         // spanning van de spoel (sleepringen)
    return { w, flux, Umax, phi: flux * Math.cos(alfa), u, out: s.mode === "rings" ? u : Math.abs(u) };
  };

  function draw(m) {
    const D = geom(), th = Math.PI / 2 - alfa;                // de zwengel draait de spoel in de zin van afnemende th
    const key = th.toFixed(3) + s.mode + D.R.toFixed(1);
    if (key !== drawn) { drawn = key; rotG.innerHTML = rotorSvg(P, D, th, { mode: s.mode }); crankG.innerHTML = rotorSvg(P, D, th, { only: "crank" }); const sel = $("stage").getAttribute("data-sel"); if (sel) svg.querySelectorAll('[data-p="' + sel + '"]').forEach((n) => n.classList.add("sel")); }
    let o = "";
    const rel = m.Umax > 0 ? m.u / m.Umax : 0;                // > 0: stroom in zijde 1 naar de kijker toe
    if (s.showCur && s.run && Math.abs(rel) > 0.06) {
      const cur = Math.sign(rel), pts = coilPath(D, th).map(at), seq = cur > 0 ? pts.slice().reverse() : pts;
      const op = Math.min(1, 0.25 + Math.abs(rel)).toFixed(2);
      o += `<path class="curflow" d="M${seq.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L")}" style="stroke-dashoffset:${(-flowOff).toFixed(1)};opacity:${op}"/>`;
      for (const sg of [1, -1]) {
        const a = at(rotorPoint(D, th, sg * D.R, 0, -8 * sg * cur)), b = at(rotorPoint(D, th, sg * D.R, 0, 8 * sg * cur));
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
        o += `<path class="curhead" style="opacity:${op}" d="M${(b[0] + ux * 5).toFixed(1)} ${(b[1] + uy * 5).toFixed(1)}L${(b[0] - ux * 5 - uy * 5).toFixed(1)} ${(b[1] - uy * 5 + ux * 5).toFixed(1)}L${(b[0] - ux * 5 + uy * 5).toFixed(1)} ${(b[1] - uy * 5 - ux * 5).toFixed(1)}Z"/>`;
      }
    }
    if (overG.innerHTML !== o) overG.innerHTML = o;
  }

  function graph(id, key, max) {
    const W = 300, H = 110, win = 4;
    let d = "";
    for (const h of hist) {
      const x = 15 + 270 * (1 - (tNow - h.t) / win), y = 55 - 44 * (max > 0 ? Math.max(-1, Math.min(1, h[key] / max)) : 0);
      d += (d ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    $(id).setAttribute("d", d);
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    let m = model();
    if (s.run) { alfa += m.w * dt; tNow += dt; m = model(); hist.push({ t: tNow, phi: m.phi, out: m.out }); while (hist.length && hist[0].t < tNow - 4) hist.shift(); }
    const rel = m.Umax > 0 ? m.out / m.Umax : 0, live = s.run && s.f > 0;
    flowOff += dt * (6 + 30 * Math.abs(rel));
    draw(m);
    // de rechterborstel is de +klem als de uitgang positief is: stroom door het rode snoer naar de meter
    const dirOut = Math.sign(rel) || 1, op = live && s.showCur ? Math.min(1, Math.abs(rel) * 1.2).toFixed(2) : "0";
    flows.right.style.opacity = op; flows.left.style.opacity = op;
    flows.right.style.strokeDashoffset = (dirOut * flowOff).toFixed(1);
    flows.left.style.strokeDashoffset = (-dirOut * flowOff).toFixed(1);
    needle.setAttribute("transform", `rotate(${(live ? rel * 58 : 0).toFixed(1)} 27 29)`);
    graph("gPhi", "phi", m.flux); graph("gU", "out", m.Umax);
    setText("rW", fmt(m.w, 2) + " rad/s");
    setText("rPhi", fmt(m.flux * 1000, 1) + " mWb");
    setText("rUmax", volt(m.Umax));
    setText("rU", live ? volt(m.out) : "–");
    const deg = (((alfa * 180 / Math.PI) % 180) + 180) % 180;
    let st = "De zwengel staat stil: geen fluxverandering, geen spanning", col = "#9aa1a9";
    if (live) {
      col = "#27894f";
      st = deg < 20 || deg > 160 ? "Spoel loodrecht op het veld: flux maximaal, spanning nul" : Math.abs(deg - 90) < 20 ? "Spoel evenwijdig met het veld: flux nul, spanning maximaal" : s.mode === "rings" ? "Wisselspanning via de sleepringen" : "Pulserende gelijkspanning via de commutator";
    }
    setText("status", st); $("dot").style.background = col;
    setText("cornerRead", live ? fmt(s.f, 1) + " Hz · " + volt(m.out) : "stil");
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });

  function sync() {
    const b = $("run"); b.textContent = s.run ? "Pauze" : "Draaien"; b.className = s.run ? "btn-ink" : "btn-accent";
    setText("vN", String(s.N)); setText("vB", fmt(s.B, 2) + " T"); setText("vA", fmt(s.A, 0) + " cm²"); setText("vF", fmt(s.f, 1) + " Hz");
    [...$("mode").children].forEach((x) => pressBtn(x, x.dataset.m === s.mode));
    if (s.showField) fieldG.setAttribute("data-on", ""); else fieldG.removeAttribute("data-on");
    pressBtn($("tField"), s.showField); pressBtn($("tCur"), s.showCur);
    setText("gUtitle", s.mode === "rings" ? "Inductiespanning U (wisselspanning)" : "Spanning aan de borstels (gelijkgericht)");
    drawn = ""; run();
  }
  $("run").addEventListener("click", () => { s.run = !s.run; sync(); });
  for (const [id, key] of [["n", "N"], ["b", "B"], ["a", "A"], ["f", "f"]]) $(id).addEventListener("input", (e) => { s[key] = +e.target.value; sync(); });
  [...$("mode").children].forEach((x) => { x.className = "toggle"; x.addEventListener("click", () => { s.mode = x.dataset.m; hist = []; sync(); }); });
  $("tField").addEventListener("click", () => { s.showField = !s.showField; sync(); });
  $("tCur").addEventListener("click", () => { s.showCur = !s.showCur; sync(); });
  $("reset").addEventListener("click", () => { Object.assign(s, { run: true, N: 100, B: 0.4, A: 100, f: 0.5, mode: "rings" }); alfa = 0.6; hist = []; $("n").value = 100; $("b").value = 0.4; $("a").value = 100; $("f").value = 0.5; sync(); parts.select(null); });
  const parts = setupParts(PARTS, svg, () => { drawn = ""; });
  sync();
  window.__gen = { s, model, get alfa() { return alfa; } };
})();
