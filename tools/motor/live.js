// Levend deel van de gelijkstroommotor: spoel en commutator draaien, met stroom, veld en lorentzkracht als lagen.
// Let op: het assenstelsel van de tekening is linkshandig (x rechts, y naar de kijker, z omhoog).
// De kracht op een stroomdraad is daarom F = B × I in deze coördinaten, wat de kijker ziet als F = I·ℓ × B.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg"), fig = svg.querySelector(".fig");
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const rotG = q("rotor"), overG = q("over"), fieldG = q("field"), boxText = q("boxText");
  const flows = Object.fromEntries([...svg.querySelectorAll(".flow")].map((f) => [f.dataset.w, f]));
  const P = DATA.P, D = DATA.D;
  const at = (p) => iso(p, P);
  const fmt = (v, d = 1) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const R_INT = 2.4, START = 0.9;
  const s = { on: false, U: 6, dir: 1, mag: 1, showField: false, showCur: false, showForce: false };
  let th = START, omega = 0, cur = 0, last = 0, frame = 0, visible = true, flowOff = 0, shownStep = null, drawn = "";

  // de borstel (6 breed) ligt op de spleet zolang hij geen van beide halve manen raakt
  const onGap = () => Math.abs(Math.cos(th)) < (D.COMM.slit + 0.6) / D.COMM.r;
  const live = () => s.on && s.U > 0;

  function draw() {
    const key = th.toFixed(3);
    if (key !== drawn) { drawn = key; rotG.innerHTML = rotorSvg(P, D, th, { mode: "comm" }); const sel = $("stage").getAttribute("data-sel"); if (sel) rotG.querySelectorAll('[data-p="' + sel + '"]').forEach((n) => n.classList.add("sel")); }
    // lagen bovenop de spoel: stroomzin en lorentzkracht
    let o = "";
    const flowing = live() && !onGap();
    if (flowing && s.showCur) {
      const pts = coilPath(D, th).map(at);
      // cur > 0: de stroom loopt in zijde 1 naar de kijker toe, dus het pad wordt achterstevoren doorlopen
      const seq = cur > 0 ? pts.slice().reverse() : pts;
      o += `<path class="curflow" d="M${seq.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L")}" style="stroke-dashoffset:${(-flowOff).toFixed(1)}"/>`;
      for (const sg of [1, -1]) {
        const a = at(rotorPoint(D, th, sg * D.R, 0, -8 * sg * cur)), b = at(rotorPoint(D, th, sg * D.R, 0, 8 * sg * cur));
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
        o += `<path class="curhead" d="M${(b[0] + ux * 5).toFixed(1)} ${(b[1] + uy * 5).toFixed(1)}L${(b[0] - ux * 5 - uy * 5).toFixed(1)} ${(b[1] - uy * 5 + ux * 5).toFixed(1)}L${(b[0] - ux * 5 + uy * 5).toFixed(1)} ${(b[1] - uy * 5 - ux * 5).toFixed(1)}Z"/>`;
      }
    }
    if (flowing && s.showForce) {
      const len = 14 + 2.2 * s.U;
      for (const sg of [1, -1]) {
        // B = mag·x̂, I = sg·cur·ŷ  →  F = B × I = mag·sg·cur·ẑ
        const f = s.mag * sg * cur, p0 = rotorPoint(D, th, sg * D.R, 0, 0), a = at(p0), b = at([p0[0], p0[1], p0[2] + f * len]);
        o += `<path class="force" marker-end="url(#arrF)" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}"/><text class="flab" x="${(b[0] + 7).toFixed(1)}" y="${(b[1] + (f > 0 ? -2 : 12)).toFixed(1)}">F</text>`;
      }
    }
    if (overG.innerHTML !== o) overG.innerHTML = o;
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    const gap = onGap();
    // rechterborstel aan de +klem (dir = 1): hij raakt de helft van zijde 1 als cos th > 0, de stroom loopt dan
    // in zijde 1 van voor naar achter (−y). cur is de zin van de stroom in zijde 1 langs +y.
    if (!gap) cur = -s.dir * Math.sign(Math.cos(th));
    // koppel ~ mag · cur · cos th: dankzij de commutator altijd in dezelfde draaizin
    const sense = -s.dir * s.mag;
    if (live() && !gap) omega += (0.46 * s.U * sense - omega) * Math.min(1, 7 * dt);
    else omega *= Math.max(0, 1 - 1.1 * dt);
    if (Math.abs(omega) < 1e-3 && !live()) omega = 0;
    th = (th + omega * dt) % (Math.PI * 2);
    const flowing = live() && !gap, I = flowing ? s.U / R_INT : 0;
    flowOff += dt * (10 + 5 * I);
    draw();
    // stroom in de snoeren: van de +klem naar de motor en terug
    const toRight = s.dir === 1;                      // +klem aan de rechterborstel
    flows.right.style.opacity = flowing && s.showCur ? "1" : "0"; flows.left.style.opacity = flowing && s.showCur ? "1" : "0";
    flows.right.style.strokeDashoffset = ((toRight ? -1 : 1) * flowOff).toFixed(1);
    flows.left.style.strokeDashoffset = ((toRight ? 1 : -1) * flowOff).toFixed(1);
    // uitlezingen
    setText("rI", fmt(I, 2) + " A");
    setText("rN", fmt(Math.abs(omega) * 60 / (2 * Math.PI), 0) + " /min");
    setText("rA", fmt((((th * 180 / Math.PI) % 360) + 360) % 360, 0) + "°");
    let st, col, step = -1;
    if (!s.on) { st = "Motor staat stil"; col = "#9aa1a9"; }
    else if (s.U === 0) { st = "Ingeschakeld, maar 0 V: geen stroom"; col = "#c9822c"; }
    else if (gap) { st = "Borstels op de spleet: even geen stroom"; col = "#c9822c"; step = 2; }
    else { st = "Motor draait"; col = "#27894f"; step = Math.abs(Math.cos(th)) < 0.5 && Math.cos(th) * Math.sin(th) * omega < 0 ? 3 : 1; }
    setText("status", st); $("dot").style.background = col;
    [...$("steps").children].forEach((li, i) => { if (i === step) li.setAttribute("data-on", ""); else li.removeAttribute("data-on"); });
    if (step !== shownStep) { shownStep = step; nowNum.textContent = step >= 0 ? String(step + 1) : ""; nowText.textContent = step >= 0 ? $("steps").children[step].textContent : s.on ? "Verhoog de spanning: zonder spanning loopt er geen stroom." : "Schakel de motor in en zet de lagen aan om stroom, veld en kracht te zien."; }
    setText("cornerRead", live() ? fmt(s.U, 1) + " V · " + fmt(Math.abs(omega) * 60 / (2 * Math.PI), 0) + " /min" : "uit");
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });

  function sync() {
    const b = $("run"); b.textContent = s.on ? "Uitschakelen" : "Inschakelen"; b.className = s.on ? "btn-ink" : "btn-accent";
    setText("vU", fmt(s.U, 1) + " V");
    boxText.textContent = s.on ? fmt(s.U, 1) + " V" : "uit";
    // linkse bus → rechterborstel, rechtse bus → linkerborstel
    q("signA").textContent = s.dir === 1 ? "+" : "−"; q("signB").textContent = s.dir === 1 ? "−" : "+";
    fig.setAttribute("data-mag", String(s.mag));
    q("letL").textContent = s.mag === 1 ? "N" : "Z"; q("letR").textContent = s.mag === 1 ? "Z" : "N";
    setText("magLabel", s.mag === 1 ? "N links" : "N rechts");
    if (s.showField) fieldG.setAttribute("data-on", ""); else fieldG.removeAttribute("data-on");
    for (const [id, key] of [["tField", "showField"], ["tCur", "showCur"], ["tForce", "showForce"]]) pressBtn($(id), s[key]);
    drawn = ""; run();
  }
  $("run").addEventListener("click", () => { s.on = !s.on; sync(); });
  $("pol").addEventListener("click", () => { s.dir = -s.dir; sync(); });
  $("mag").addEventListener("click", () => { s.mag = -s.mag; sync(); });
  $("u").addEventListener("input", (e) => { s.U = +e.target.value; sync(); });
  for (const [id, key] of [["tField", "showField"], ["tCur", "showCur"], ["tForce", "showForce"]]) $(id).addEventListener("click", () => { s[key] = !s[key]; sync(); });
  $("reset").addEventListener("click", () => { Object.assign(s, { on: false, U: 6, dir: 1, mag: 1 }); th = START; omega = 0; $("u").value = 6; sync(); parts.select(null); });
  // de actieve stap staat ook onder de tekening
  const now = document.createElement("div"), nowNum = document.createElement("b"), nowText = document.createElement("span");
  now.className = "now"; now.setAttribute("aria-live", "polite"); now.append(nowNum, nowText);
  document.querySelector(".legend").before(now);
  const parts = setupParts(PARTS, svg, () => { drawn = ""; });
  sync();
  window.__motor = { s, get th() { return th; }, set th(v) { th = v; }, get cur() { return cur; }, get omega() { return omega; } };
})();
